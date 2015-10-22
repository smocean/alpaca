var pargram = require('commander'),

	_ = require('./index.js'),

	base = process.cwd(),

	word,

	conf_path = _.path.resolve(base, './alp-conf.json'),

	version,

	config = {
		main: [],
		m2c: {
			word: 'require',
			ns: 'sm',
			base: base,
			exclude: [],
			readcss: false,
		}
	}

if (_.exists(conf_path)) {
	_.merge(config, _.readJSON(conf_path), true);

} else {
	_.write(conf_path, JSON.stringify(confi));
}

word = config.word;

version = _.readJSON(_.path.resolve(__dirname, './package.json')).version;



function buildTag(path) {

	if (_.extname(path) === 'css') {
		return '<link rel="stylesheet" type="text/css" href="' + path + '">\n\r';
	} else {
		return '<script type="text/javascript" src="' + path + '"></script>\n\r';
	}

}


module.exports = function(argv) {

	var regExp, oDir;

	pargram
		.version(version)
		.command('release')
		.description('analysis dependent and output')
		.option('-d,--dest <path>', 'output dir', function(path) {
			oDir = path;
		})
		.action(function() {
			var result = {},
				output = _.path.resolve(base, oDir || 'output'),

				dirs = config.main;

			if (dirs.length == 0) {
				dirs.push(base);
			}

			for (var i = 0, len = dirs.length; i < len; i++) {
				
					_.getAllFiles(_.path.resolve(base, dirs[i]), 'html', function(dir, path) {

						var htmlObj = _.getTextDeps(path, {
							base: base,
							word: 'require'
						});
						var deps = htmlObj.deps;

						var dep, resultJs = {},
							resultCss = {},
							absUrl, key, content = htmlObj.content,

							outputHtmlPath = _.path.resolve(output, _.path.relative(base, path));


						console.log('parsing	' + path);

						if (deps.length == 0) {

							_.write(outputHtmlPath, content, 'utf-8');

							console.log('writing	' + outputHtmlPath);

							return;

						}
						for (var i = 0, len = deps.length; i < len; i++) {
							dep = deps[i];

							absUrl = _.path.resolve(_.path.dirname(path), dep);


							key = _.path.relative(base, absUrl);
							if (!(key in result)) {
								if (_.extname(absUrl) === 'css') {
									resultCss = _.merge(resultCss, _.getTextDeps(absUrl, {
										base: base,
										word: word
									}));
									result = _.merge(result, resultCss);
								} else {
									try {
										resultJs = _.merge(resultJs, _(absUrl, config.m2c));
									}
									catch(e){
										console.dir(e);
										process.abort();
									}
									result = _.merge(result, resultJs);
								}
							}
							name = _.path.basename(absUrl).replace('.', '[.]{1}');
							regExp = new RegExp('<!--\\s*\\b' + word + '\\b\\s*\\(\\s*[\'\"]{1}([^\'\"]+)(?=' + name + ')' + name + '\\s*[\'\"]{1}\\s*\\)\\s*-->', 'gi');



							content = content.replace(regExp, function() {
								var map = result[key].map.adeps;

								var str = '';

								var relPath = '';

								for (var i = 0; i < map.length; i++) {
									relPathpath = _.path.relative(dir, map[i]);
									str += buildTag(relPathpath);
								}

								str += buildTag(_.path.relative(dir, key));

								return str;

							});
							_.write(outputHtmlPath, content, 'utf-8');

							console.log('writing	' + outputHtmlPath);
						}

						var absK, objK;
						for (var k in result) {
							absK = _.path.resolve(output, k);
							objK = result[k];

							!objK.writed && (_.write(absK, objK.content), console.log('writing	' + absK));
							objK.writed = true;
						}

					});
				
			}



		});

	pargram.parse(argv);


}