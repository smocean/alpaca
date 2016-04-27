var alp = module.exports = {};

if (!global.alp) {
    Object.defineProperty(global, 'alp', {
        enumerable: true,
        writable: false,
        value: alp
    });
}
alp.log = require('./lib/log.js');
alp._ = require('./lib/util.js');

alp.storage = alp.storage || {};

alp.config = alp.config || require('./lib/config.js');

alp.File = require('./lib/file.js');

alp.processor = require('./lib/dispatcher.js');

