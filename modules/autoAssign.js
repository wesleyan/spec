/*
This is a hacky module for auto assigning staff to certain events that happen often.
The function below maps the events array that are later on directly added to events database.
If there should be no auto assign tasks, the function should just return the event object.
*/

var mongo = require('mongodb-wrapper');

module.exports = function(event) {
	if(event.title === 'Luncheon: Division III NSM Luncheon') {
		event.shifts.push({
			id: new mongo.ObjectID(),
			start: event.start,
			end: event.end,
			staff: 'hflores'
		});
	}

	return event;
};