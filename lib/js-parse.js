var esprima = require('esprima');

var estraverse = require('estraverse');

var _ = alp._;


function addWrapper(ast) {
	var ns = alp.config.get('ns'),
		cAst = esprima.parse('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){})(' + ns + ')');


	estraverse.replace(cAst, {
		leave: function(node, parent) {
			var nodeType = node.type.toLocaleLowerCase();

			if (nodeType === 'blockstatement') {

				return {
					type: node.type,
					body: [].slice.call(ast.body, 0)
				}
			}
		}
	});

	return cAst;
}

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
			"type": 'MemberExpression',
			"computed": false,
			"object": {
				"type": "Identifier",
				"name": ns
			},
			"property": {
				"type": "Identifier",
				"name": name
			}
		}
	} else {
		return {
			"type": "Identifier",
			"name": ns
		}
	}
};

module.exports = function(src, content) {

	var ast;
	var base = alp.config.get('base');
	var isReadCss = alp.config.get('readcss');
	var dHash = {};
	var dObj = {};
	var deps = [];
	var dir = _.path.dirname(src);
	var exports;
	var hasRequire = false;
	var hasModule = false;
	var exclude = alp.config.get('exclude');
	var isMoudle = function() {
		return hasRequire || hasModule;
	};



	var isParse = !_.filter(src, exclude);

	if (_.is(content, 'undefined')) {
		if (_.isFile(src) && _.extname(src) === 'js') {

			content = _.read(src);
		} else {
			alp.log.error('unable to find [' + src + ']:No such file or Not JS file');
		}
	}

	ast = esprima.parse(content);

	isParse && estraverse.replace(ast, {
		leave: function(node, parent) {

			var nType = node.type.toLocaleLowerCase(),
				pType = parent.type.toLocaleLowerCase(),
				paramName = '',
				rContent = '',
				rAbsUrl,
				key;

			if (nType === 'callexpression' && node.callee.name === 'require') {
				rAbsUrl = _.path.resolve(dir, node.arguments[0].value)
				key = _.path.relative(base, rAbsUrl);
				if (!_.isTextFile(key)) {
					key = addExtension(key, 'js')
				}
				hasRequire = true;

				if (pType !== 'expressionstatement' && _.filter(rAbsUrl, exclude)) {
					alp.log.error('不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中，请修改您的配置项exclude');

				}


				if (!_.isJsFile(key)) {
					if (isReadCss || _.extname(key) !== 'css') {

						rContent = _.read(_.path.resolve(base, key)).toString();

						return {
							"type": "Literal",
							"value": rContent,
							"raw": "'" + rContent + "'"
						};
					} else if (pType !== 'expressionstatement') {
						alp.log.error('在配置文件readcss = false的情况下，不能将require("' + node.arguments[0].value + '")做赋值运算,在' + src + '文件中');
					}

				}



				if (pType !== 'expressionstatement' && _.isJsFile(key)) {
					paramName = buildId(key);
				}

				if (!(key in dObj)) {
					dObj[key] = {
						absUrl: rAbsUrl,
						url: key,
						raw: node.arguments[0].value,
						paramName: {
							name: paramName,
							type: 'Identifier'
						}
					};
					deps.push(key);
				}

				return {
					type: "Identifier",
					name: paramName
				}


			} else if (nType == 'memberexpression' && 'name' in node.object && node.object.name === 'module') {
				hasModule = true;

				if (pType === 'memberexpression') {
					exports = buildExportsAst();

					return exports;


				}


				if (pType === 'assignmentexpression') {
					exports = buildExportsAst(buildId(_.path.relative(base, src)));

					return exports;
				}
			}



		}
	});



	return {
		ast: isMoudle() ? addWrapper(ast) : ast,
		isMoudle: isMoudle(),
		obj: dObj,
		deps: deps,
		exports: exports || (isMoudle() && buildExportsAst())
	}


}