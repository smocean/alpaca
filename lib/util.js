var fs = require('fs');
var pth = require('path');

var iconv;
var toString = Object.prototype.toString;
var _exists = fs.existsSync || pth.existsSync;
var isWin = process.platform.indexOf('win') === 0;

var crypto = require('crypto');

var TEXT_FILE_EXTS = [
    'css', 'tpl', 'js', 'php',
    'txt', 'json', 'xml', 'htm',
    'text', 'xhtml', 'html', 'md',
    'conf', 'po', 'config', 'tmpl',
    'coffee', 'less', 'sass', 'jsp',
    'scss', 'manifest', 'bak', 'asp',
    'tmp', 'haml', 'jade', 'aspx',
    'ashx', 'java', 'py', 'c', 'cpp',
    'h', 'cshtml', 'asax', 'master',
    'ascx', 'cs', 'ftl', 'vm', 'ejs',
    'styl', 'jsx', 'handlebars'
];

var NO_SUPPORT_EXTS = [
    'svg', 'tif', 'tiff', 'wbmp',
    'png', 'bmp', 'fax', 'gif',
    'ico', 'jfif', 'jpe', 'jpeg',
    'jpg', 'woff', 'cur', 'webp',
    'swf', 'ttf', 'eot', 'woff2'
];

var _ = module.exports = {};

_.exists = _exists;

_.fs = fs;

_.path = pth;

function __(path) {
    var type = typeof path;
    if (arguments.length > 1) {
        path = Array.prototype.join.call(arguments, '/');
    } else if (type === 'string') {
        //do nothing for quickly determining.
    } else if (type === 'object') {
        path = Array.prototype.join.call(path, '/');
    } else if (type === 'undefined') {
        path = '';
    }
    if (path) {
        path = pth.normalize(path.replace(/[\/\\]+/g, '/')).replace(/\\/g, '/');
        if (path !== '/') {
            path = path.replace(/\/$/, '');
        }
    }
    return path;
};



function getIconv() {
    if (!iconv) {
        iconv = require('iconv-lite');
    }
    return iconv;
}

function getTxtType() {
    var txtType;

    txtType = alp.config.get('txtType') || [];

    if (_.is(txtType, 'string')) {
        txtType = txtType.split(',');
    }
    if (_.is(txtType, 'array')) {
        return TEXT_FILE_EXTS.concat(txtType);
    }
    alp.log.error('Configuration parameter "txtType" can only be string or array')
}

function getExcludeType() {
    var type;
    type = alp.config.get('excludeTxtType') || [];
    if (_.is(type, 'string')) {
        type = type.split(',');
    }
    if (_.is(type, 'array')) {
        return NO_SUPPORT_EXTS.concat(type);
    }
    alp.log.error('Configuration parameter "excludeTxtType" can only be string or array')

}

function getFileTypeReg(type, ext) {
    var map = [];

    ext = ext || [];
    if (type === 'text') {
        map = getTxtType();
    } else {
        alp.log.error('invalid file type [' + type + ']');
    }
    if (ext && ext.length) {
        if (typeof ext === 'string') {
            ext = ext.split(/\s*,\s*/);
        }
        map = map.concat(ext);
    }
    map = map.join('|');
    return new RegExp('\\.(?:' + map + ')$', 'i');
}

_.unix = __;

_.isTextFile = function(path, ext) {

    var map, regExp;

    ext = ext || [];



    map = getTxtType();

    if (ext && ext.length) {
        if (typeof ext === 'string') {
            ext = ext.split(/\s*,\s*/);
        }
        map = map.concat(ext);
    }
    map = map.join('|');

    regExp = new RegExp('\\.(?:' + map + ')$', 'i');

    return regExp.test(path || '') && !_.inExcludeType(path, ext);
}
_.inExcludeType = function(path, ext) {

    var map, regExp;

    ext = ext || [];

    map = getExcludeType();

    if (ext && ext.length) {
        if (typeof ext === 'string') {
            ext = ext.split(/\s*,\s*/);
        }
        map = map.concat(ext);
    }
    map = map.join('|');

    regExp = new RegExp('\\.(?:' + map + ')$', 'i');

    return regExp.test(path || '');

}

