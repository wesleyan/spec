var Utility	 = require('./../modules/Utility.js'),
	db 	 	 = require('./../modules/db.js');
	
var _	 	 = require('underscore');

module.exports = {
	events: function (req, res) {
		try {
			//Allows to set the starting time
			if(req.query.start) {
				var start = new Date(req.query.start * 1000);
			} else {
				//just now if not set
				var start = new Date();
			}

			//Allows to set the ending time
			if(req.query.end) {
				var end = new Date(req.query.end * 1000);
			} else {
				var end = new Date();
				end.setTime(start.getTime() + (30 * 60 * 1000));
			}

			//Shows the events starting in next given number of minutes
			if(req.query.minutes) {
				var start = new Date();
				var end = new Date();
				end.setTime(start.getTime() + (parseInt(req.query.minutes) * 60 * 1000));
			}
		} catch(e) {
			return false;
		}
		if(typeof req.query.filter == 'undefined') {
			req.query.filter = 'hideCancelled';
		}
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
			case 'video':
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
				res.json(events);
				res.end();
			}
		});

		//req.url
		//console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
	  return;
	}
}