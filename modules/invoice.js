var Preferences = require('./../../config/Preferences.js');

var Utility = require('./../../modules/Utility.js'),
    User    = require('./../../modules/user.js'),
    db      = require('./../../modules/db.js');

var fs      = require('fs'),
    _       = require('underscore'),
    mongo   = require('mongojs');


var phantom = require('phantom');

var createPdf = function(event, html, callback) {
  phantom.create(function(ph){
    ph.createPage(function(page) {
      page.open(Preferences.casOptions.service + 'billing/invoice/' + event._id, function (status) {
        page.set('paperSize', {format: 'A4'}, function() {
          var url = __dirname + '/temp/' + event._id + '.pdf';
          page.render(url, function(){
            callback(url);
            ph.exit();
          });
        });
      });
    });
  });
};

module.exports = {};
