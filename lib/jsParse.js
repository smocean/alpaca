var esprima = require('esprima');

var estraverse = require('estraverse');

var escodegen = require('escodegen');

var Syntax = require('./syntax.js');

var CleanCss;

var uglifyJs;

var _ = alp._;

var cleanCssOptions;

var uglifyJsOptions;

var closureReg = function(content) {
	var ns = alp.config.get('ns');

	content = content ? content : "";

	return alp.config.get('optimizer') ?
		new RegExp('^(window\\.' + ns + ')\\s*=\\s*\\1(\\|\\|\\{\\})[,;]\\s*?function\\s*\\(.*?\\)\\s*?\\{\\s*?' + content + '\\s*\\}\\s*?\\(' + ns + '\\);$', 'gi') :
		new RegExp('^(window\\.' + ns + ')(\\s*)=\\2\\1\\2\\|\\|\\2\\{\\};([\\r\\n\\s])*\\(function\\2\\(' + ns + '\\)\\2\\{[\\r\\n\\s]*?' + content + '[\\r\\n\\s]*?\\}\\(' + ns + '\\)\\);*$', 'gim');

};


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

function exportsRegExp(exports) {

}

/**
 * 为js添加一个外包。
 */
function addWrapper(ast, vname) {

	var ns = alp.config.get('ns'),
		wrapper = [],
		exports = ns + '.' + vname,
		cAst;

	wrapper.push('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){');
	//vname && wrapper.push('var ' + vname + '= '+exports+' = {};' + exports + '=' + vname + 'Extend(' + exports + ',' + vname + ');function ' + vname + 'Extend(target,source){target = target || {};source =source || {};for(var i in source){target[i] = source[i];}return target;}')

	vname && wrapper.push(exports + ' = ' + exports + ' || {};');

	wrapper.push('})(' + ns + ');');

	cAst = esprima.parse(wrapper.join(''));
	//cAst = esprima.parse('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){ var ' + vname + ' = {};'+exports+'='+vname+'Extend('+exports+','+vname+');function '+vname+'Extend(target,source){target = target || {};source =source || {};for(var i in source){target[i] = source[i];}return target;}})(' + ns + ')');
	//console.log('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){ var ' + vname + ' = {};'+exports+'='+vname+'Extend('+exports+','+vname+');function '+vname+'Extend(target,source){target = target || {};source =source || {};for(var i in source){target[i] = source[i];}return target;}})(' + ns + ')');

	estraverse.replace(cAst, {
		leave: function(node, parent) {
			var nodeType = node.type;
			var body, item;
			if (nodeType === Syntax.BlockStatement && parent.type === Syntax.FunctionExpression && parent.params[0].name === ns) {
				body = [].slice.call(node.body, 0);
				item = [].slice.call(ast.body, 0);

				for (var i = 0, len = item.length; i < len; i++) {
					body.splice(1 + i, 0, item[i]);
				}

				return {
					type: node.type,
					body: body
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

function buildExportsAst(name, ns) {
	var ns = ns || alp.config.get('ns');
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
/**
 * 递归解析依赖
 * @param  {Object} 参数src 和 cnt
 * @param  {Object} 保存结果
 * @param  {Object} 检测循环引用
 * @return {[type]}        [description]
 */
function parse(opt, result, map) {


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

	var _eId = buildId(_.path.relative(base, src));

	dir = alp.config.get('useBaseInJsFile') ? base : _.path.dirname(src);

	result = result || {};

	map = map || {};


	map[relsrc] = map[relsrc] || {};


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
				if(typeof node.arguments[0].value != 'string'){
					return node;
				}

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
					//非js, css文件，读取内容。
					if (!_.isLikeCss(key) || (isReadCss && (!(/html?/.test(_.extname(src))))) || _.isLikeCss(key) && isReadCssInHtml) {
						if (_.is(cnt, 'function')) {
							rContent = cnt(rAbsUrl, base)
						} else {
							rContent = _.read(_.path.resolve(base, key)).toString();
						}
						return literalContent(rContent);
					} else if (isNotExpressionOrSequence) {
						//alp.log.error('在配置文件readcss = false的情况下，不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中');
						alp.log.warning('在文件' + src + '中的require("' + node.arguments[0].value + '")将被转成undefined')
						return {
							name: 'undefined',
							type: 'Identifier'
						}
					} else {

						_.merge(result, cssCb.call(null, {
							src: rAbsUrl,
							cnt: opt.cnt
						}));
					}

				} else {

					map[relsrc][key] = 1;
					if (key in map && relsrc in map[key]) {
						alp.log.error("文件" + relsrc + "和" + key + "存在循环引用");
					}



					callee.call(null, {
						src: rAbsUrl,
						cnt: _.is(opt.cnt, 'function') ? opt.cnt : null,
						cssCb: opt.cssCb
					}, result, map);


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
					if (key in result) {
						if (result[key].exports && isNotExpressionOrSequence) {
							if (result[key].exports.type === Syntax.MemberExpression) {
								params.push(paramName);
								args.push(result[key].exports);
							} else {
								paramName.name = result[key].exportStr;
							}
						} else if (!result[key].exports && isNotExpressionOrSequence) {

							alp.log.warning(key + '文件不存在module.exports,所以在' + relsrc + '文件中默认返回undefined');
							paramName.name = 'undefined';
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

				//var _eId = buildId(_.path.relative(base, src));


				//if (pType === Syntax.MemberExpression || pType === Syntax.AssignmentExpression || pType === Syntax.VariableDeclarator) {

				exports = buildExportsAst(_eId);

				exportStr = ns + '.' + _eId;

				/*if (pType === Syntax.MemberExpression) {

					return buildExportsAst(null,_eId);

				}*/

				return exports;

				//}


				/*if (pType === Syntax.MemberExpression ) {
					exports = buildExportsAst(_eId);
					exportStr = ns + '.' +_eId;
					return exports;
				}

				if (pType === Syntax.AssignmentExpression) {
					exports = buildExportsAst(_eId);
					exportStr = ns + '.' + _eId;
					return exports;
				}*/
			}



		}
	});


	if (isMoudle()) {
		var isAddWrapper =!alp.config.get('isJswrapperInHtml') && (_.extname(src) !== 'html' && _.extname(src) !== 'htm');
		ast = isAddWrapper ? addWrapper(ast, _eId) : ast;
		exports = exports || buildExportsAst();
		if (isAddWrapper) {
			cpa = ast.body[1].expression;
			cpa['callee'].params = cpa['callee'].params.concat(params);
			cpa['arguments'] = cpa['arguments'].concat(args);
		}

	}


	var _regExp = _.escapeReg(ns + '.' + _eId);

	_result = {
		ast: ast,
		isMoudle: isMoudle(),
		obj: dObj,
		deps: deps,
		exports: exports,
		exportStr: exportStr,
		regExp: _regExp + '\\s*=\\s*' + _regExp + '\\s*\\|\\|\\s*\\{\\};',
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
	var escodegenOptions = {};
	if ('content' in obj && _.is(obj.content, 'string')) {
		content = obj.content;
	} else {
		//content = escodegen.generate(obj.ast).replace(/([\s\n\r]+);\1/gi, "");
		//content = escodegen.generate(obj.ast).replace(/;;/gi, "");
		if (isMinifile) {
			escodegenOptions = {
				format: {
					indent: {
						style: '',
						base: 0
					},
					newline: ''
				}
			}
		}
		content = escodegen.generate(obj.ast, escodegenOptions);
		//content = content.replace(/(,\s*(<<<require>>>)\s*(?=;?))|(<<<require>>>\s*,?)/gim, "");

		content = content.replace(/(<<<require>>>\s*;+)|(<<<require>>>\s*,+)/gim, "");

	}
	if (isMinifile) {
		/*if (!_.is(minCb, 'function')) {
			minCb = minFile;
		}*/
		content = content.replace(/[;,][\s\n\r]*(?=[;,])/gi, "");


		//return minCb(content, !!obj.content);

	} else {
		content = content.replace(/([\s\n\r]+);/gi, "");
	}

	content = content.replace(closureReg(obj.regExp), '');

	if ('exports' in obj && obj.exports && "type" in obj.exports && obj.exports.type === Syntax.Identifier) {
		return content.replace(new RegExp(obj.regExp, 'igm'), "");
	} else {
		return content;
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
			exportStr: obj.exportStr,
			map: {
				base: obj.base,
				deps: obj.deps,
				adeps: _bMap(k)
			}
		}

	}


	function _bMap(key, map) {
		var deps = result[key].deps || result[key].map.deps;

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

module.exports = function(opt, settings) {
	var result;

	alp.config.merge(settings || {});

	opt = _.merge(opt, {
		callback: function(rst) {
			result = rst;
		},
		cssCb: alp.txtParse.deepParse
	});
	parse(opt);
	return result;
}