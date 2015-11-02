var alp = module.exports = {};
if (!global.alp) {
	Object.defineProperty(global, 'alp', {
		enumerable: true,
		writable: false,
		value: alp
	});
}

alp._ = require('./lib/unit.js');

alp.log = require('./lib/log.js');

alp.jsParse = require('./lib/js-parse.js');

alp.nonJsParse = require('./lib/non-js-parse.js');

alp.config = require('./lib/config.js');

alp.buildMap = require('./lib/buildMap.js');