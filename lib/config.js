var CONFIG = {
	ns: "alp",
	exclude: [],
	
	main:{
		include:[],
		exclude:[]
	},
	
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
	get: function(keyPath) {
		var keys = keyPath.split('.'),
			key,
			config = this.config;
		for(var i = 0,len = keys.length;i<len;i++){
			key = keys[i];
			if(i == len-1){
				return config[key];
			}
			else if(key in config){
				config = config[key];
			}
			else{
				return;
			}
		}
	},
	merge: function(config) {
		this.config = merge(this.config,config);
	}
}

module.exports = new Config({});

module.exports.Config = Config;