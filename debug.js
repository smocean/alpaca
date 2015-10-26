
var alp = require('./index.js');
var _ = alp._;
alp.config.merge({
	base: process.cwd(),
	word: 'require',
});

var result = alp.buildMap('/Users/gml/github/testJS/d.js');

for (var i in result) {

	_.write(_.path.resolve(alp.config.get('base'), 'output3',i), result[i].content, 'utf-8');

}