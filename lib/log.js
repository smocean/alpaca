var colors = require('colors');

var ep = module.exports = {};

function log(type, msg) {
    if (type) {
        type = '\n[' + type.toLocaleUpperCase() + '] ';
    }
    process.stdout.write(type + msg + ' this is in "alpaca" module'.red + '\n');
}


ep.error = function(err) {
    if (!(err instanceof Error)) {
        err = new Error(err.message || err);
    }

    log('error', err.message.red);
    process.exit(1);
}

ep.warning = function(msg) {
    log('waring', msg.yellow);
}

ep.info = function(msg) {
    log('', msg.green);
}

ep.debug = function(msg){
    log('debug',msg.blue);
}