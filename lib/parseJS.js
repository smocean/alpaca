var esprima = require('esprima');

var escodegen = require('escodegen');

var estraverse = require('estraverse');

var _ = alp._;

var path = _.path;

var Syntax = require('./syntax.js');

var config = alp.config;

var File = require('./file.js');

var storage = alp.storage;

var ns;

var getNamespace = function () {
    if (ns) {
        return ns;
    }
    ns = config.get('ns') || 'ns';
    return ns;
};

var ParseBase = require('../lib/parseBase.js');

/**
 * 匹配只有闭包js文件表达式的正则表达式
 * @example
 *  js文件只有require(‘../xx’);
 *  编译过后就只有闭包。
 * @param  {[type]} content [description]
 * @return {[type]}         [description]
 */
function closureReg(content) {
    var ns = getNamespace();

    content = content ? content : '';

    return config.get('isOptimizer') ?
        new RegExp('^(window\\.' + ns + ')\\s*=\\s*\\1(\\|\\|\\{\\})[,;]\\s*?function\\s*\\(.*?\\)\\s*?\\{\\s*?' + content + '\\s*\\}\\s*?\\(' + ns + '\\);$', 'gi') :
        new RegExp('^(window\\.' + ns + ')(\\s*)=\\2\\1\\2\\|\\|\\2\\{\\};([\\r\\n\\s])*\\(function\\2\\(' + ns + '\\)\\2\\{[\\r\\n\\s]*?' + content + '[\\r\\n\\s]*?\\}\\(' + ns + '\\)\\);*$', 'gim');

};

/**
 * 为js文件添加闭包
 *
 * @param Object ast js文件的语法抽象树
 * @param string vname js文件的exports的名字
 * @return Object [添加闭包后的语法抽象树]
 */
function addWrapper(ast, vname) {
    var wrapper = [],
        ns = getNamespace(),
        exports = ns + '.' + vname,
        cAst;

    wrapper.push('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){');

    vname && wrapper.push(exports + ' = ' + exports + ' || {};');

    wrapper.push('})(' + ns + ');');

    cAst = esprima.parse(wrapper.join(''));

    estraverse.replace(cAst, {
        leave: function (node, parent) {
            var nodeType = node.type,
                body,
                item;

            if (nodeType === Syntax.BlockStatement && parent.type === Syntax.FunctionExpression && parent.params[0].name === ns) {
                body = [].slice.call(node.body, 0);
                item = [].slice.call(ast.body, 0);

                for (var i = 0, len = item.length; i < len; i++) {
                    body.splice(1 + i, 0, item[i]);
                }

                return {
                    type: node.type,
                    body: body
                };
            }
        }
    });

    return cAst;
}

/**
 * 生成内链文件内容的AST
 */
function literalContent(content) {
    return {
        type: Syntax.Literal,
        value: content,
        raw: "'" + content + "'"
    };
}

/**
 * 生成Exports的AST
 */
function buildExportsAst(name) {
    var ns = getNamespace();

    if (name) {
        return {
            type: Syntax.MemberExpression,
            computed: false,
            object: {
                type: Syntax.Identifier,
                name: ns
            },
            property: {
                type: Syntax.Identifier,
                name: name
            }
        };
    } else {
        return {
            type: Syntax.Identifier,
            name: ns
        };
    }
}


