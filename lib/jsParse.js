var esprima = require('esprima');

var estraverse = require('estraverse');

var escodegen = require('escodegen');

var Syntax = require('./syntax.js');

var CleanCss;

var uglifyJs;

var _ = alp._;

var cleanCssOptions;

var uglifyJsOptions;

function getCleanCss() {
	if (!CleanCss) {
		CleanCss = require('clean-Css');
		cleanCssOptions = alp.config.get('settings.optimizer.css');
	}
	return CleanCss;
}

function getUglifyJs() {
	if (!uglifyJs) {
		uglifyJs = require('uglify-js');
		uglifyJsOptions = alp.config.get('settings.optimizer.js');
		//覆写alp-conf.js或用户设置fromString。
		uglifyJsOptions.fromString = true;
	}
	return uglifyJs;
}
/**
 * 为js添加一个外包。
 */
function addWrapper(ast) {
	var ns = alp.config.get('ns'),
		cAst = esprima.parse('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){})(' + ns + ')');

	estraverse.replace(cAst, {
		leave: function(node, parent) {
			var nodeType = node.type;

			if (nodeType === Syntax.BlockStatement) {
				return {
					type: node.type,
					body: [].slice.call(ast.body, 0)
				}
			}
		}
	});

	return cAst;
}
/**
 * 添加扩展名
 */
function addExtension(path, ext) {
	return path + "." + (typeof ext === 'string' ? ext : 'js');
}

function buildId(src) {
	return src.replace(/[:\/\\.-]+/g, '_').replace(/_[^_]+/g, function() {
		var args = [].slice.call(arguments, 0),
			index = args[1],
			v = escape(args[0].replace(/[_]/g, '')).replace(/%[\da-z]{2}/ig, '');

		if (index == 0) {
			return v;
		}
		return '_' + v;
	});
}

function buildExportsAst(name) {
	var ns = alp.config.get('ns');
	if (name) {
		return {
			"type": Syntax.MemberExpression,
			"computed": false,
			"object": {
				"type": Syntax.Identifier,
				"name": ns
			},
			"property": {
				"type": Syntax.Identifier,
				"name": name
			}
		}
	} else {
		return {
			"type": Syntax.Identifier,
			"name": ns
		}
	}
};

function parse(opt, result) {


	var src = opt.src;

	var cnt = opt.cnt;

	var callback = opt.callback;

	var cssCb = opt.cssCb;

	var ast;
	var base = alp.config.get('base');
	var isReadCss = alp.config.get('readcss');
	var isReadCssInHtml = alp.config.get('readcssInHtml') && (_.extname(src) === 'html' || _.extname(src) === 'htm');
	var dHash = {};
	var dObj = {};
	var deps = [];
	var dir;

	var relsrc = _.path.relative(base, src);
	var exports;
	var exportStr;
	var hasRequire = false;
	var hasModule = false;
	var exclude = alp.config.get('exclude');
	var isMoudle = function() {
		return hasRequire || hasModule;
	};

	var callee = arguments.callee;

	var ns = alp.config.get('ns');

	var isParse = !_.filter(src, exclude);

	var params = [];

	var args = [];

	var cpa;

	var content;

	var _result;

	dir = alp.config.get('useBaseInJsFile') ? base : _.path.dirname(src);

	result = result || {};

	if (relsrc in result) {

		//callback(buildMap(result, opt.minCallback));

		return;
	}

	if (_.is(cnt, 'function')) {
		content = cnt(src, base);
	} else if (_.is(cnt, 'string')) {
		content = cnt;
	} else {

		if (_.isFile(src) && _.extname(src) === 'js') {
			content = _.read(src);
		} else {
			alp.log.error('unable to find [' + src + ']:No such file or Not JS file');
		}

	}



	ast = esprima.parse(content);

	isParse && estraverse.replace(ast, {
		leave: function(node, parent) {

			var nType = node.type,
				pType = parent.type,
				pName = '',
				paramName,
				rContent = '',
				rAbsUrl,
				key,
				isNotExpressionOrSequence = pType !== Syntax.ExpressionStatement && pType !== Syntax.SequenceExpression;

			if (nType === Syntax.CallExpression && node.callee.name === 'require') {
				rAbsUrl = _.path.resolve(dir, node.arguments[0].value);

				if (!_.isTextFile(rAbsUrl)) {
					rAbsUrl = addExtension(rAbsUrl, 'js')
					if (!_.exists(rAbsUrl)) {
						alp.log.error('unable to find file[' + rAbsUrl + ']: No such file');
					}

				}

				key = _.path.relative(base, rAbsUrl);

				hasRequire = true;

				if (isNotExpressionOrSequence && _.filter(rAbsUrl, exclude)) {
					alp.log.error('不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中，请修改您的配置项exclude');

				}


				if (!_.isJsFile(key)) {

					if (_.extname(key) !== 'css' || (isReadCss && (!(/html?/.test(_.extname(src))))) || _.extname(key) === 'css' && isReadCssInHtml) {
						rContent = _.read(_.path.resolve(base, key)).toString();
						return literalContent(rContent);
					} else if (isNotExpressionOrSequence) {
						alp.log.error('在配置文件readcss = false的情况下，不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中');

					} else {
						result[key] = cssCb.call(null, {
							src: rAbsUrl,
							cnt: opt.cnt
						});
					}



					/*if (isReadCss || _.extname(key) !== 'css') {
						rContent = _.read(_.path.resolve(base, key)).toString();

						return {
							"type": Syntax.Literal,
							"value": rContent,
							"raw": "'" + rContent + "'"
						};
					} else if (isNotExpressionOrSequence) {
						alp.log.error('在配置文件readcss = false的情况下，不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中');
					} else {
						result[key] = cssCb.call(null, {
							src: rAbsUrl,
							cnt: opt.cnt
						});
					}*/

				} else {
					callee.call(null, {
						src: rAbsUrl,
						cnt: _.is(opt.cnt, 'function') ? opt.cnt : null,
						cssCb: opt.cssCb
					}, result);
				}



				if (isNotExpressionOrSequence && _.isJsFile(key)) {
					pName = buildId(key);
				}

				paramName = {
					name: pName,
					type: 'Identifier'
				};

				if (!(key in dObj)) {
					dObj[key] = {
						absUrl: rAbsUrl,
						url: key,
						raw: node.arguments[0].value,
						paramName: paramName
					};
					deps.push(key);

					if (key in result && result[key].exports && isNotExpressionOrSequence) {
						if (result[key].exports.type === Syntax.MemberExpression) {
							params.push(paramName);
							args.push(result[key].exports);
						} else {
							paramName.name = result[key].exportStr;
						}
					}
				}

				return paramName.name ? paramName : {
					//"type": Syntax.EmptyStatement
					name: '<<<require>>>',
					type: 'Identifier'
				};


			} else if (nType == Syntax.MemberExpression && 'name' in node.object && node.object.name === 'module') {
				hasModule = true;

				if (pType === Syntax.MemberExpression) {
					exports = buildExportsAst();
					exportStr = ns;
					return exports;
				}

				if (pType === Syntax.AssignmentExpression) {
					var _eId = buildId(_.path.relative(base, src))
					exports = buildExportsAst(_eId);
					exportStr = ns + '.' + _eId;
					return exports;
				}
			}



		}
	});


	if (isMoudle()) {
		ast = addWrapper(ast);
		exports = exports || buildExportsAst();

		cpa = ast.body[1].expression;
		cpa['callee'].params = cpa['callee'].params.concat(params);
		cpa['arguments'] = cpa['arguments'].concat(args);
	}

	_result = {
		ast: ast,
		isMoudle: isMoudle(),
		obj: dObj,
		deps: deps,
		exports: exports,
		exportStr: exportStr,
		base: base
	};

	result[relsrc] = _result;


	if (_.is(callback, 'function')) {
		callback(buildMap(result, opt.minCallback));
	}

}

