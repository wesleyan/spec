var User      = require('./../modules/user.js'),
    db        = require('./../modules/db.js');
    
var _         = require('underscore'),
    mongo     = require('mongojs');

module.exports = {
    existing: function(req, res) {
        
        //console.log("Req for fetching notes of Event ID " + req.params.id);
        //Event filtering and inventory
        db.events.find({_id: mongo.ObjectId(req.params.id)}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found: " + err);
            } else {
                res.json(events[0].notes);
            }
        });
    },
    add: function(req, res) { //post
        
        //console.log("Req for adding note \"" + req.body.note + "\" to Event ID " + req.body.eventid);
        var generatedID = mongo.ObjectId();
        db.events.update(
            {_id: mongo.ObjectId(req.body.eventid)},
            { $addToSet: {'notes': {'id': generatedID, 'text': req.body.note,'user': User.getUser(req), 'date': new Date()}} }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Note not added:" + err);
                } else {
                    //console.log("Note added");
                    res.json({'id':generatedID.toString(), 'user':User.getUser(req)});
                }
            });
    },
    remove: function(req, res) {
        //managers should be able to delete any comment, others should only be able to delete their own
        
        //console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
        var deleteNote = function() {
            db.events.update(
                {_id: mongo.ObjectId(req.body.eventid)},
                { $pull: {'notes': {'id': mongo.ObjectId(req.body.id)} } }, 
                function(err, updated) {
                    if (err || !updated) {
                        console.log(req.url);
                        console.log("Note not removed:" + err);
                    } else {
                        //console.log("Note removed");
                        res.json(true);
                    }
                });
        };
        if(User.permission(req) == 10) { //remove the note if it's a manager
            deleteNote();
        } else {
            db.events.find({_id: mongo.ObjectId(req.body.eventid)}, function(err, events) {
                if (err || !events) {
                    console.log(req.url);
                    console.log(err);
                } else if(events.length < 1) {
                    console.log("No such note/event found");
                } else {
                    var theNote = _.findWhere(events[0].notes, {_id: req.body.id});
                    if(theNote.user == User.getUser(req)) {
                        deleteNote();
                    } else {
                        res.json(false);
                        return false;
                    }
                }
            });
        }
    }
};