function parse (file, source) {
    var ast, source, _this = this;

    source = source || this.getFileContent(file);

    ast = esprima.parse(source, {
        loc: true
    });

    if(!ast || typeof ast !== "object") {
        alp.log.error("source couldn't be parsed");
    };

    estraverse.replace(ast, {
        leave: function (node, parent) {
            var nodeType = node.type,
                parentType = parent.type,
                rFile,
                key,
                _absUrl,
                initRequireValue,
                finishRequireValue,
                _tmpRequireValue,
                parentNotExpressionOrSequence;

            // 父节点不是表达式和逗号表达式
            parentNotExpressionOrSequence = parentType !== Syntax.ExpressionStatement && parentType !== Syntax.SequenceExpression;

            if (nodeType === Syntax.CallExpression && node.callee.name === config.get('word')) {
                initRequireValue = node.arguments[0].value;

                // 这里是忽略，有些js代码中可能存在require方法调用，但是并不是为了加载依赖。
                if (!_.is(initRequireValue, 'string') || initRequireValue.trim().length == 0) {
                    alp.log.warning(file.realpath + '文件存在有require方法，但是并不是用于加载依赖, 不会对该require做任何处理', node.loc);
                    return node;
                }
                if (!_.isTextFile(initRequireValue)) {
                    _tmpRequireValue = initRequireValue + '.js';
                }
                finishRequireValue = _tmpRequireValue || initRequireValue;
                _absUrl = path.resolve(_.unix(config.get('fileBasedRoot') ? config.get('root') : file.dirname || config.get('root')), finishRequireValue);

                if (!_.exists(_absUrl)) {
                    if (_tmpRequireValue) {
                        alp.log.warning(file.realpath + '文件：require("' + initRequireValue + '") 中的文件不存在,或者将该文件加入黑名单，跳过对该文件的编译', node.loc);
                    } else {
                        alp.log.warning(file.realpath + '文件：require("' + finishRequireValue + '") 中的文件不存在', node.loc);
                    }
                    return node;
                }

                rFile = new File(finishRequireValue, file.dirname);
                file.hasRequire = true;
                key = rFile.subpath;
                if (!rFile.isJsFile) {
                    if (!rFile.isLikeCss || rFile.isCanembed) {
                        return literalContent(_this.getFileContent(rFile));
                    } else if (parentNotExpressionOrSequence) {
                        alp.log.warning('在配置文件readable.css = false时，在文件' + file.realpath + '中的require("' + finishRequireValue + '")将被转成undefined，');
                        return {
                            name: 'undefined',
                            type: Syntax.Identifier
                        };
                    }
                };

                if (!file.existsRequire(key)) {
                    file.addRequire(key);
                }

                if (parentNotExpressionOrSequence && rFile.isJsFile) {
                    return getNodeAst(rFile.id);
                } else {
                    return {
                        name: '<<<require>>>',
                        type: Syntax.Identifier
                    };
                }

            } else if (nodeType == Syntax.MemberExpression && 'name' in node.object && node.object.name === 'module') {

                file.hasExports = true;
                file.exports = buildExportsAst(file.id);
                return file.exports;

            }
        }
    });

    if (file.isMoudle()) {
        if (file.isWrapJSClosure || file.isWrapJsInHtml) {
            ast = addWrapper(ast, file.id);
        }
    }

    file.ast = ast;
    file.setContent(generateContent(file));
    return ast;
}

function generateContent(file) {
    var content, isOptimizer = config.get('isOptimizer'),
        escodegenOpts = {},
        ns = getNamespace(),
        _regExp = _.escapeReg(ns + '.' + file.id),
        _exports,
        nsRegExp = _regExp + '\\s*=\\s*' + _regExp + '\\s*\\|\\|\\s*\\{\\};';

    if (isOptimizer) {
        escodegenOpts = {
            format: {
                indent: {
                    style: '',
                    base: 0
                },
                compact: true,
                newLine: ''
            }
        };
    }

    if (file.isMoudle()) {
        content = escodegen.generate(file.ast, escodegenOpts);
        content = content.replace(/(<<<require>>>\s*;+)|(<<<require>>>\s*,+)/gim, '');
        if (isOptimizer) {
            content = content.replace(/([;,][\s\n\r]*(?=[;,]))/gi, '').replace(/(,[\s\n\r]*(?=(var)))/gi, ';');
        } else {
            content = content.replace(/([\s\n\r]+);/gi, '');
        }

        content = content.replace(closureReg(nsRegExp), '');
        _exports = file.exports;
        if (_exports && 'type' in _exports && _exports.type === Syntax.Identifier) {
            content = content.replace(new RegExp(nsRegExp, 'igm'), '');
        }
    } else {
        content = file.getContent();
    }
    file.nsRegExp = nsRegExp;
    return content;
}

function getNodeAst(id) {
    var ns = getNamespace();

    return {
        type: Syntax.MemberExpression,
        computed: false,
        object: {
            type: 'Identifier',
            name: config.get('ns')
        },
        property: {
            type: 'Identifier',
            name: id
        }
    };
}

function ParseJS() {
    ParseBase.call(this);
    if (ParseJS.instance instanceof ParseJS) {
        return ParseJS.instance;
    }
    ParseJS.instance = this;
}

require('util').inherits(ParseJS, ParseBase);

ParseJS.prototype.parse = parse;

module.exports = ParseJS;














