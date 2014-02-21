var User      = require('./../modules/User.js'),
    db        = require('./../modules/db.js');
    
var mongo     = require('mongodb-wrapper'),
    cache     = require('memory-cache');

module.exports = {
    all: function(req, res) {
        
        //console.log("Req for all inventory");
        res.json(cache.get('allInventory'));
        res.end();
    },
    existing: function(req, res) {
        
        //console.log("Req for inventory of Event ID " + req.params.id);
        //Event filtering and inventory
        /*var selectedEvent = events.filter(function(event) {
            return event.id == req.params.id;
        })[0];*/
        db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, data) {
            if (err || !data) {
                console.log(req.url);
                console.log("No events found: " + err);
            } else {
                var existingList = [];
                data[0].inventory.forEach(function(id) {
                    existingList.push(cache.get('allInventory').filter(function(tool) {
                        return tool.id == id;
                    })[0]);
                });
                res.json(existingList);
                res.end();
            }
        });
    },
    add: function(req, res) {
        if(User.permission(req) < 1) {
            res.json(false);
            res.end();
            return false;
        }
        //console.log("Req for adding inventory ID " + req.body.inventoryid + " to Event ID " + req.body.eventid);
        //frontend checks for the same inventory adding, so no control needed for that
         //try to find the thing by its id and use the same data
        var selectedInventory = cache.get('allInventory').filter(function(thing) {
            return thing.id == req.body.inventoryid;
        })[0];
        
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $addToSet: {'inventory': req.body.inventoryid} }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Inventory not added:" + err);
                } else {
                    //console.log("Inventory added");
                    res.json(true);
                    res.end();
                }
            });
    },
    remove: function(req, res) {
        if(User.permission(req) < 1) {
            res.json(false);
            res.end();
            return false;
        }
        //console.log("Req for removing inventory ID " + req.body.inventoryid + " from Event ID " + req.body.eventid);
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $pull: {'inventory': req.body.inventoryid } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Inventory not removed:" + err);
                } else {
                    //console.log("Inventory removed");
                    res.json(true);
                    res.end();
                }
            });
    }
}