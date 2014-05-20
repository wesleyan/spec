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
  if(hasKeywords(bEventKeywords, event.desc) {
    event.category = "B";
  }

  //C event detection
  if(hasKeywords(cEventKeywords, event.desc) {
    event.category = "C";
  }

  return event.category;
};

module.exports = function(event) {
  event.category = "A";
  //event.category = detectCategory(event);
	return event;
};
