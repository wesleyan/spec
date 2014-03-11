/*
This module is taken from https://github.com/zackrw/grand_master_cas
It is slightly modified because it was not working properly with Wesleyan CAS routes,
  but there are no other significant changes.
    ckorkut - 10/24/2013
*/
var http = require('http');
var https = require('https');

var GrandMasterCas = function(){
  this.configure = this.configure.bind(this);
  this.bouncer = this.bouncer.bind(this);
  this.blocker = this.blocker.bind(this);
  this.handler = this.handler.bind(this);
  this.handleTicket = this.handleTicket.bind(this);
  this.logout = this.logout.bind(this);
};

GrandMasterCas.prototype.configure = function(opts){
  if (!opts){
    console.log( 'please pass an object into configure' );
    opts = {};
  }

  this.casScheme = opts.ssl === true ? 'https' : 'http';
  this.ssl = !!opts.ssl;
  var defaultPort = opts.ssl === true ? 443 : 80;
  this.port = opts.casPort || defaultPort;
  this.casHost  = opts.casHost || '';
  this.casPath  = opts.casPath || '/cas';

  var service = opts.service || '';
  this.service = encodeURIComponent(service);
  this.sessionName = opts.sessionName || "cas_user";
  this.renew = !!opts.renew;
  this.gateway = !!opts.gateway;
  this.redirectUrl = opts.redirectUrl || '/';
};


GrandMasterCas.prototype.blocker = function(req, res, next){
  if (!this.redirectUrl) {
    throw new Error('GrandMasterCAS must have a redirectUrl');
  } else {
    this.handler(req, res, next, this.redirectUrl);
  }
};

GrandMasterCas.prototype.bouncer = function(req, res, next){
  var redirectUrl = [this.casScheme, '://',
                     this.casHost, ':', this.port,
                     this.casPath, '/login?service=',
                     this.service].join('');
  this.handler(req, res, next, redirectUrl);
};


GrandMasterCas.prototype.handler = function(req, res, next, redirectUrl){
  var sessionName = this.sessionName;

  if (req.session[sessionName]) {
    next();
  }
  else if (req.query && req.query.ticket) {
    this.handleTicket(req, res, next);
  }
  else {
    res.redirect(redirectUrl);
  }
};

GrandMasterCas.prototype.handleTicket = function( req, res, next ){
  var ticket = req.query.ticket;
  var sessionName = this.sessionName;
  var service = this.service;
  // First line below is the original module, second line is the one modified for Wesleyan CAS routes. -ckorkut
  //  var path = this.casPath + '/validate?service=' + service + '&ticket=' + ticket;
  var path = '/validate?service=' + service + '&ticket=' + ticket;

  var that = this;

  var request = https.request({
    host: this.casHost,
    path: path,
    method: 'GET'
  }, function(response){
    var buf = '';
    var redirectUrl;
    response.on('data', function(chunk){
      buf += chunk.toString('utf8');
    });
    response.on('end', function(){
      var results = buf.split('\n');
      if (results[0] === 'yes') {
        req.session[sessionName] = results[1];
        next();
      }
      else if (results[0] === 'no') {
        // thisBinding is lost here
        res.redirect(that.redirectUrl);
      }
      else {
        console.log('invalid response from CAS');
        console.log(results); //added for debugging -ckorkut
        console.log(path);    //added for debugging -ckorkut
      }
    });
    response.on('error', function(err){
      console.log('response error: ' + err);
    });
  });

  request.on( 'error', function(err){
    console.log( 'error: ' + err );
  });

  request.end();
};

GrandMasterCas.prototype.logout = function(req, res){
  var logoutUrl = [this.casScheme, '://',
                   this.casHost, ':', this.port,
                   this.casPath, '/logout'].join('');

  delete req.session[this.sessionName];
  // Doesn't destroy the whole session!
  res.redirect(logoutUrl);
};

module.exports = new GrandMasterCas();