var _ = alp._;



module.exports = function(opt, cssCb) {
	var result = {},
		_result;
	if (_.isJsFile(opt.src)) {
		return alp.jsParse(opt, cssCb);
	} else if(_.isTextFile(opt.src)){
		return alp.txtParse(opt);
	}
	else{
		return {};
	}

}