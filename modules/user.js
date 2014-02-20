var User = {
	getUser: function(req) {
		return req.session.cas_user;
	},
	permission: function(req) { //returns the permission level of the user in session
		var userObj = $.grep(app.locals.storeStaff, function(e){ return e.username == getUser(req); });
		if(userObj.length < 1) {
			return false;
		} else {
			return userObj[0].level;
		}
	}
}

module.exports = User;