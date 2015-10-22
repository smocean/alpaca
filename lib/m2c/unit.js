



var _ = require('../unit');

var exports = module.exports = {};




/**
 * 将按node开发的AST 加上闭包
 * @param  {Object} ast js文件的语法抽像树AST
 * @param  {String} ns  [闭包时要使用namespace]
 * @return {Object}     [新的AST]
 */
exports.addClosureForAst = function(ast, ns) {
	var cAst = _.esprima.parse('window.' + ns + ' = window.' + ns + ' || {};(function(' + ns + '){})(' + ns + ')');

	_.estraverse.replace(cAst, {
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
};

/**
 * 为不同形式的module.exports生成不同的返回
 * example:
 * module.exports = {},module.exports = function(){} 等，生成类似 sm.xxxx=;
 * module.exports.obj = {}等，生成如下 sm.obj = {};
 * @param  {[type]} ns   [description]
 * @param  {[type]
 * @return {[type]}      [description]
 */
exports.buildExportsAst = function(ns,name) {
	
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
/**
 * 根据文件的路径和项目的根路径生成一个id
 */
exports.buildId = function(root,filePath) {

		root = root || __dirname;

		filePath = _.path.relative(root, filePath);

		return filePath.replace(/[:\/\\.-]+/g, '_').replace(/_[^_]+/g, function() {
			var args = [].slice.call(arguments, 0),
				index = args[1],
				v = escape(args[0].replace(/[_]/g, '')).replace(/%[\da-z]{2}/ig, '');

			if (index == 0) {
				return v;
			}
			return '_' + v;
		});
	}
	/**
	 *补全扩展名
	 */
exports.addExtension = function(path, ext) {
	return path + "." + (typeof ext === 'string' ? ext : 'js');

}