//New NED

var express = require('express');

var app = express();
var path = require('path');

var date = new Date();
var diff = date.getTimezoneOffset()/60;

var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();

var events = [
				{
					id: 999,
					title: 'Luncheon: Division III NSM Luncheon',
					start: new Date(y, m, d, 9-diff, 45),
					end: new Date(y, m, d, 13-diff, 30),
					backgroundColor: '#097054'
				},
				{
					id: 999,
					title: 'Reception: Prof. F. Reeve Memorial & Reception',
					start: new Date(y, m, d, 13-diff, 0),
					end: new Date(y, m, d, 18-diff, 0),
					backgroundColor: '#097054'
				},
				{
					id: 999,
					title: 'Dance Presentation',
					start: new Date(y, m, d, 13-diff, 15),
					end: new Date(y, m, d, 14-diff, 30),
					backgroundColor: '#097054'
				},
				{
					title: 'Meeting',
					start: new Date(y, m, d+1, 10-diff, 30),
					backgroundColor:'#9E3B33'
				},
				{
					title: 'Lunch',
					start: new Date(y, m, d, 12, 0),
					end: new Date(y, m, d, 14, 0),
					backgroundColor:'#E48743'
				},
				{
					title: 'Birthday Party',
					start: new Date(y, m, d+1, 19-diff, 0),
					end: new Date(y, m, d+1, 22-diff, 30),
					backgroundColor: '#666666'
					//url: 'http://google.com/'
				}
			];


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.get("/events", function(req,res) {
    console.log("New request for " + req.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(events).toString("utf-8"));
    res.end();
});

app.get('/', function (req, res) {
  res.render('index',
  { title : 'Home' }
  )
});

app.listen(8080);
console.log('Listening on port 8080');