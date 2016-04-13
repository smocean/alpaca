var esprima = require('esprima');

var escodegen = require('escodegen');

var estraverse = require('estraverse');

var util = require('util');

var eventEmitter = require('events').EventEmitter;

var _ = alp._;

var path = _.path;

var Syntax = require('./syntax.js');

var config = alp.config;

var File = require('./file.js');

var storage = alp.storage;

var word = config.get('word');

var tmpl = config.get('tmpl');

var requireRegExp = new RegExp('(' + config.get('word') + ')|(' + 'module\\.exports' + ')', 'gm');

/**
 * 匹配只有闭包js文件表达式的正则表达式
 * @example
 *  js文件只有require(‘../xx’);
 *  编译过后就只有闭包。
 * @param  {[type]} content [description]
 * @return {[type]}         [description]
 */
function closureReg(content) {
    var ns = config.get('ns');

    content = content ? content : '';

    return config.get('isOptimizer') ?
        new RegExp('^(window\\.' + ns + ')\\s*=\\s*\\1(\\|\\|\\{\\})[,;]\\s*?function\\s*\\(.*?\\)\\s*?\\{\\s*?' + content + '\\s*\\}\\s*?\\(' + ns + '\\);$', 'gi') :
        new RegExp('^(window\\.' + ns + ')(\\s*)=\\2\\1\\2\\|\\|\\2\\{\\};([\\r\\n\\s])*\\(function\\2\\(' + ns + '\\)\\2\\{[\\r\\n\\s]*?' + content + '[\\r\\n\\s]*?\\}\\(' + ns + '\\)\\);*$', 'gim');

};

/**
 * 为js文件添加闭包
 * @param Object ast js文件的语法抽象树
 * @param string vname js文件的exports的名字
 * @return Object [添加闭包后的语法抽象树]
 */
