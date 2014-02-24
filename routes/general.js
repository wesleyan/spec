var User      = require('./../modules/user.js');
    
var _         = require('underscore'),
    cache     = require('memory-cache');

module.exports = {
    main: function (req, res) {
        if(req.query.ticket) {
            res.redirect('/'); //redirect to the base if there is a ticket in the URL
        }
        var currentUser = _.findWhere(cache.get('storeStaff'), { 'username': User.getUser(req) });
        if(_.isUndefined(currentUser)) { //the user is not in the staff database
            res.render('notStaff', {cas_user: User.getUser(req)});
        } else {
            res.render('index', {
                username: currentUser.username,
                permission: currentUser.level,
                staffname: currentUser.name,
            });
        }
    },
    login: function(req, res) {
        res.redirect('/');
    },
    user: function(req, res) {
        //req.session.cas_user
        res.json({'username':User.getUser(req), 'permission':User.permission(req)});
        res.end();
    }
}