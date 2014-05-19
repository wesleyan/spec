var Preferences = require('./../config/Preferences.js');

module.exports = require("promised-mongo").connect(Preferences.databaseUrl, Preferences.collections);