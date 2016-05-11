var colors = require('colors');
var util = require('util');
var eventEmitter = require('events').EventEmitter;
// var ep = module.exports = {};

function AlpacaError (msg, loc) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);
    this.name = 'AlpacaError';
    this.message = msg;
}
util.inherits(AlpacaError, Error);


function LOG() {
    this.setMaxListeners(0);

}
util.inherits(LOG, eventEmitter);

LOG.prototype.error = function(err, loc) {
    if (!(err instanceof Error)) {
        err = new Error(err.message || err);
    }

    log('error', err.message.red, loc || {});
    process.exit(1);
}

LOG.prototype.warning = function(msg, loc) {
    this.log('warning', msg.yellow, loc);
}

LOG.prototype.log = function (type, msg, loc) {
    var error;
    if (type) {
        type = '\n[' + type.toLocaleUpperCase() + '][ALPACA-SM]';
    }
    if (alp.config.get('error') == 'throw') {

        if (type == 'error') {
            throw new AlpacaError(msg, loc, type);
        } else {
            this.emit('warning', msg + this.getLine(loc), loc);
        }

    } else {
            process.stdout.write(type + msg + this.getLine(loc) + '\n');

    }
}

LOG.prototype.getLine = function (loc) {
    if (loc && loc.start && loc.end) {
        if (loc.start.line == loc.end.line) {
            return '[' + loc.start.line + ':' + loc.start.column + ']';
        }
    }
    return '';
};

function getLine(loc) {
    if (loc && loc.start && loc.end) {
        if (loc.start.line == loc.end.line) {
            return '[' + loc.start.line + ':' + loc.start.column + ']';
        }
    }
    return '';
}

function log(type, msg, loc) {
    var error;
    if (type) {
        type = '\n[' + type.toLocaleUpperCase() + '][ALPACA-SM]';
    }
    if (alp.config.get('error') == 'throw') {

        if (type == 'error') {
            throw new AlpacaError(msg, loc, type);
        }

    } else {

    }
    process.stdout.write(type + msg + getLine(loc) + '\n');
}

// ep.error = function(err, loc) {
//     if (!(err instanceof Error)) {
//         err = new Error(err.message || err);
//     }

//     log('error', err.message.red, loc || {});
//     process.exit(1);
// }

// ep.warning = function(msg, loc) {
//     log('waring', msg.yellow, loc);
// }

// ep.getLine = getLine;

module.exports = new LOG();

