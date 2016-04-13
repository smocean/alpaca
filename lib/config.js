var CONFIG = {

    // 生成闭包的命名空间
    ns: 'ns',

    // 项目的根目录
    root: process.cwd(),

    // 排除一些已存在的使用require关键字的文件，比如用webpack或browerify打包的文件。
    exclude: [],

    // 命中的文件才会做模块分析。
    include: [],

    // 排除一些文本类型
    excludeTxtType: [],

    // 扩展已有的文本类型['txt','js']
    txtType: [],

    // 分析的文件是否是被压缩过的文件
    isOptimizer: false,

    // js文件中的出现require()的路径是否是基于root的（主要用于应对使用构建工具生成的文件，路径会被编译为基于项目root的相对路径，如fis）
    fileBasedRoot: true,

    // 分析依赖时所识别的关键字
    word: 'require',

    // 是否对html中的js代码添加闭包代码, 如果代码中的require参与运算的话，就忽略该值，为代码加上闭包。
    wrapJsInHtml: false,

    readable: {

        // 使用requrie('../xx.css')时，是否是读取css的内容
        css: false,

        // 在HTML文件的script标签使用require('../xx.css')是，是否读取css的内容 (已废弃)
        cssInHTML: false
    },
    tmpl: {
        js: '<script type="text/javascript" src="{0}"></script>',
        css: '<link rel="stylesheet" type="text/css" href="{0}">'
    }
};

function merge(source, target) {
    if (typeof source === 'object' && typeof target === 'object') {
        for (var key in target) {
            if (target.hasOwnProperty(key)) {
                source[key] = merge(source[key], target[key]);
            }
        }
    } else {
        source = target;
    }
    return source;
}

function Config(config) {
    if(Config.instance instanceof Config) {
        return Config.instance;
    }
    this.config = merge(config, CONFIG);

    Config.instance = this;
}

Config.prototype = {
    set: function(key, value) {
        if (typeof value !== 'undefined') {

            key = String(key || '').trim();
            if (key) {
                var paths = key.split('.'),
                    last = paths.pop(),
                    data = this.config || {};
                paths.forEach(function (key) {
                    var type = typeof data[key];
                    if (type === 'object') {
                        data = data[key];
                    } else if (type === 'undefined') {
                        data = data[key] = {};
                    } else {
                        alp.log.error('forbidden to set property[' + key + '] of [' + type + '] data');
                    }
                });
                data[last] = value;
            }
        }
    },
    get: function(keyPath) {
        var keys = keyPath.split('.'),
            key,
            config = this.config;
        for (var i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            if (i == len - 1) {
                return config[key];
            } else if (key in config) {
                config = config[key];
            } else {
                return;
            }
        }
    },
    merge: function(config) {
        this.config = merge(this.config, config);
    }
}

module.exports = new Config({});

module.exports.Config = Config;