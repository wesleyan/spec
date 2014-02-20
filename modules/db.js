var Preferences = require('./../config/Preferences.js');

module.exports = require("mongojs").connect(Preferences.databaseUrl, Preferences.collections);