_.isJsFile = function(path) {
    return _.extname(path) === 'js'
}

_.isLikeCss = function(path){
    var ext = _.extname(path);
    if(['scss','css','less','sass','styl'].indexOf(ext)>=0){
        return true;
    }
    return false;
}

_.extname = function(path) {
    return _.path.extname(path).toLocaleLowerCase().replace('.', '');
}

_.is = function(source, type) {
    return toString.call(source).toLocaleLowerCase() === ('[object ' + type + ']').toLocaleLowerCase();
};
_.map = function(obj, callback, merge) {
    var index = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (merge) {
                callback[key] = obj[key];
            } else if (callback(key, obj[key], index++)) {
                break;
            }
        }
    }
};
_.merge = function(source, target, deep) {
    if ((_.is(source, 'Object') || _.is(source, 'function')) && (_.is(target, 'Object') || _.is(target, 'function'))) {
        _.map(target, function(key, value) {
            source[key] = _.merge(source[key], value, deep);
        });
    } else if (deep && _.is(source, 'array') && _.is(target, 'array')) {

        for (var i = 0, len = target.length; i < len; i++) {

            if (source.indexOf(target[i]) < 0) {

                source.push(target[i]);
            }
        }
    } else {
        source = target;
    }
    return source;
};

_.clone = function(source) {
    var ret;
    switch (toString.call(source)) {
        case '[object Object]':
            ret = {};
            _.map(source, function(k, v) {
                ret[k] = _.clone(v);
            });
            break;
        case '[object Array]':
            ret = [];
            source.forEach(function(ele) {
                ret.push(_.clone(ele));
            });
            break;
        default:
            ret = source;
    }
    return ret;
};

_.isFile = function(path) {
    return _exists(path) && fs.statSync(path).isFile();
};

_.isDir = function(path) {
    return _exists(path) && fs.statSync(path).isDirectory();
};

_.realpath = function(path) {


    if (path && _exists(path)) {
        path = fs.realpathSync(path);
        return path;
    } else {

        return false;
    }
};

_.ext = function(str) {
    var info = _.query(str),
        pos;
    str = info.fullname = info.rest;
    if ((pos = str.lastIndexOf('/')) > -1) {
        if (pos === 0) {
            info.rest = info.dirname = '/';
        } else {
            info.dirname = str.substring(0, pos);
            info.rest = info.dirname + '/';
        }
        str = str.substring(pos + 1);
    } else {
        info.rest = info.dirname = '';
    }
    if ((pos = str.lastIndexOf('.')) > -1) {
        info.ext = str.substring(pos).toLowerCase();
        info.filename = str.substring(0, pos);
        info.basename = info.filename + info.ext;
    } else {
        info.basename = info.filename = str;
        info.ext = '';
    }
    info.rest += info.filename;
    return info;
};

_.pathinfo = function(path, root) {
    root = root || alp.config.get('base');

    path = _.realpath(_.path.resolve(root, path));
    return {
        dirname: _.path.dirname(path),
        basename: _.path.basename(path),
        fullname: path,
        ext: _.path.extname(path),
        rext: _.extname(path),
        relname: _.path.relative(root, path)
    }
};
_.realpathSafe = function(path) {
    return _.realpath(path) || __(path);
}

_.mkdir = function(path, mode) {
    if (typeof mode === 'undefined') {
        //511 === 0777
        mode = 511 & (~process.umask());
    }
    if (_exists(path)) return;
    path.split('/').reduce(function(prev, next) {
        if (prev && !_exists(prev)) {
            fs.mkdirSync(prev, mode);
        }
        return prev + '/' + next;
    });
    if (!_exists(path)) {
        fs.mkdirSync(path, mode);
    }
};

