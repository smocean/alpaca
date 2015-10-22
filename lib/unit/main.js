var unit = require('./unit.js');

var deps = require('./deps.js');

var esprima = require('esprima'),

	detective = require('detective'),

	estraverse = require('estraverse'),

	escodegen = require('escodegen');


var _ = unit.merge(unit, deps);
_.merge(_, {
	esprima: esprima,
	estraverse: estraverse,
	escodegen: escodegen,
	detective: detective
});


module.exports = _;