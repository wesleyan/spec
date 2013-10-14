var databaseUrl = "spec"; // "username:password@example.com/mydb"
var collections = ["staff"]
var db = require("mongojs").connect(databaseUrl, collections);
var mongo = require('mongodb-wrapper');

var staff = [{
	"username": "bmorgan",
	"level": 10,
	"phone": 8606851173,
	"name": "Brent M.",
	"text": 1,
	"class_year": 0
}, {
	"username": "hflores",
	"level": 10,
	"email": 0,
	"phone": false,
	"name": "Heric F.",
	"text": 0,
	"class_year": 0
}, {
	"username": "sshachat",
	"level": 10,
	"phone": 5044504913,
	"name": "Sarah H.",
	"text": 1,
	"class_year": 0
}, {
	"username": "jher",
	"level": 10,
	"phone": 8284613416,
	"name": "Judy H.",
	"text": 1,
	"class_year": 0
}, {
	"username": "kakoi",
	"level": 0,
	"phone": 8607595611,
	"name": "Kwaku A.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "sbarth",
	"level": 10,
	"phone": false,
	"name": "Sam B.",
	"text": 0,
	"class_year": 0
}, {
	"username": "tskim",
	"level": 10,
	"phone": 8605389580,
	"name": "Ted K.",
	"text": 0,
	"class_year": 2015
}, {
	"username": "elopez01",
	"level": 0,
	"phone": 3106132482,
	"name": "Eric L.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "jthall",
	"level": 3,
	"phone": 8609429342,
	"name": "James H.",
	"text": 0,
	"class_year": 2015
}, {
	"username": "llin01",
	"level": 3,
	"phone": 6468947380,
	"name": "Li L.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "eislo",
	"level": 3,
	"phone": 4146873311,
	"name": "Erik I.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "rfonticoba",
	"level": 3,
	"phone": false,
	"name": "Becky F.",
	"text": 0,
	"class_year": 0
}, {
	"username": "echon",
	"level": 10,
	"phone": false,
	"name": "Erica C.",
	"text": 0,
	"class_year": 0
}, {
	"username": "jnyange",
	"level": 0,
	"phone": false,
	"name": "Huong N.",
	"text": 0,
	"class_year": 0
}, {
	"username": "omay",
	"level": 0,
	"phone": 7033048805,
	"name": "Olivia M.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "mchang01",
	"level": 0,
	"phone": 9174068962,
	"name": "Megan C.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "jxu",
	"level": 0,
	"phone": 8607547378,
	"name": "Chelsea X.",
	"text": 1,
	"class_year": 0
}, {
	"username": "cmartinson",
	"level": 0,
	"phone": 8438170364,
	"name": "Christopher M.",
	"text": 1,
	"class_year": 2014
}, {
	"username": "lmunsil",
	"level": 3,
	"phone": 4805163115,
	"name": "Laura M.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "jrobles",
	"level": 0,
	"phone": false,
	"name": "Jiovani R.",
	"text": 0,
	"class_year": 0
}, {
	"username": "tdupreetan",
	"level": 10,
	"phone": 8608905597,
	"name": "Tai T.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "ndoungkaew",
	"level": 0,
	"phone": 8607595743,
	"name": "Mint D.",
	"text": 1,
	"class_year": 2014
}, {
	"username": "aprempeh",
	"level": 0,
	"phone": 3477532395,
	"name": "Achiaa P.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "syang",
	"level": 10,
	"phone": false,
	"name": "Joseph Y.",
	"text": 0,
	"class_year": 0
}, {
	"username": "kgibbel",
	"level": 0,
	"phone": 7187444392,
	"name": "Katherine G.",
	"text": 0,
	"class_year": 2015
}, {
	"username": "gmoskowitz",
	"level": 3,
	"phone": 8189174836,
	"name": "Gavriela M.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "hhadjeres",
	"level": 0,
	"phone": 8579195413,
	"name": "Hichem H.",
	"text": 1,
	"class_year": 0
}, {
	"username": "pinoa",
	"level": 3,
	"phone": 2025383860,
	"name": "Priscilla I.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "avonpentz",
	"level": 0,
	"phone": 2026697862,
	"name": "Annalora P.",
	"text": 1,
	"class_year": 2014
}, {
	"username": "pissaraviriy",
	"level": 0,
	"phone": false,
	"name": "Som-o I.",
	"text": 0,
	"class_year": 0
}, {
	"username": "rchristensen",
	"level": 10,
	"phone": 2039367562,
	"name": "Rob C.",
	"text": 0,
	"class_year": 0
}, {
	"username": "osarwar",
	"level": 0,
	"phone": 7815028950,
	"name": "Ozair S.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "cqoconnor",
	"level": 0,
	"phone": 6462362622,
	"name": "Colin O.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "ochavez",
	"level": 0,
	"phone": "347-743-63",
	"name": "Olivia C.",
	"text": 1,
	"class_year": 0
}, {
	"username": "jsoon",
	"level": 0,
	"phone": false,
	"name": "Sean S.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "dsongcho",
	"level": 0,
	"phone": 8607703485,
	"name": "Diego C.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "gnwang",
	"level": 0,
	"phone": 8607548289,
	"name": "Nathan W.",
	"text": 1,
	"class_year": 0
}, {
	"username": "dkim04",
	"level": 0,
	"phone": 7143454133,
	"name": "Daniel K.",
	"text": 1,
	"class_year": 2014
}, {
	"username": "kwernick",
	"level": 0,
	"phone": 2404497471,
	"name": "Kara W.",
	"text": 1,
	"class_year": 0
}, {
	"username": "jkim07",
	"level": 3,
	"phone": false,
	"name": "Jamie K.",
	"text": 0,
	"class_year": 0
}, {
	"username": "pgerard",
	"level": 3,
	"phone": 4084976910,
	"name": "Pierre G.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "tstoop",
	"level": 3,
	"phone": 6094396131,
	"name": "Tawni S.",
	"text": 0,
	"class_year": 2015
}, {
	"username": "aburkart",
	"level": 0,
	"phone": 8603984532,
	"name": "Chachi B.",
	"text": 0,
	"class_year": 2014
}, {
	"username": "sdeng",
	"level": 0,
	"phone": 6262613846,
	"name": "Shirley D.",
	"text": 1,
	"class_year": 2014
}, {
	"username": "kcho01",
	"level": 3,
	"phone": 7039460537,
	"name": "Kang C.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "rpruitt",
	"level": 3,
	"phone": 5732394463,
	"name": "Ryan P.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "mmearabainbr",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "atetteyfio",
	"level": 0,
	"phone": false,
	"name": "Afi T.",
	"text": 0,
	"class_year": 0
}, {
	"username": "okuti",
	"level": 3,
	"phone": 8608341330,
	"name": "Kumbi K.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "tqiao",
	"level": 0,
	"phone": "860-807-58",
	"name": "Tien Q.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "mleung",
	"level": 0,
	"phone": 9174599838,
	"name": "Melissa L.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "bforde",
	"level": 3,
	"phone": 3017423434,
	"name": "Ben F.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "jgoh",
	"level": 0,
	"phone": false,
	"name": "Jin G.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "vdeng",
	"level": 0,
	"phone": 7189748943,
	"name": "Vivian D.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "mdietz",
	"level": 0,
	"phone": 6467054230,
	"name": "Max D.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "rpodell",
	"level": 0,
	"phone": 3235788168,
	"name": "Rhys P.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "xzhu01",
	"level": 0,
	"phone": 4155298574,
	"name": "Xinyu Z.",
	"text": 0,
	"class_year": 2016
}, {
	"username": "gyatich",
	"level": 0,
	"phone": 8603010012,
	"name": "Geofrey Y.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "cfrancisco",
	"level": 0,
	"phone": 7814686010,
	"name": "Denise F.",
	"text": 0,
	"class_year": 2016
}, {
	"username": "aasonye",
	"level": 0,
	"phone": 3373423294,
	"name": "Amarachi A.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "rbabajide",
	"level": 3,
	"phone": 8323754438,
	"name": "Rilwan B.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "rmoye",
	"level": 0,
	"phone": 6466965708,
	"name": "Ryan M.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "jrnelson",
	"level": 0,
	"phone": 8585310700,
	"name": "John N.",
	"text": 0,
	"class_year": 2016
}, {
	"username": "sho01",
	"level": 0,
	"phone": 8608075684,
	"name": "Samantha H.",
	"text": 1,
	"class_year": 2016
}, {
	"username": "olawal",
	"level": 0,
	"phone": 3472575294,
	"name": "Yinka L.",
	"text": 1,
	"class_year": 2015
}, {
	"username": "hjung01",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 2016
}, {
	"username": "szaman",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "yeom",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "yrapten",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "mspiegelman",
	"level": 0,
	"phone": 9542409063,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "pkumar",
	"level": 0,
	"phone": 8609186163,
	"name": false,
	"text": 0,
	"class_year": 0
}, {
	"username": "crchandler",
	"level": 0,
	"phone": false,
	"name": false,
	"text": 0,
	"class_year": 0
},
{
	"username": "ckorkut",
	"level": 10,
	"phone": false,
	"name": 'Cumhur K.',
	"text": 0,
	"class_year": 2017
}];

staff.forEach(function(event) {
	db.staff.save(event, function(err, saved) {
		if (err || !saved) console.log("Staff not saved");
		else console.log("Staff saved");
	});
});