_.read = function(path) {
    var content = false;
    if (_exists(path)) {
        content = fs.readFileSync(path);

    } else {
        alp.log.error('unable to read file[' + path + ']: No such file or directory.');
    }
    return content;
};
_.write = function(path, data, charset, append) {
    if (!_exists(path)) {
        _.mkdir(_.path.dirname(path));
    }
    if (charset) {
        data = getIconv().encode(data, charset);
    }
    if (append) {
        fs.appendFileSync(path, data, null);
    } else {
        fs.writeFileSync(path, data, null);
    }
};
_.readJSON = function(path) {
    var buffer = _.read(path),
        result = {},
        content = _.readBuffer(buffer);
    try {
        result = JSON.parse(content);
    } catch (e) {
        alp.log.error('parse json file[' + path + '] fail, error [' + e.message + ']');
    }
    return result;
}
_.readBuffer = function(buffer) {
    if (_.isUtf8(buffer)) {
        buffer = buffer.toString('utf8');
        if (buffer.charCodeAt(0) === 0xFEFF) {
            buffer = buffer.substring(1);
        }

    } else {
        buffer = getIconv().decode(buffer, 'gbk');
    }
    return buffer;
}

_.isUtf8 = function(bytes) {
        var i = 0;
        while (i < bytes.length) {
            if (( // ASCII
                    0x00 <= bytes[i] && bytes[i] <= 0x7F
                )) {
                i += 1;
                continue;
            }

            if (( // non-overlong 2-byte
                    (0xC2 <= bytes[i] && bytes[i] <= 0xDF) &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF)
                )) {
                i += 2;
                continue;
            }

            if (
                ( // excluding overlongs
                    bytes[i] == 0xE0 &&
                    (0xA0 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                ) || ( // straight 3-byte
                    ((0xE1 <= bytes[i] && bytes[i] <= 0xEC) ||
                        bytes[i] == 0xEE ||
                        bytes[i] == 0xEF) &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                ) || ( // excluding surrogates
                    bytes[i] == 0xED &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x9F) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
                )
            ) {
                i += 3;
                continue;
            }

            if (
                ( // planes 1-3
                    bytes[i] == 0xF0 &&
                    (0x90 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                    (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                ) || ( // planes 4-15
                    (0xF1 <= bytes[i] && bytes[i] <= 0xF3) &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                    (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                ) || ( // plane 16
                    bytes[i] == 0xF4 &&
                    (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x8F) &&
                    (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                    (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
                )
            ) {
                i += 4;
                continue;
            }
            return false;
        }
        return true;
    }
    /*
     *数组或对像是不是空
     */
_.isEmpty = function(obj) {
    if (obj === null) return true;
    if (_.is(obj, 'Array')) return obj.length == 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true
};
/*是不是原生Object*/
_.isPlainObject = function(obj) {
    return _.is(obj, 'object') && Object.getPrototypeOf(obj) == Object.prototype;
};
/*
 *遍历指定的目录
 */
_.forEachDir = function(dir, callback) {
    var result = [];
    if (!_.isDir(dir)) {
        return result;
    }
    (function(dir) {
        var files = fs.readdirSync(dir),
            file, path, isDir;

        for (var i = 0, len = files.length; i < len; i++) {

            path = _.path.resolve(dir, files[i]);

            callback(path);

            if (_.isDir(path)) {
                arguments.callee.call(this, path);
            }


        }
    }(dir));
}
_.filter = function(str, list) {

    function normalize(pattern) {
        var type = toString.call(pattern);
        switch (type) {
            case '[object String]':
                return _.glob(pattern);
            case '[object RegExp]':
                return pattern;
            default:
                alp.log.error('invalid regexp [' + pattern + '].');
        }
    }

    function match(str, patterns) {
        var matched = false;
        if (!_.is(patterns, 'Array')) {
            patterns = [patterns];
        }
        patterns.every(function(pattern) {
            if (!pattern) {
                return true;
            }

            matched = matched || str.search(normalize(pattern)) > -1;
            return !matched;
        });
        return matched;
    }

    if (_.isEmpty(list)) {
        list = null;
    }

    return match(str, list);
};
_.filter1 = function (str, include, exclude) {
    var isInclude, isExclude;

    if (_.is(include, 'array') && _.isEmpty(include)) {
        include = null;
    }

    if (_.is(exclude, 'array') && _.isEmpty(exclude)) {
        exclude = null;
    }

    if (include) {
        isInclude = _.filter(str, include);
    } else {
        isInclude = true;
    }

    if (exclude) {
        isExclude = _.filter(str, exclude);
    }

    return isInclude && !isExclude;

};
_.find = function(rPath, include, root) {
    var list = [],
        path = _.realpath(rPath),
        filterPath = root ? path.substring(root.length) : path;
    if (path) {
        var stat = fs.statSync(path);
        if (stat.isDirectory() && (include || _.filter(filterPath, include))) {
            fs.readdirSync(path).forEach(function(p) {
                if (p[0] != '.') {
                    list = list.concat(_.find(path + '/' + p, include, exclude, root));
                }
            });
        } else if (stat.isFile() && _.filter(filterPath, include)) {
            list.push(path);
        }
    } else {
        alp.log.error('unable to find [' + rPath + ']: No such file or directory.');
    }
    return list.sort();
};
_.glob = function(pattern, str) {
    var sep = _.escapeReg('/');
    pattern = new RegExp('^' + sep + '?' +
        _.escapeReg(
            pattern
            .replace(/\\/g, '/')
            .replace(/^\//, '')
        )
        .replace(new RegExp(sep + '\\*\\*' + sep, 'g'), sep + '.*(?:' + sep + ')?')
        .replace(new RegExp(sep + '\\*\\*', 'g'), sep + '.*')
        .replace(/\\\*\\\*/g, '.*')
        .replace(/\\\*/g, '[^' + sep + ']*')
        .replace(/\\\?/g, '[^' + sep + ']') + '$',
        'i'
    );
    if (typeof str === 'string') {
        return pattern.test(str);
    } else {
        return pattern;
    }
};
_.escapeReg = function(str) {
    return str.replace(/[\.\\\+\*\?\[\^\]\$\(\){}=!<>\|:\/]/g, '\\$&');
};
_.getAllFiles = function(dir, ext, exclude, callback, dirCallback) {
    var files = [];
    ext = ext.replace('.', '');

    exclude = exclude || [];
    if (_.isDir(dir)) {

        ! function(dir) {
            var _files = _.fs.readdirSync(dir),
                _path, npath

            for (var i = 0, len = _files.length; i < len; i++) {



                _path = _.path.resolve(dir, _files[i]);

                if (_.isFile(_path) && (_.extname(_path) === ext || ext === '')) {
                    files.push(_path);
                    _.is(callback, 'function') && callback(dir, _path);
                } else if (_.isDir(_path)) {

                    if (exclude.indexOf(_path) >= 0) {
                        continue;
                    }

                    _.is(dirCallback, 'function') && dirCallback(dir, _path);

                    try {
                        arguments.callee.call(this, _path);
                    } catch (e) {

                    }



                }

            }
        }(dir);
    }
    return files;


};

_.mtime = function(path){
    var time = 0;
    if(_exists(path)){
        time = fs.statSync(path).mtime;
    }
    return time;
};

_.isAbsolute = function (path) {
    if (!isWin) {
        return /^\/.*/i.test(path);
    } else {
        return /^[a-z]:.*/i.test(path);
    }
};

_.md5 = function (data, len) {
    var md5sum = crypto.createHash('md5'),
        encoding = typeof data === 'string' ? 'utf8' : 'binary';

    md5sum.update(data, encoding);
    len = len || alp.config.get('md5Length') || 7;
    return md5sum.digest('hex').substring(0, len);
};