function literalContent(content) {
	return {
		"type": Syntax.Literal,
		"value": content,
		"raw": "'" + content + "'"
	};
}

function generateContent(obj, minCb) {
	var content, isMinifile = alp.config.get('optimizer');

	if (obj.content) {
		content = obj.content;
	} else {
		//content = escodegen.generate(obj.ast).replace(/([\s\n\r]+);\1/gi, "");
		//content = escodegen.generate(obj.ast).replace(/;;/gi, "");
		content = escodegen.generate(obj.ast);
		content = content.replace(/(,\s*(<<<require>>>)\s*(?=;?))|(<<<require>>>\s*,?)/gim, "");

	}

	if (isMinifile) {
		if (!_.is(minCb, 'function')) {
			minCb = minFile;
		}
		content = content.replace(/(;,)/gi, "");
		return minCb(content, !!obj.content);

	} else {
		return content.replace(/([\s\n\r]+);/gi, "");
	}
}

function minFile(content, isCss) {
	var minifier;
	if (isCss) {
		minifier = new(getCleanCss())(cleanCssOptions);

		return minifier.minify(content).styles;
	} else {
		return getUglifyJs().minify(content, uglifyJsOptions).code;
	}
}

function buildMap(result, minCb) {
	var _result = {},
		obj;
	for (var k in result) {
		obj = result[k];
		_result[k] = {
			content: generateContent(obj, minCb),
			map: {
				base: obj.base,
				deps: obj.deps,
				adeps: _bMap(k)
			}
		}

	}


	function _bMap(key, map) {
		var deps = result[key].deps;

		map = map || [];

		for (var ci, len = deps.length, i = len - 1; ci = deps[i], i >= 0; i--) {

			if (key in result[ci].obj) {
				alp.log.error('Existence of circular dependency in file [' + ci + '] and file [' + path + ']')
			}

			map.unshift(ci);

			arguments.callee(ci, map);

		}

		for (var j = 0, mapKey = {}, cj; cj = map[j]; j++) {
			if (cj in mapKey) {
				map.splice(j, 1);
			} else {
				mapKey[cj] = true;
			}
		}

		return map;

	}
	return _result;
}

module.exports = function(opt, settings, cssCb) {
	var result;

	alp.config.merge(settings || {});

	opt = _.merge(opt, {
		callback: function(rst) {
			result = rst;
		},
		cssCb: _.is(cssCb, 'function') ? cssCb : alp.txtParse.parse
	});
	parse(opt);
	return result;
}