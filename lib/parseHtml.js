var word = alp.config.get('word');
var ns = alp.config.get('ns');
var Base = require('../lib/base.js');
var ParseCss = require('../lib/parseCss.js');
var ParseJS = require('../lib/parseJS.js');
var common = require('./common.js');
var File = require('./file.js');
var storage = alp.storage;
var _ = alp._;
var config = alp.config;


function ParseHtml () {
    Base.call(this);
    if (ParseHtml.instance instanceof ParseHtml) {
        return ParseHtml.instance;
    }
    ParseHtml.instance = this;
    this.parseCss = new ParseCss();
    this.parseJS = new ParseJS();
}

require('util').inherits(ParseHtml, Base);

ParseHtml.prototype.parse = function (file) {
    var scriptRegExp = /<(script|style) .*?data-main.*?>([\s\S]*?)<\/\1>/mig,
        ns = config.get('ns'),
        nsRegExp = new RegExp('(window\\.' + ns + ')(\\s*)=\\2\\1\\2\\|\\|\\2\\{\\}[;,]?', 'gm'),
        _this = this;

    ((function (file) {
        var content = this.getFileContent(file),
            _requires = [],
            _requiresObj = {},
            count = 0,
            sContent = arguments[2],
            nContent,
            _this = this;

        content = content.toString();

        content = content.replace(scriptRegExp, function () {
            var tag = arguments[1].toLocaleLowerCase(),
                sContent = arguments[2],
                newFilename = '.' + file.basename + 'fragment_' + (count++) + '.',
                newPath = file.dirname + '/',
                nContent = '',
                _nContent = '',
                type,
                rFile;

            if (tag == 'style') {
                newFilename += 'css';
                type = 'text/css';
            } else if (tag == 'script') {
                newFilename += 'js';
                type = 'text/javascript';
            }
            newPath += newFilename;

            _.write(newPath, sContent);
            rFile = new File(newPath, file.dirname);
            rFile.isWrapJsInHtml = config.get('wrapJsInHtml');
            rFile.isWrapJSClosure = false;
            rFile.useCompile = true;
            _this.emit('parse', rFile);
            rFile = storage[rFile.subpath];
            for (var j = 0, jlen = rFile.requires.length; j < jlen; j++) {
                file.addRequire(rFile.requires[j]);
            }
            for (var i = 0, aRequires = rFile.aRequires, len = aRequires.length; i < len; i++) {
                if (file.aRequires.indexOf(aRequires[i]) >= 0) {
                    continue;
                }
                file.addARequire(aRequires[i]);
                nContent += _this.buildTag(new File(aRequires[i], file.dirname), file.dirname);
            }

            _nContent = rFile.getContent().replace(new RegExp(rFile.nsRegExp), '');

            if (_nContent.replace(/\s+/gm, '') != '') {

                nContent += '<' + tag + ' type = "' + type + '">\n' + _nContent + '\n</' + tag + '>';
                nContent = nContent.replace(nsRegExp, '');
            }

            // 删除临时文件
            delete storage[rFile.subpath];
            if (_.exists(newPath)) {
                _.fs.unlinkSync(newPath);
            }

            return nContent;
        });
        file.setContent(content);
    }).bind(this))(file);

    storage[file.subpath] = file;
};

ParseHtml.prototype.buildTag = function (file, base) {
    var path,
        ext = file.rExt;

    path = _.path.relative(base, file.subpath).replace(/\\/g, '/');
    if (file.isLikeCss) {

        path = path.replace(new RegExp('\\.\\s*' + ext + '$', 'gi'), '.css');
        ext = 'css';
    } else if (file.isLikeJs) {
        ext = 'js';
    } else {
        return '';
    }

    return config.get('tmpl')[ext].replace(/\{\d{1}\}/, path) + '\n';
};
module.exports = ParseHtml;
