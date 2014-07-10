var User      = require('./../../modules/user.js');

var _         = require('underscore'),
    cache     = require('memory-cache');

module.exports = {
  main: function(req, res) {
      User.permissionControl(req, res, 10);
      res.render('billing', {app: req.app});
  },
  invoice: require('./invoice.js')
};
