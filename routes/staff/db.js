var Utility  = require('./../../modules/Utility.js'),
    User     = require('./../../modules/user.js'),
    db       = require('./../../modules/db.js');
    
var _          = require('underscore'),
    mongo      = require('mongojs');
    
module.exports = {
    db: function(req, res) {
        User.permissionControl(req, res, 10);
        res.render('staffDatabase', {app: req.app});
    },
    add: function (req, res) {
        User.permissionControl(req, res, 10);

        //raw data from the front end is modified a bit to fit the format
        var toAdd = req.body;
        toAdd.class_year = parseInt(toAdd.class_year);
        toAdd.level = parseInt(toAdd.level);
        toAdd.phone = parseInt(toAdd.phone);
        toAdd.professional = !!parseInt(toAdd.professional);
        toAdd.trainee = !!parseInt(toAdd.trainee);
        toAdd.task = toAdd.task.split(',').map(function(x) {return x.trim();});
        toAdd.strikes = [];
        toAdd.onCampus = true;

        db.staff.find({'username': toAdd.username}, function(err, data) {
            if (err || !data) {
                console.log("Staff not added to database:" + err);
            } else {
                if(data.length < 1) {
                    //add toAdd to the database now
                    db.staff.save(toAdd, function(err, saved) {
                        if (err || !saved) {
                            console.log("Staff not added to database:" + err);
                        } else {
                            Utility.updateCachedUsers();
                            res.json(true);
                        }
                    });
                } else {
                    //this staff exists in the database
                    res.json({errors:'A staff with this user name already exists in the database.'});
                }
            }
        });
    },
    delete:function (req, res) {
        User.permissionControl(req, res, 10);
        
        //req.body.id is the _id in the database
        db.staff.remove(
            {'_id': mongo.ObjectId(req.body.id)},
            function(err, removed) {
                if (err || !removed) {
                    console.log("Staff could not be deleted:" + err);
                    console.log(event.title);
                } else {
                    Utility.updateCachedUsers();
                    res.json(true);
                }
        });
    },
    update: function (req, res) {
        User.permissionControl(req, res, 10);
        //req.body.id is the _id in the database
        //req.body.what is the update query
        if(req.body.what.level) {
            req.body.what.level = parseInt(req.body.what.level);
        }
        if(req.body.what.phone) {
            req.body.what.phone = parseInt(req.body.what.phone);
        }
        if(req.body.what.class_year) {
            req.body.what.class_year = parseInt(req.body.what.class_year);
        }
        if(req.body.what.professional) {
            req.body.what.professional = JSON.parse(req.body.what.professional);
        }
        if(req.body.what.trainee) {
            req.body.what.trainee = JSON.parse(req.body.what.trainee);
        }
        if(req.body.what.isWorking) {
            req.body.what.isWorking = JSON.parse(req.body.what.isWorking);
        }
        if(req.body.what.strikes) {
          if(req.body.what.strikes === 'false') {
             req.body.what.strikes = [];
          }
          req.body.what.strikes = req.body.what.strikes.map(function(x) {
              x.date = new Date(x.date);
              return x;
          });
        }

        db.staff.update( 
            {'_id': mongo.ObjectId(req.body.id)},
            { $set: req.body.what }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Staff not updated in database:" + err);
                } else {
                    Utility.updateCachedUsers();
                    res.json(true);
                }
        });
    }
};
