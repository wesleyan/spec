var db = require('./../modules/db.js');

var cache = require('memory-cache');

module.exports = function(req, res) {
	//console.log('Req for seeing today\'s events list');
		var today;
		if(req.query.date) {
			try {
				today = new Date(req.query.date);
			} catch(e) {
				res.send(false);
				return false;
			}
		} else {
			today = new Date();
			dateString = (new Date()).toDateString();
		}
		today.setHours(0,0,0,0);
	var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

	db.events.find({start: {$gte: today, $lt: tomorrow}, cancelled:false}).sort({start: 1},
		function(err, data) {
				res.render('printtoday', {
					'events': data,
					'dateString': today.toDateString(),
					'Utility': Utility
				});
		});
}