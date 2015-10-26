var _ = alp._;


function getRegExp() {

	word = alp.config.get('word') || 'require';

	return new RegExp('@?\\b' + word + '\\b\\s*\\(\\s*[\'\"]{1}([^\'\"]+)[\'\"]{1}\\s*\\);*', 'gi');

}

module.exports = function(src, content) {
	var base = alp.config.get('base'),
		regExp, _content, dir,
		depsObj = {},
		deps = [];
	if (_.is(content, 'undefined')) {
		if (_.isFile(src) && _.extname(src) !== 'js') {

			content = _.read(src);
		} else {
			alp.log.error('unable to find [' + src + ']:No such file');
		}
	}

	dir = _.path.dirname(src);

	content = content.toString();

	regExp = getRegExp();

	_content = content.replace(regExp, function() {
		var args = [].slice.call(arguments, 0),
			raw = args[1],
			absUrl = _.path.resolve(dir, raw),
			relUrl = _.path.relative(base, absUrl);

		if (relUrl in depsObj) {
			return '';
		}
		depsObj[relUrl] = {
			absUrl: absUrl,
			url: relUrl,
			raw: raw
		};

		deps.push(relUrl);

		return '';


	});

	return {
		obj: depsObj,
		deps: deps,
		content: content
	}
}