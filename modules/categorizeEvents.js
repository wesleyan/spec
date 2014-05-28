var moment = require('moment-range');

var bLocations = [
  /\bBeckham Hall\b/gi,
  /\bDaniel Family Commons\b/gi
];

var bEventKeywords = [
   /\bPA\b/g,
   /\bspeakers\b/gi,
   /\bmicrophones\b/gi,
   /\btable top\b/gi,
   /\btable-top\b/gi
];


var cEventKeywords = [
   /\bwebcast\b/gi,
   /\bweb-cast\b/gi,
   /\blive streaming\b/gi,
   /\blive-streaming\b/gi,
   /\bbroadcast\b/gi
];

// hasKeywords(keywords, text) = true or false
// keywords are an array of regular expressions, text is a string
var hasKeywords = function (keywords, text) {
  return keywords.reduceRight(function (init, regexp) {
    return init || regexp.test(text);
  }, false);
};

// detectCategory(event) = returns "A", "B" or "C"
var detectCategory = function (event) {
  event.category = "A";

  //B event detection
  if(hasKeywords(bEventKeywords, event.desc)) {
    event.category = "B";
  }

  // set to B if in specific locations
  if(hasKeywords(bLocations, event.desc)) {
    event.category = "B";
  }

  //C event detection
  if(hasKeywords(cEventKeywords, event.desc)) {
    event.category = "C";
  }

  // Check if before 9am or after 10pm
  var at9am = moment(event.start).hours(9).minutes(0);
  var at10pm = moment(event.end).hours(22).minutes(0);

  if(moment(event.start).isBefore(at9am) || moment(event.end).isAfter(at10pm)) {
    event.category = "C";
  }

  return event.category;
};

module.exports = function(event) {
  event.category = detectCategory(event);
	return event;
};
