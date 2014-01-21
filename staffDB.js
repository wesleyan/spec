var databaseUrl = "127.0.0.1:27017/spec"; // "username:password@example.com/mydb"
var collections = ["staff"]
var db = require("mongojs").connect(databaseUrl, collections);
var mongo = require('mongodb-wrapper');

var staff = [{
    'name': 'Sarwar Ozair',
    'phone': 7815028950,
    'username': 'osarwar',
    'class_year': 2015,
    'level': 10,
    'task': ['events', 'hr']
  }, {
  'name': 'Babajide Rilwan',
  'phone': 8323754438,
  'username': 'rbabajide',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Chamberlin Cabri',
  'phone': 7204213994,
  'username': 'cchamberlin',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Chandler Coleman',
  'phone': 5059204486,
  'username': 'crchandler',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Deng Vivian',
  'phone': 7189748943,
  'username': 'vdeng',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Deng Shirley',
  'phone': 6262613846,
  'username': 'sdeng',
  'class_year': 2014,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Dupree Tan Tai',
  'phone': 8608905597,
  'username': 'tdupreetan',
  'class_year': 2015,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Eom Andrew',
  'phone': 8609186207,
  'username': 'yeom',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Forde Benjamin',
  'phone': 3017423434,
  'username': 'bforde',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Francisco Denise',
  'phone': 7814676010,
  'username': 'cfrancisco',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Gerard Pierre',
  'phone': 4084976910,
  'username': 'pgerard',
  'class_year': 2015,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Gibbel Katherine',
  'phone': 7187444392,
  'username': 'kgibbel',
  'class_year': 2015,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Goh Victor (Jin Chieh)',
  'phone': 8607592403,
  'username': 'jgoh',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Hall James ',
  'phone': 8609429342,
  'username': 'jthall',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Hildebrand Reid',
  'phone': 4344669905,
  'username': 'rhildebrand',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Ho Samantha',
  'phone': 8608075684,
  'username': 'sho01',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Inoa Priscilla',
  'phone': 2025383860,
  'username': 'pinoa',
  'class_year': 2015,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Jung Harim',
  'phone': 2016632552,
  'username': 'hjung01',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Kim Daniel',
  'phone': 7143454133,
  'username': 'dkim04',
  'class_year': 2014,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Kim Theodore',
  'phone': 8605389580,
  'username': 'tskim',
  'class_year': 2015,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Kumar Purnima',
  'phone': 8609186163,
  'username': 'pkumar',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Kuti Olakumbi',
  'phone': 8608341330,
  'username': 'okuti',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Lawal Olayinka',
  'phone': 3472575294,
  'username': 'olawal',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Leung Melissa',
  'phone': 9174599838,
  'username': 'mleung',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Lopez Eric',
  'phone': 3106132482,
  'username': 'elopez01',
  'class_year': 2015,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Munsil Laura',
  'phone': 4805163115,
  'username': 'lmunsil',
  'class_year': 2014,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Moskowitz Gavriela ',
  'phone': 8189174836,
  'username': 'gmoskowitz',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Moye Ryan',
  'phone': 6466965708,
  'username': 'rmoye',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Nelson John',
  'phone': 8585310700,
  'username': 'jrnelson',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': "O'Connor Colin Quinn",
  'phone': 6462362622,
  'username': 'cqoconnor',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Podell Rhys',
  'phone': 3235788168,
  'username': 'rpodell',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Prempeh Achiaa',
  'phone': 8605388064,
  'username': 'aprempeh',
  'class_year': 2015,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Song Diego',
  'phone': 8607703485,
  'username': 'dsongcho',
  'class_year': 2015,
  'level': 10,
  'task': ['events']
}, {
  'name': 'Sieminski Dominic',
  'phone': 7732166552,
  'username': 'dsieminski',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Spiegelman Max',
  'phone': 9542409063,
  'username': 'mspiegelman',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Stoop Tawni',
  'phone': 6094396131,
  'username': 'tstoop',
  'class_year': 2015,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Qiao Tian',
  'phone': 8608075814,
  'username': 'tqiao',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'von Pentz Annalora',
  'phone': 2026697862,
  'username': 'avonpentz',
  'class_year': 2014,
  'level': 3,
  'task': ['events']
}, {
  'name': 'Yatich Geofrey',
  'phone': 8603010012,
  'username': 'gyatich',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Zaman Saarim',
  'phone': 2014175770,
  'username': 'szaman',
  'class_year': 2016,
  'level': 1,
  'task': ['events']
}, {
  'name': 'Janamanchi Abhimanyu',
  'phone': 7272046391,
  'username': 'ajanamanchi',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Garcia Alex',
  'phone': 8583426797,
  'username': 'asgarcia',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Lyons Aliya',
  'phone': 7185415966,
  'username': 'aclyons',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Neupane Ankur',
  'phone': 8607596791,
  'username': 'aneupane',
  'class_year': 2016,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Monroe Callie',
  'phone': 2155192022,
  'username': 'cmonroe',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Froot Daniel',
  'phone': 9176476413,
  'username': 'dfroot',
  'class_year': 2016,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Pham Dung',
  'phone': 8607594972,
  'username': 'dpham',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Selig Ian',
  'phone': 8606344723,
  'username': 'iselig',
  'class_year': 2016,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Fitzgerald Isabella',
  'phone': 3109936852,
  'username': 'ifitzgeraldh',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Wangsadinata Jason',
  'phone': 8608075387,
  'username': 'jwangsadinat',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Rossetter Kiley',
  'phone': 4074156621,
  'username': 'krossetter',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Trifunovski Maksim',
  'phone': 8607599861,
  'username': 'mtrifunovski',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Montanez Matt',
  'phone': 2036925244,
  'username': 'mmontanez',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Archibald Nkosi',
  'phone': 5162360921,
  'username': 'narchibald',
  'class_year': 2016,
  'trainee': true,
  'level': 1,
}, {
  'name': 'Harden Tyler',
  'phone': 6036864110,
  'username': 'tharden',
  'class_year': 2017,
  'trainee': true,
  'level': 1,
}, {
  "name": "Burkart Arthur",
  'phone': 8603984532,
  "username": "aburkart",
  'class_year': 2014,
  'task': ['programming'],
  'level': 10,
}, {
  "name": "Gapinski Brian",
  'phone': 7192323977,
  "username": "bgapinski",
  'class_year': 2014,
  'task': ['programming', 'cs'],
  'level': 10,
}, {
  "name": "Islo Erik",
  'phone': 4146873311,
  "username": "eislo",
  'class_year': 2015,
  'task': ['programming', 'cs'],
  'level': 10,
}, {
  "name": "Dietz Max",
  'phone': 6467054230,
  "username": "mdietz",
  'class_year': 2016,
  'task': ['programming'],
  'level': 10,
}, {
  "name": "Giagtzoglou Sam",
  'phone': 2022476496,
  "username": "sgiagtzoglou",
  'class_year': 2016,
  'task': ['programming'],
  'level': 10,
}, {
  "name": "Korkut Cumhur",
  'phone': 8602561103,
  "username": "ckorkut",
  'class_year': 2017,
  'task': ['programming'],
  'level': 10,
}, {
  "name": "Lashner Jack",
  'phone': 6109084797,
  "username": "jlashner",
  'class_year': 2016,
  'task': ['programming'],
  'level': 10,
}, {
  "name": "Raymond Justin",
  'phone': 9786217567,
  "username": "jraymond",
  'class_year': 2014,
  'task': ['programming'],
  'level': 10,
}, {
  'name': 'Haydar Rashedul',
  'phone': 8609080560,
  'username': 'rhaydar',
  'class_year': 2014,
  'level': 1,
  'task': ['cs']
}, {
  'name': 'Laidley Everton',
  'phone': 9179325910,
  'username': 'elaidley',
  'class_year': 2014,
  'level': 1,
  'task': ['cs']
}, {
  'name': 'May Olivia',
  'phone': 7033048805,
  'username': 'omay',
  'class_year': 2014,
  'level': 1,
  'task': ['cs']
}, {
  'name': 'Watson Alexander',
  'phone': 3522781788,
  'username': 'amwatson',
  'class_year': 2014,
  'level': 1,
  'task': ['cs']
}, {
  'name': 'Flores Heric',
  'phone': 8602622017,
  'username': 'hflores',
  'level': 10,
  'professional': true
}, {
  'name': 'Morgan Brent',
  'phone': 8606851173,
  'username': 'bmorgan',
  'level': 10,
  'professional': true
}, {
  'name': 'Christensen Rob',
  'phone': 2039367562,
  'username': 'rchristensen',
  'level': 10,
  'professional': true
}];

staff.forEach(function(event) {
	db.staff.save(event, function(err, saved) {
		if (err || !saved) console.log("Staff not saved");
		else console.log("Staff saved");
	});
});