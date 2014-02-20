var cache = require('memory-cache');

var _ = require('underscore');

var User = {
	getUser: function(req) {
		return req.session.cas_user;
	},
	permission: function(req) { 
		//returns the permission level of the user in session
		var userObj = _.findWhere(cache.get('storeStaff'), {username: User.getUser(req)});
		if(_.isUndefined(userObj)) {
			return false;
		} else {
			return userObj.level;
		}
	},
	permissionControl: function(req, res, level) {
		if (User.permission(req) < level) {
			res.json(false);
			res.end();
			return false;
		}
	}
}

module.exports = User;