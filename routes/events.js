var Utility	 = require('./../modules/Utility.js'),
	User 	 = require('./../modules/User.js'),
	db 	 	 = require('./../modules/db.js');
	
var _	 	 = require('underscore');

module.exports = {
	events: function(req, res) {
		//86400s = 1d
		var start = new Date(req.query.start * 1000),
			end = new Date(req.query.end * 1000),
			query = {};
		switch(req.query.filter) {
			case 'all':
				query = {};
				break;
			case 'hideCancelled':
				query = {cancelled: false};
				break;
			case 'unstaffed':
				query = {cancelled: false };
				break;
			case 'onlyMine':
				query = {shifts: { $elemMatch: { staff: User.getUser(req) } }};
				break;
			case 'recentVideo':
				query = {video: true};
				break;
			default:
				query = {};
		}
		$.extend(query, {'start': {$gte: start, $lt: end}});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found:" + err);
			} else {
				if(req.query.filter === 'unstaffed') {
					//filter them manually because empty shifts seem like real shifts
					events = _.filter(events, function (event) {
						return Utility.fullShiftNumber(event) < event.staffNeeded;
					});
				}
				events = Utility.addBackgroundColor(events);
				res.json(events);
				res.end();
			}
		});
		//console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());	
	}
};