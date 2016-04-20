var _ = alp._;

var path = _.path;

var config = alp.config;

function removeExt(url) {
    return url.replace(/\.[\da-z]*$/i, '');
}

function File(url, based, isUseExists) {
    var root = config.get('root'),
        absUrl,
        ext;

    this.based = _.unix(config.get('fileBasedRoot') ? root : based || root);
    absUrl = path.resolve(this.based, url);
    ext = path.extname(absUrl);
    if (ext.trim().length == 0) {
        absUrl = removeExt(absUrl) + '.js';
    }
    if (_.is(isUseExists, 'undefined')) {
        isUseExists = true;
    }
    if (isUseExists && !_.exists(absUrl)) {
        alp.log.error(new Error('unable to find [' + absUrl + ']:No such file ' + (based ? ('in [' + based + ']') : '')));
    }
    this.url = _.unix(url);
    absUrl = _.unix(absUrl);
    this.rUrl = _.unix(path.relative(this.based, absUrl));
    this.realpath = absUrl;
    this.realpathNoExt = removeExt(absUrl);
    this.dirname = path.dirname(absUrl);
    this.root = root;
    this.ext = path.extname(url);
    this.rExt = this.ext.replace('.', '');
    this.basename = path.basename(absUrl, ext);
    this.filename = this.basename + this.ext;
    this.subpath = _.unix(path.relative(root, absUrl));
    this.subpathNoExt = removeExt(this.subpath);
    this.subdirname = path.dirname(this.subpath);
    this.isLikeCss = _.isLikeCss(absUrl);
    this.isLikeHtml = /html?/.test(this.ext);
    this.isJsFile = _.isJsFile(absUrl);
    this.isLikeJs = this.isJsFile;
    this.isTextFile = _.isTextFile(absUrl);
    this.exportStr;
    this.exports;
    this.requires = [];
    this.aRequires = [];
    this.requiresObj = {};
    this.isOptimizer = false;
    this.id = this.buildId();
    this.ns = config.get('ns');
    this.isWrapJSClosure = this.isJsFile;
    if (this.isLikeCss) {
        this.isCanembed = config.get('readable.css');
    }
    this.useCompile = _.filter1(absUrl, config.get('include'), config.get('exclude'));
    this.mtime = this.getMtime();

}

File.prototype = {
    buildId: function() {
        var src = this.subpath;
        return src.replace(/[:\/\\.-]+/g, '_').replace(/_[^_]+/g, function () {
            var args = [].slice.call(arguments, 0),
                index = args[1],
                v = escape(args[0].replace(/[_]/g, '')).replace(/%[\da-z]{2}/ig, '');

            if (index == 0) {
                return v;
            }
            return '_' + v;
        });
    },
    isMoudle: function () {
        return this.hasRequire || this.hasExports;
    },
    getContent: function () {
        if (typeof this._content === 'undefined') {
            this._content = _.read(this.realpath, this.isTextFile).toString();

        }
        this.md5 = _.md5(this._content);
        return this._content;
    },
    getRawContent: function () {

        this.rawContent = _.read(this.realpath, this.isTextFile).toString();
        return this.rawContent;
    },
    setContent: function (content) {
        this._content = content;

        this.md5 = _.md5(content);
    },
    getMtime: function () {
        return +_.mtime(this.realpath);
    },
    addRequire : function(id){
        if(id && (id = id.trim())){
            if(this.requires.indexOf(id) < 0){
                this.requires.push(id);
                this.requiresObj[id] = 1;
            }
            return id;
        }
        return false;
    },
    existsRequire: function (id) {
        return id in this.requiresObj;
    },
    removeRequire: function(id){
        var pos = this.requires.indexOf(id);
        if(pos > -1){
            this.requires.splice(pos, 1);
            delete this.requiresObj[id];
        }
    },
    addARequire : function(id){
        if(id && (id = id.trim())){
            if(this.aRequires.indexOf(id) < 0){
                this.aRequires.push(id);

            }
            return id;
        }
        return false;
    },
    removeARequire: function(id){
        var pos = this.aRequires.indexOf(id);
        if(pos > -1){
            this.aRequires.splice(pos, 1);

        }
    }
};

module.exports = File;

