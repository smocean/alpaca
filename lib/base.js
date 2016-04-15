var eventEmitter = require('events').EventEmitter;

function ParseBase() {
    this.setMaxListeners(0);
}

require('util').inherits(ParseBase, eventEmitter);

ParseBase.prototype.addContentProcessor = function (fn) {
    typeof fn === 'function' && (this.cntProcessor = fn);
};
ParseBase.prototype.getFileContent = function (file) {
    var result;

    if (typeof this.cntProcessor == 'function') {
        result = this.cntProcessor(file);
        if (typeof result == 'undefined') {
            result = file.getContent();
        }

    } else {
        result = file.getContent();
    }

    return result.toString();
};

module.exports = ParseBase;
