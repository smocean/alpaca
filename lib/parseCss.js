var Base = require('../lib/base.js');
var File = require('./file.js');

function ParseCSS () {
    Base.call(this);
    if (ParseCSS.instance instanceof ParseCSS) {
        return ParseCSS.instance;
    }
    ParseCSS.instance = this;
}

require('util').inherits(ParseCSS, Base);

ParseCSS.prototype.parse = function (file, content) {
    var content, regExp;

    content = this.getFileContent(file);
    regExp = new RegExp('@?\\b' + alp.config.get('word') + '\\b\\s*[\'\"]{1}([^\'\"]+)[\'\"]{1}\\s*;*', 'gi');
    content = content.replace(regExp, function () {
        var args = [].slice.call(arguments, 0),
            raw = args[1],
            rFile;

        rFile = new File(raw, file.dirname);
        if (file.existsRequire(rFile.subpath)) {
            return '';
        }
        file.addRequire(rFile.subpath);
        return '';
    });
    file.setContent(content);
};

module.exports = ParseCSS;
