var User      = require('./../modules/user.js'),
    Utility   = require('./../modules/Utility.js'),
    db        = require('./../modules/db.js');

var mongo     = require('mongojs'),
    cache     = require('memory-cache'),
    _         = require('underscore');

module.exports = {
    db: {
      interface: function(req, res) {
        User.permissionControl(req, res, 10);
        res.render("inventoryDatabase", {app: req.app});
      },
      get: function(req, res) {
        res.json(cache.get('allInventory'));
      },
      post: function(req, res) {
        User.permissionControl(req, res, 10);

        var nextId = _.max(cache.get('allInventory'), function(item){return item.id;}).id;
        var obj = req.body;
        obj.id = nextId + 1;
        if(_(obj).has('price')) {
          obj.price = parseInt(obj.price);
        }
        db.inventory.save(obj, function(err, saved) {
          if(err || !saved) {
            res.status(400).json(false);
            return false;
          }
          res.json(saved);
          Utility.updateCachedInventory();
        });
      },
      patch: function(req, res) {
        User.permissionControl(req, res, 10);

        var change = req.body;
        if(_(change).has('price')) {
          change.price = parseInt(change.price);
        }
        db.inventory.findAndModify({
            query: {_id: mongo.ObjectId(req.params.id)},
            update:{$set: change},
            new: false
          },
          function(err, updated) {
            if(err || !updated) {
              res.status(400).json(false);
              return false;
            }
            res.json(updated);
            Utility.updateCachedInventory();
        });
      },
      delete: function(req, res) {
        User.permissionControl(req, res, 10);

        db.inventory.remove({_id: mongo.ObjectId(req.params.id)}, function(err, saved) {
          if(err || !saved) {
            res.status(400).json(false);
            return false;
          }
          res.json(true);
          Utility.updateCachedInventory();
        });
      }
    }
};
