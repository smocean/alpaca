var _ = alp._;
var escodegen = require('escodegen');


function traverseNonJs(src, result) {
	var deps = [],
		key, base = alp.config.get('base');

	key = _.path.relative(base, src);

	if (_.isFile(src)) {
		if (!(key in result)) {
			result[key] = alp.nonJsParse(src);
			result[key].base = base;
		}
		deps = result[key].obj;

	} else {
		alp.log.error('unable to find [' + src + ']:No such file');
	}

	for (var rel in deps) {
		if (_.isFile(deps[rel].absUrl)) {
			if (!(rel in result)) {
				arguments.callee.call(this, deps[rel].absUrl, result);
			}
		}
	}

}

function traverseJs(src, result) {
	var base, key, isReadCss,
		isJsFile, isCssFile, deps;

	if (_.isFile(src)) {
		result = result || {};
		base = alp.config.get('base');
		key = _.path.relative(base, src);
		isReadCss = alp.config.get('readcss');
		isJsFile = _.isJsFile(src);
		isCssFile = _.extname() === 'css';

		//是js文件或着是css文件但是css文件不可读，才会去做依赖分析。
		if (!(key in result) && (isJsFile || isCssFile && !isReadCss)) {
			if (isJsFile) {
				result[key] = alp.jsParse(src);
				result[key].base = base;
				deps = result[key].obj;
				for (var ci in deps) {
					arguments.callee.call(this, deps[ci].absUrl, result);
				}

			} else {
				result = _.merge(result, parseNonJs(src));
			}
		}

	} else {
		alp.log.error('unable to find [' + src + ']:No such file');
	}

	return result;

}


function buildMap(key, result, map) {
	var deps = result[key].deps;
	map = map || [];

	for (var ci, len = deps.length, i = len - 1; ci = deps[i], i >= 0; i--) {

		if (key in result[ci].obj) {
			alp.log.error('Existence of circular dependency in file [' + ci + '] and file [' + path + ']')
		}

		map.unshift(ci);

		arguments.callee(ci, result, map);

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


function parseNonJs(src) {
	var _result = {},
		result = {},
		obj;
	traverseNonJs(src, _result);

	for (var rel in _result) {
		obj = _result[rel];
		result[rel] = {
			content: obj.content,
			map: {
				deps: obj.deps,
				base: obj.base,
				adeps: buildMap(rel, _result)
			}
		}
	}

	return result;
}

function parseJs(src) {
	var _result = {},
		obj, params,
		args, result = {},
		depObj, cpa;


	traverseJs(src, _result);

	for (var key in _result) {
		obj = _result[key];
		params = [];
		args = [];
		result[key] = {
			content: obj.content,
			map: {
				base: obj.base,
				deps: obj.deps,
				adeps: obj.map
			}
		};
		if (!_.isJsFile(key)) {
			continue;
		}
		deps = obj.obj;
		exports = obj.exports;
		obj.map = buildMap(key, _result);

		if (obj.isMoudle) {
			for (var ci in deps) {
				depObj = deps[ci];
				if (depObj.paramName.name != '') {
					params.push(depObj.paramName);
					args.push(_result[depObj.url].exports);
				}
			}

			cpa = obj.ast.body[1].expression;
			cpa['callee'].params = cpa['callee'].params.concat(params);
			cpa['arguments'] = cpa['arguments'].concat(args);
		}

		obj.content = escodegen.generate(obj.ast).replace(/([\s\n\r]+);\1/gi, "");

		result[key].content = obj.content;
		result[key].map.adeps = obj.map;

	}

	return result;

}


module.exports = function(src) {
	var result={},_result;
	if (_.isJsFile(src)) {
		return parseJs(src);
	} else {
		return parseNonJs(src);
	}

}