function addWrapper(ast, vname) {
    var ns = config.get('ns'),
        wrapper = [],
        exports = ns + '.' + vname,
        cAst;

    wrapper.push('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){');

    vname && wrapper.push(exports + ' = ' + exports + ' || {};');

    wrapper.push('})(' + ns + ');');

    cAst = esprima.parse(wrapper.join(''));

    estraverse.replace(cAst, {
        leave: function(node, parent) {
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
function buildExportsAst(name, ns) {
    ns = ns || config.get('ns');

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

/**
 * 生成文件的依赖
 */
function generateDeps() {
    var file;
    for (var k in storage) {
        file = storage[k];
        if (file.isCompiled) {
            continue;
        }
        generateContent(file);
        file.aRequires = getAllRequires(k);

        file.isCompiled = true;
    }

}

function getAllRequires(key, map, end) {
    var file = storage[key],
        requires = file.requires;

    map = map || [];

    for (var ci, len = requires.length, i = len - 1; ci = requires[i], i >= 0; i--) {

        if (storage[ci] && storage[ci].requiresObj && key in storage[ci].requiresObj) {
            alp.log.error('存在循环依赖，在文件[' + ci + ']和文件[' + path + ']');
        }

        map.unshift(ci);

        getAllRequires(ci, map, i);
    }

    for (var j = 0, ko = {}, cj; cj = map[j]; j++) {
        if (cj in ko) {
            map.splice(j, 1);
        } else {
            ko[cj] = true;
        }
    }

    return map;
}


/**
 * 生成编译后的文件内容
 */
function generateContent(file) {
    var content, isOptimizer = config.get('isOptimizer'),
        escodegenOpts = {},
        exports;

    if (!file.isLikeJs) {
        content = file.getContent();
    } else {
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
            }
        }

        if (file.getContent().match(requireRegExp)) {
            // 生成content
            content = escodegen.generate(file.ast, escodegenOpts);
            content = content.replace(/(<<<require>>>\s*;+)|(<<<require>>>\s*,+)/gim, "");
            if (isOptimizer) {
                content = content.replace(/([;,][\s\n\r]*(?=[;,]))/gi, "").replace(/(,[\s\n\r]*(?=(var)))/gi, ";");
            } else {
                content = content.replace(/([\s\n\r]+);/gi, "");
            }
            content = content.replace(closureReg(file.nsRegExp), '');
            exports = file.exports;
            if (exports && 'type' in exports && exports.type === Syntax.Identifier) {
                content = content.replace(new RegExp(file.nsRegExp, 'igm'), '');
            }
        } else {
            content = file.getContent();
        }


    }

    if (!content) {
        file.setContent('');
        return;
    }


    file.setContent(content);
}

function buildTag(file, base) {
    var path,
        ext = file.rExt;

    path = _.path.relative(base, file.subpath).replace(/\\/g, '/');
    if (file.isLikeCss) {

        path = path.replace(new RegExp('\\.\\s*' + ext + '$', 'gi'), '.css');
        ext = 'css';
    } else if (file.isLikeJs) {
        ext = 'js';
    } else {
        return '';
    }

    return tmpl[ext].replace(/\{\d{1}\}/, path) + '\n';
}

function Processor(cntProcessor) {
    this.cntProcessor = _.is(cntProcessor, 'function') ? cntProcessor : null;
    this.setMaxListeners(0);
    this.on('compile', function (file) {
        this._compile(file);
    });

    this.map = {};
}

util.inherits(Processor, eventEmitter);

var prototype = {
    js: function (file) {
        var ast, params = [], args = [], ns = config.get('ns'), content,
            _this = this, cpa, isAddWrapper;

        content = file.getContent();

        ast = esprima.parse(content);

        if (file.useCompile) {
            estraverse.replace(ast, {
                leave: function (node, parent) {
                    var nodeType = node.type,
                        parentType = parent.type,
                        requireValue,
                        rFile,
                        paramAst,
                        paramName,
                        key,
                        _absUrl,
                        parentNotExpressionOrSequence;

                    nodeType = node.type;
                    parentType = parent.type;

                    // 父节点不是表达式和逗号表达式
                    parentNotExpressionOrSequence = parentType !== Syntax.ExpressionStatement && parentType !== Syntax.SequenceExpression;

                    if (nodeType === Syntax.CallExpression && node.callee.name === word) {
                        requireValue = node.arguments[0].value;

                        // 这里是忽略，有些js代码中可能存在require方法调用，但是并不是为了加载依赖。
                        if (!_.is(requireValue, 'string') || requireValue.trim().length == 0) {
                            alp.log.warning(file.realpath + '文件中存在有require方法的不正确使用方式, 不会对该require做任何处理');
                            return node;
                        }
                        //处理require('xx')，但是xx不存在的问题；
                        _absUrl = path.resolve(_.unix(config.get('fileBasedRoot') ? config.get('root') : file.dirname || config.get('root')), requireValue);

                        if (!_.exists(_absUrl)) {
                            alp.log.warning(file.realpath + '文件：require(' + requireValue + ') 文件不存在');
                            return node;
                        }
                        rFile = new File(requireValue, file.dirname);
                        file.hasRequire = true;
                        key = rFile.subpath;

                        // 如果require 命中配置 exculde 规则，则将发出警告，并将其替换成undefined;
                        //if (!rFile.useCompile && parentNotExpressionOrSequence) {
                            // alp.log.warning(rFile.realpath + '文件命中exclude配置项的规则，在' + file.realpath + '中的require(' + requireValue + ')将被替换为undefined');
                            // return {
                            //     name: 'undefined',
                            //     type: Syntax.Identifier
                            // };

                            //alp.log.error(file.subpath + '中的require("' + requireValue + '")不能被解析，原因：' + rFile.subpath + '不在白名单或被包含在了黑名单中,同时参与了运算');
                                //alp.log.error(rFile.realpath + '文件不在白名单exclude配置项的规则，在' + file.realpath + '中的require("' + requireValue + '")');

                        //}

                        if(!rFile.useCompile && parentNotExpressionOrSequence) {
                            alp.log.error(file.subpath + '中的require("' + requireValue + '")不能被解析，原因：' + rFile.subpath + '不在白名单或被包含在了黑名单中');

                        }

                        if (!rFile.isJsFile) {
                            if (!rFile.isLikeCss || rFile.readable) {
                                return literalContent(_this.contentProcessor(rFile));
                            } else if (parentNotExpressionOrSequence) {
                                alp.log.warning('在配置文件readcss = false时，在文件' + file.realpath + '中的require("' + requireValue + '")将被转成undefined，');
                                return {
                                    name: 'undefined',
                                    type: Syntax.Identifier
                                };
                            }
                        } else {
                            _this.map[file.subpath][key] = 1;

                            // 用于检测两个文件是否存在相互引用关系 如： a依赖b, b依赖a这种依赖。但是对于a依赖b, b依赖c, c依赖a种这里检测不出来。
                            if (key in _this.map && file.subpath in _this.map[key]) {
                                alp.log.error('文件' + file.subpath + '和' + key + '存在循环引用');
                            }
                        }

                        //if (rFile.useCompile) {
                        _this.emit('compile', rFile);
                        // } else {

                        //     alp.log.error(file.subpath + '中的require("' + requireValue + '")不能被解析，代码中会将其过滤，原因：' + rFile.subpath + '不在白名单或被包含在了黑名单中，但没有参与运算');
                        //     return {
                        //         name: '',
                        //         type: Syntax.Identifier
                        //     };
                        // }

                        if (parentNotExpressionOrSequence && rFile.isJsFile) {
                            paramName = rFile.id;
                        }

                        paramAst = {
                            name: paramName,
                            type: Syntax.Identifier
                        };

                        if (!(key in file.requiresObj)) {
                            rFile.paramAst = paramAst;
                            file.requiresObj[key] = rFile;
                            file.addRequire(key);
                            if (key in storage) {
                                if (storage[key].exports && parentNotExpressionOrSequence) {
                                    if (storage[key].exports.type === Syntax.MemberExpression) {
                                        params.push(paramAst);
                                        args.push(storage[key].exports);
                                    } else {
                                        paramAst.name = storage[key].exportStr;
                                    }
                                } else if (!storage[key].exports && parentNotExpressionOrSequence) {

                                    alp.log.warning(key + '文件不存在module.exports,所以在' + file.subpath + '文件中默认返回undefined');
                                    paramAst.name = 'undefined';
                                }
                            }
                        }

                        if (paramAst.name) {

                            // js文件是否存在require的赋值表达式;
                            file.hasRequireExpress = true;
                            return paramAst;
                        } else {
                            return {
                                name: '<<<require>>>',
                                type: Syntax.Identifier
                            };
                        }

                    } else if (nodeType == Syntax.MemberExpression && 'name' in node.object && node.object.name === 'module') {
                        file.hasExports = true;

                        file.exports = buildExportsAst(file.id);

                        file.exportStr = ns + '.' + file.id;

                        return file.exports;
                    }


                }
            });
        }

        if (file.isMoudle()) {

            if (file.hasRequireExpress) {
                isAddWrapper = true;
            } else if (!file.isLikeHtml && file.isJsFile) {
                isAddWrapper = true;
            } else if (file.isLikeHtml && config.get('wrapJsInHtml')) {
                isAddWrapper = true;
            } else {
                isAddWrapper = false;
            }
            if (isAddWrapper) {
                ast = addWrapper(ast, file.id);
            }
            file.exports = file.exports || buildExportsAst();

            if (isAddWrapper) {
                cpa = ast.body[1].expression;
                cpa['callee'].params = cpa['callee'].params.concat(params);
                cpa['arguments'] = cpa['arguments'].concat(args);
            }
        }

        file.exportsRegExp = _.escapeReg(ns + '.' + file.id);

        file.nsRegExp = file.exportsRegExp + '\\s*=\\s*' + file.exportsRegExp + '\\s*\\|\\|\\s*\\{\\};';

        file.ast = ast;

    },
    css: function (file) {
        var content, regExp, _this = this;

        content = file.getContent().toString();

        regExp = new RegExp('@?\\b' + word + '\\b\\s*[\'\"]{1}([^\'\"]+)[\'\"]{1}\\s*;*', 'gi');


        content = content.replace(regExp, function () {
            var args = [].slice.call(arguments, 0),
                raw = args[1],
                rFile;

            rFile = new File(raw, file.dirname);
            if (rFile.subpath in file.requiresObj) {
                return '';
            }
            file.requiresObj[rFile.subpath] = rFile;
            file.addRequire(rFile.subpath);
            _this.emit('compile', rFile);
            return '';
        });
        file.setContent(content);
    },
    html: function (file) {
        var scriptRegExp = /<(script|style) .*?data-main.*?>([\s\S]*?)<\/\1>/mig,
            ns = config.get('ns'),
            nsRegExp = new RegExp('(window\\.' + ns + ')(\\s*)=\\2\\1\\2\\|\\|\\2\\{\\}[;,]?', 'gm'),
            _this = this;

            function processor (file) {
                var content = file.getContent(),

                    _requires = [],
                    _requiresObj = {};

                content = content.toString();

                content = content.replace(scriptRegExp, function () {
                    var type = arguments[1].toLocaleLowerCase(),
                        _type,
                        sContent = arguments[2],
                        result,
                        requires,
                        aRequires,
                        nContent = '',
                        _nContent = '',
                        rFile = new File(file.realpath);

                    if (type == 'style') {
                        rFile.isLikeCss = true;
                        _type = 'text/css';
                    } else {
                        rFile.isLikeJs = true;
                        _type = 'text/javascript';
                    }

                    _this.once('beforeCompile', function (file) {
                        file.setContent(sContent);
                    });

                    result = _this.compiler(rFile);

                    requires = result[rFile.subpath].requires;

                    _requires = _requires.concat(requires);

                    _requiresObj = _.merge(_requiresObj, rFile.requiresObj);

                    aRequires = result[rFile.subpath].aRequires;

                    for (var i = 0, len = aRequires.length; i < len; i++) {
                        nContent += buildTag(new File(aRequires[i], rFile.dirname), rFile.dirname);
                    }

                    _nContent = rFile.getContent();

                    if (_nContent.replace(/\s+/gm, '') != '') {
                        nContent += '<' + type + ' type = "' + _type + '">\n' + _nContent + '\n</' + type + '>';
                        nContent = nContent.replace(nsRegExp, '');
                    }

                    return nContent;

                });

                for (var i = 0, len = _requires.length; i < len; i++) {
                    file.addRequire(_requires[i]);
                }

                file.aRequires = getAllRequires(file.subpath);
                file.requiresObj = _requiresObj;
                file.setContent(content);
                storage[file.subpath] = file;
            }

            processor(file);

    },

    processor: function (file) {
        if (file.isLikeJs) {
            this.js(file);
        } else if (file.isLikeCss) {
            this.css(file);
        } else if (file.isLikeHtml) {
            this.html(file);
        }
    },
    _compile: function (src) {
        var file, cacheFile;

        if (src instanceof File) {
            file = src;
        } else if (_.isAbsolute(src)) {
            file = new File(src);
        }

        this.map[file.subpath] = this.map[file.subpath] || {};

        cacheFile = storage[file.subpath];

        this.contentProcessor(file);
        // 同一个html中可以写多个脚本块，所以这里不做判定
        if (!file.isLikeHtml && file.subpath in storage && file.mtime === cacheFile.mtime) {
            if (cacheFile.md5) {
                if (file.md5 == cacheFile.md5) {
                    return;
                }
            } else {
                return;
            }
        }

        storage[file.subpath] = file;


        this.emit('beforeCompile', file);

        try {
            this.processor(file);
        } catch (e) {
            storage[file.subpath] = cacheFile;
            throw new Error(e);
        }

    },

    contentProcessor: function (file) {
        var content;

        if (this.cntProcessor) {
            content = this.cntProcessor(file);
            file.buildMd5(content);
            file.setContent(content);
            return content;
        } else {
            file.buildMd5();
            return file.getContent();
        }

    },

    compiler: function (src) {
        this._compile(src);
        generateDeps();
        return storage;
    }
};

for (var i in prototype) {
    Processor.prototype[i] = prototype[i];
}

module.exports = function(opt) {
    var processor = new Processor(opt.contentProcessor);
    return processor.compiler(opt.src);
};