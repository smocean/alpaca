var colors = require('colors');
var ep = module.exports = {};

function getLine(loc) {
    if (loc && loc.start && loc.end) {
        if (loc.start.line == loc.end.line) {
            return '[' + loc.start.line + ':' + loc.start.column + ']';
        }
    }
    return '';
}

function log(type, msg, loc) {
    if (type) {
        type = '\n[' + type.toLocaleUpperCase() + '][ALPACA-SM]';
    }
    process.stdout.write(type + msg + getLine(loc) + '\n');
}

ep.error = function(err, loc) {
    if (!(err instanceof Error)) {
        err = new Error(err.message || err);
    }

    log('error', err.message.red, loc || {});
    process.exit(1);
}

ep.warning = function(msg, loc) {
    log('waring', msg.yellow, loc);
}

ep.getLine = getLine;
