var fs = require('fs');
var parser = require('xml2json');

var xml = fs.readFileSync('Copy of IMS for Export.xml');
var json = parser.toJson(xml,{
	object: true,
	trim: true,
	arrayNotation: true
});
json = json['CopyofIMSforExport']['Data'];

var express = require('express');

var app = express();

app.get("/", function(req, res) {
	//req.url
	console.log("Req " + req.url);
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	res.write(JSON.stringify(json).toString("utf-8"));
	res.end();
});

app.listen(2000);
console.log('Listening on port 2000');