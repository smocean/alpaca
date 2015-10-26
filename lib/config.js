var CONFIG = {
	ns: "alp",
	exclude: [],
	include: [],
	main:[],
	
	base: process.cwd(),
	word: 'require',
	readCss: true
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
		this.config[key] = value;
	},
	get: function(key) {
		return this.config[key];
	},
	merge: function(config) {
		this.config = merge(this.config,config);
	}
}

module.exports = new Config({});

module.exports.Config = Config;