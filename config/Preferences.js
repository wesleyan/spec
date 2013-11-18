module.exports = {
		//general preferences
		path_last_xml: '/uploads/last.xml',
		path_client_secret: '/config/client_secret.json',
		
		//the one below must match with the one you have saved in https://code.google.com/apis/console
		googleRedirectUrl: 'http://ims-dev.wesleyan.edu:8080/oauth2callback',
		
		//CAS Configurations
		casOptions: {
			casHost: 'sso.wesleyan.edu',
			ssl: true,
			service: 'http://ims-dev.wesleyan.edu:8080/',
			redirectUrl: '/login'
		},
		
		//Port that Spec will run on
		port: 8080,
		
		//nodemailer settings
		mail: {
			service:'Gmail',
			user:'wesleyanspec@gmail.com',
			pass:'#thisiswhy'
		},
		managerEmails: ['specialeventsmanagers@gmail.com'],

		backgroundColors: {
			'green': '#097054',
			'red': '#9E3B33',
			'yellow': '#E48743',
			'gray': '#666666'
		},
		
		//MongoDB preferences
		databaseUrl: "127.0.0.1:27017/spec",
		collections: ['events','staff','inventory']
	};

/* //options for using SSL, not used right now
var options = {
        key: fs.readFileSync('../ssl-key.pem'),
        cert: fs.readFileSync('/etc/pki/tls/certs/ca-bundle.crt'),
        };
*/