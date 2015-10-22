var fs = require('fs');
var path = require('path');

var alpaca = require('./lib/m2c');
var base = '/Users/gml/github/module2closure/';
try
{
var result = alpaca('/Users/gml/github/module2closure/demo/page/index.js',{
	base:base,
	ns:'gml',
	rdExt: [],
	exclude: ['/Users/gml/github/module2closure/demo/js/'],
});
}
catch(e){
	var t = e;
}
var _result = {};

var outputPath = path.resolve(__dirname,'../output1a');
if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
}
for (var fileKey in result) {
	
    var xx = path.join(__dirname,'../output1a',path.basename(fileKey));
    _result[fileKey] = result[fileKey].map;
    var fd = fs.openSync(xx,'w+');
        fs.writeSync(fd, result[fileKey].content, 0 , 'utf-8');
		fs.closeSync(fd);
    
}
var str = JSON.stringify(_result);
var _fd = fs.openSync(path.resolve(__dirname,'../output1a/map.json'),'w+');
fs.writeSync(_fd,str,0,'utf-8');
fs.closeSync(_fd);
