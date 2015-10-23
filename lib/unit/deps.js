var unit = require('./unit.js');
var colors = require('colors');

var _ = module.exports = {};

function getQueryRegExp(word) {

	word = word || 'require';

	return new RegExp('@?\\b' + word + '\\b\\s*\\(\\s*[\'\"]{1}([^\'\"]+)[\'\"]{1}\\s*\\);*', 'gi');
}

function parser(src, opts) {
	var cnt,
		regExp,
		word,
		base,
		deps = [],
		depsObj = [],
		depsHash = {};

	opts = opts || {};

	word = opts.word;

	base = opts.base || __dirname;

	regExp = getQueryRegExp(word);

	content = unit.read(unit.path.resolve(base, src)).toString();

	cnt = content.replace(regExp, function() {
		var args = [].slice.call(arguments, 0),
			raw = args[1];



		var absUrl = unit.path.resolve(unit.path.dirname(src), raw),
			url = unit.path.relative(base, absUrl);



		if (url in depsHash) {
			return "";
		}
		depsObj.push({
			absUrl: absUrl,
			url: url,
			raw: raw
		});

		deps.push(url);

		depsHash[url] = 1;

		return '';
	});



	return {
		deps: deps,
		obj: depsObj,
		hash: depsHash,
		content: content
	}

}



function deepParser(src, opts, result) {



	opts = opts || {};

	result = result || {};


	if (!('base' in opts)) {
		opts.base = path.dirname(src);
	}


	! function(src) {

		var
			deps, fileDir,
			parserResult,
			absUrl = unit.path.resolve(opts.base, src),
			isFile = unit.isFile(absUrl);



		if (isFile) {

			fileDir = unit.path.dirname(src);
			parserResult = parser(src, opts);
			deps = parserResult.deps;

		} else {

			return;
		}

		if (!(src in result)) {


			result[src] = {};

		}
		if (!('deps' in result[src])) {

			result[src] = parserResult;
			result[src].base = opts.base;

		}

		for (var i = 0, fPath, len = deps.length; i < len; i++) {
			fPath = unit.path.relative(opts.base, deps[i]);

			if (unit.isFile(unit.path.resolve(opts.base, fPath))) {
				if (!(fPath in result)) {
					result[fPath] = {};
					arguments.callee.call(this, fPath, opts);
				}
			} else {
				continue;
			}

		}



	}(unit.path.relative(opts.base, src));

	! function() {
		
		for (var pathKey in result) {

			result[pathKey].map = buildMap(pathKey);
		}

		function buildMap(path, map) {
			var fObj = result[path],
				deps = fObj.deps,
				depsHash;
			map = map || [];
			for (var ci, len = deps.length, i = len - 1; ci = deps[i], i >= 0; i--) {
				depsHash = result[ci].hash;
				if (path in depsHash) {
					throw new Error('Existence of circular dependency in file [' + ci.bold.red + '] and file [' + path.bold.red + ']');
				}

				map.unshift(ci);

				arguments.callee(ci, map);
			}

			for (var j = 0, _mapKey = {}, cj; cj = map[j]; j++) {
				if (cj in _mapKey) {
					map.splice(j, 1);
				} else {
					_mapKey[cj] = 1;
				}

			}

			return map;
		}


	}()

	return result;

}


_.getTextDeps = function(src, opts) {
	var result;



	result = parser(src, opts);


	return {
		deps: result.deps,
		content: result.content
	}
}


_.parserTextDeps = function(src, opts) {
	var result = {},
		base,
		srcs = [];
	opts = unit.merge({
		base: __dirname,
		word: 'require'
	}, opts || {});
	base = opts.base;

	if (unit.is(src, 'string')) {
		srcs.push(src);
	} else if (unit.is(src, 'array')) {
		srcs = src;
	} else {
		throw new Error("Parameter 'src' is not an array of strings or strings");
	}

	for (var i = 0, len = srcs.length, url; i < len; i++) {
		url = unit.path.resolve(base, srcs[i]);
		if (!(unit.path.relative(base, url) in result)) {
			deepParser(url, opts, result);

		}
	}

	return result;
}