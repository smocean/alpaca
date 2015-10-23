var unit = require('./unit.js');

var _ = require('../unit');


var options = {

	"ns": "alpaca",
	"readcss": false,
	"exclude": [],
	"base": _.path.sep,
	"word": "require"
};

var config;

function buildConfig(opts) {

	var _config = _.merge(options, opts);



	return {


		isInExclude: function(src) {
			var path, flag;
			for (var i = 0, len = _config.exclude.length; i < len; i++) {

				path = _.path.resolve(_config.base, _config.exclude[i]);

				if (_.isDir(path)) {
					if (src.indexOf(path) >= 0) {
						flag = true;
						break;
					}
				} else if (path == src) {
					flag = true;

					break;
				}

			}
			return flag;
		},
		get: function(key) {
			return _.is(key, 'undefined') ? _config : _config[key];
		}

	}

};


function getdeps(url, result) {

	var absUrl, content, isJsFile, isReadCss,

		dir, base, ns, files, isCssFile;

	base = config.get('base');

	ns = config.get('ns');

	isReadCss = config.get('readcss');

	result = result || {};

	isJsFile = _.isJsFile(url);

	isCssFile = _.extname(url) === 'css';

	absUrl = _.path.resolve(base, url);

	dir = _.path.dirname(absUrl);



	//是js文件或着是css文件但是css文件不可读，才会去做依赖分析。
	if (!(url in result) && (isJsFile || (isCssFile && !isReadCss))) {
		result[url] = {};


		if (isJsFile) {
			content = _.read(absUrl);

			files = _.detective(content);

			if (!('ast' in result[url])) {
				result[url] = build(content, absUrl);

				result[url].base = base;
			} else {
				return;
			}

			for (var i = 0, src, _url, len = files.length; i < len; i++) {
				src = _.path.resolve(dir, files[i]);
				if (_.isTextFile(src)) {
					_url = _.path.relative(base, src);
				} else {
					_url = _.path.relative(base, unit.addExtension(src, 'js'));
				}
				arguments.callee.call(this, _url, result);
			}



		} else {
			result = _.merge(result, _.parserTextDeps(url, {
				base: base,
				word: config.get("word")
			}));
		}
	}

	return result;

}


/**
 * 处理生成的依赖文件和ast
 
 */
function doWithResult(result) {
	var obj, key, deps, exports, params = [],
		args = [],
		relResult = {},
		cpa;

	for (key in result) {
		obj = result[key];
		params = [];
		args =[];
		relResult[key] = {
			content: obj.content,
			map: {
				base: obj.base,
				deps: obj.deps,
				adeps: obj.map
			}
		}

		if (!_.isJsFile(key)) {
			continue;
		}

		deps = obj.dObj;
		exports = obj.exports;

		obj.map = buildMap(key, result);

		if (obj.isMoudle) {
			for (var i = 0, ci, _exports; ci = deps[i]; i++) {
				if (ci.paramName.name != '') {
					params.push(ci.paramName);
					_exports = result[ci.src].exports;
					if (_exports) {
						args.push(_exports);
					} else {
						args.push(unit.buildExportsAst(config.get('ns')))
					}
				}
			}
			cpa = obj.ast.body[1].expression;
			cpa['callee'].params = cpa['callee'].params.concat(params);
			cpa['arguments'] = cpa['arguments'].concat(args);

		}

		obj.content = _.escodegen.generate(obj.ast).replace(/([\s\n\r]+);\1/gi,"");

		relResult[key].content = obj.content;

		relResult[key].map.adeps = obj.map;


	}
	return relResult;


}

/**
 * 为文件生成依赖map
 
 */
