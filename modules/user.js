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
            return false;
        }
    },
    gCalIsActive: function(req) {
        //returns true if the user has a registered refresh token
        var userObj = _.findWhere(cache.get('storeStaff'), {username: User.getUser(req)});
        return !_.isUndefined(userObj.refresh_token);
    }
};

module.exports = User;