var CONFIG = {
	ns: "alp",
	exclude: [],//排除一些已存在的使用require关键字的文件，比如用webpack或browerify打包的文件。
	txtType: [],//扩展已有的文本类型['txt','js']
	cssMap:['scss','sass','less','styl'],
	excludeType:[],
	isJswrapperInHtml:true,
	main: {		//命令行时，指定的入口文件
		include: [],
		exclude: []
	},
	optimizer: true, //是否压缩文件
	base: process.cwd(), //指定项目的根路径
	useBaseInJsFile:false, //js文件中的出现require()的路径是否是基于base的（主要是对于FIS）
	word: 'require', 
	readcss: true, //出现在js中的css是否读取内容。
	readcssInHtml:false,//出现在html中的script标签中的css是否可读
	settings: {
		optimizer: {
			css: {
				processImport: false,
				keepSpecialComments: '*' //只对‘/*!我是注市有效*/’
			},
			js: {
				fromString: true
			}
		}
	}
}

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
	this.config = merge(config, CONFIG);
}


Config.prototype = {
	set: function(key, value) {
		if (typeof value !== 'undefined') {

			key = String(key || '').trim();
			if (key) {
				var paths = key.split('.'),
					last = paths.pop(),
					data = this.config || {};
				paths.forEach(function(key) {
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