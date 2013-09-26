//New NED

var express = require('express');

var app = express();
var path = require('path');

var date = new Date();
var diff = date.getTimezoneOffset()/60;

var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();

var color = {
	'green':'#097054',
	'red':'#9E3B33'
}

var events = [
				{
					id: 1,
					title: 'Luncheon: Division III NSM Luncheon',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 9-diff, 45),
					end: new Date(y, m, d, 13-diff, 30),
					backgroundColor: color.green
				},
				{
					id: 2,
					title: 'Reception: Prof. F. Reeve Memorial & Reception',
					start: new Date(y, m, d, 13-diff, 0),
					end: new Date(y, m, d, 18-diff, 0),
					backgroundColor: '#097054'
				},
				{
					id: 3,
					title: '<i class="icon-facetime-video icon-white"></i> Dance Presentation',
					start: new Date(y, m, d, 13-diff, 15),
					end: new Date(y, m, d, 14-diff, 30),
					backgroundColor: '#097054'
				},
				{
					id: 4,
					title: 'Meeting',
					start: new Date(y, m, d+1, 10-diff, 30),
					backgroundColor:color.red
				},
				{
					id: 5,
					title: 'Lunch',
					start: new Date(y, m, d, 12, 0),
					end: new Date(y, m, d, 14, 0),
					backgroundColor:'#E48743'
				},
				{
					id: 6,
					title: 'Birthday Party',
					start: new Date(y, m, d+1, 19-diff, 0),
					end: new Date(y, m, d+2, 2-diff, 30),
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
	//86400s = 1d
	var start = new Date(req.query.start*1000);
	var end = new Date(req.query.end*1000);
	//req.url
    console.log("New request for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
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