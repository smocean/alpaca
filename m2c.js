var pargram = require('commander'),

	colors = require('colors'),

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
	_.write(conf_path, JSON.stringify(config));
}

word = config.m2c.word;

version = _.readJSON(_.path.resolve(__dirname, './package.json')).version;



function buildTag(path) {

	if (_.extname(path) === 'css') {
		return '<link rel="stylesheet" type="text/css" href="' + path + '">\n\r';
	} else {
		return '<script type="text/javascript" src="' + path + '"></script>\n\r';
	}

}


module.exports = function(argv) {

	var regExp, oDir, debug;

	pargram
		.option('-V,--version', 'version info', function() {

			console.log(version.bold.green);

		})
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
			console.time('');
			for (var i = 0, len = dirs.length; i < len; i++) {
				_.getAllFiles(_.path.resolve(base, dirs[i]), 'html', [output], function(dir, path) {
					var htmlObj = _.getTextDeps(path, {
						base: base,
						word: 'require'
					});
					var deps = htmlObj.deps;

					var dep, resultJs = {},
						resultCss = {},
						absUrl, key, content = htmlObj.content,

						outputHtmlPath = _.path.resolve(output, _.path.relative(base, path));

					process.stdout.write('.'.green);

					if (deps.length == 0) {

						_.write(outputHtmlPath, content, 'utf-8');
						return;

					}
					for (var i = 0, len = deps.length; i < len; i++) {
						dep = deps[i];

						if (_.extname(dep) != 'css' && _.extname(dep) !== 'js') {
							continue;
						}
						absUrl = _.path.resolve(base, dep);
						key = _.path.relative(base, absUrl);

						try {
							if (!(key in result)) {
								if (_.extname(absUrl) === 'css') {

									resultCss = _.merge(resultCss, _.parserTextDeps(absUrl, {
										base: base,
										word: word
									}));


									
									result = _.merge(result, resultCss);
								} else if (_.extname(absUrl) === 'js') {

									resultJs = _.merge(resultJs, _(absUrl, config.m2c));

									result = _.merge(result, resultJs);
								}
							}
						} catch (e) {
							console.log('\n\r'+e);
							process.abort();
						}

						name = _.path.basename(absUrl).replace('.', '[.]{1}');
						regExp = new RegExp('<!--\\s*\\b' + word + '\\b\\s*\\(\\s*[\'\"]{1}([^\'\"]+)(?=' + name + ')' + name + '\\s*[\'\"]{1}\\s*\\)\\s*-->', 'gi');
						content = content.replace(regExp, function() {
							var map = _.extname(key) === 'css' ? result[key].map : result[key].map.adeps;

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

						process.stdout.write('.'.green);
					}

					var absK, objK;
					for (var k in result) {
						absK = _.path.resolve(output, k);
						objK = result[k];
						!objK.writed && (_.write(absK, objK.content), process.stdout.write('.'.green));
						objK.writed = true;
					}

				});

			}

			console.timeEnd('');

		});

	pargram.parse(argv);


}