function buildMap(path, result, map) {
	var obj = result[path],
		deps = obj.deps,
		hash,
		isJsFile;

	map = map || [];

	for (var ci, len = deps.length, i = len - 1; ci = deps[i], i >= 0; i--) {
		isJsFile = _.isJsFile(ci);
		if (isJsFile) {
			hash = result[ci].dHash;
			if (path in hash) {
				throw new Error('Existence of circular dependency');
			}
		}


		map.unshift(ci);

		isJsFile && arguments.callee.call(this, ci, result, map);
	}

	for (var j = 0, mapKey = {}, cj; cj = map[j]; j++) {
		if (cj in mapKey) {
			map.splice(j, 1);
		} else {
			mapKey[cj] = 1;
		}
	}

	return map;

}
/**
 * 生成AST抽像树
 */
function build(data, jsAbsUrl) {
	var ast,
		dObj = [],
		deps = [],
		ns = config.get('ns'),
		base = config.get('base'),
		isReadCss = config.get('readcss'),
		dHash = {},
		exports,
		exportStr,
		content,
		dir = _.path.dirname(jsAbsUrl),
		_ast = _.esprima.parse(data),
		hasMoudle = false,
		hasRequire = false;

	exports = unit.buildExportsAst(ns);
	exportStr = ns;

	if (config.isInExclude(jsAbsUrl)) {
		ast = _ast;
	} else {
		_.estraverse.replace(_ast, {

			leave: function(node, parent) {
				var nType = node.type.toLocaleLowerCase(),
					pType = parent.type.toLocaleLowerCase(),
					paramName = "",
					src;

				if (nType === 'callexpression' && node.callee.name === 'require') {
					src = _.path.relative(base, _.path.resolve(dir, node.arguments[0].value));
					if (!_.isTextFile(src)) {
						src = unit.addExtension(src, 'js');
					}
					hasRequire = true;

					/*// 如果依赖的文件是要求读出内容并写入当前文件的，并且是 var xx = require('../xx.css')形式
					if (config.isCanReadFileContent(src) && pType != 'expressionstatement') {
						content = _.read(_.path.resolve(base, src)).toString();
						return {
							"type": "Literal",
							"value": content,
							"raw": "'" + content + "'"
						};
					}*/


					if (!_.isJsFile(src)) {

						if (isReadCss || _.extname(src) !== 'css') {

							content = _.read(_.path.resolve(base, src)).toString();

							return {
								"type": "Literal",
								"value": content,
								"raw": "'" + content + "'"
							};
						}
						else if(pType !== 'expressionstatement'){
							throw new Error('在配置文件readcss = false的情况下，不能将require("'+node.arguments[0].value+'")做赋值运算,在'+jsAbsUrl+'文件中');
						}
					}



					if (!(pType === 'expressionstatement' || !_.isJsFile(src))) {
						paramName = unit.buildId(base, src);
					}

					if (!(src in dHash)) {
						dHash[src] = 1;
						dObj.push({
							type: _.extname(src),
							src: src,
							paramName: {
								name: paramName,
								type: 'Identifier'
							}
						});
						deps.push(src);
					}

					

					return {
						type: "Identifier",
						name: paramName
					}
				} else if (nType === 'memberexpression') {
					if ('name' in node.object && node.object.name === 'module') {
						hasMoudle = true;

						if (pType === 'memberexpression') {
							exports = unit.buildExportsAst(ns);
							exportStr = ns;

							return {

								"type": "Identifier",
								"name": ns
							}

						}

						if (pType === 'assignmentexpression') {
							var _name = unit.buildId(base, jsAbsUrl);
							exports = unit.buildExportsAst(ns, _name);
							exportStr = ns + '.' + _name;

							return exports;
						}
					}
				}


			}
		});

		ast = hasMoudle || hasRequire ? unit.addClosureForAst(_ast, ns) : _ast;
	}



	return {
		ast: ast,
		isMoudle: hasMoudle || hasRequire,
		dObj: dObj,
		deps: deps,
		dHash: dHash,
		exports: exports,
		exportStr: exportStr
	}
}


function ep(src, opts, result) {

	config = buildConfig(opts);



	var base = config.get('base');



	result = result || {};

	getdeps(_.path.relative(base, src), result);
	return doWithResult(result);


}



ep = _.merge(ep, _);

module.exports = ep;