var Preferences   = require('./../config/Preferences.js'),
    User          = require('./../modules/user.js'),
    db            = require('./../modules/db.js');

var fs            = require('fs'),
    _             = require('underscore'),
    request       = require('request'),
    cache         = require('memory-cache'),
    googleapis    = require('googleapis');

var OAuth2Client = googleapis.OAuth2Client,
    oauth_cache  = {};

try {
    oauth_cache = JSON.parse(fs.readFileSync(__dirname + Preferences.path_client_secret, 'utf8'));
} catch (e) {
    console.log("Could not read client secret file from the config directory\nError: " + e);
}

// Requests list and sends response to collection
var read_models = function(req, options) {
    googleapis.discover('calendar', 'v3').withOpts({cache: {path: './config'}})
        .execute(function(err, client) {
            var auth = new OAuth2Client();
            auth.credentials = req.session.credentials;
            getCalendar(client, auth, 'me', options, req);
        });
};
// Fetches calendar objects from Google calendar
var getCalendar = function(client, authClient, userId, options, req) {
    client.calendar.events.list({
            calendarId: 'primary',
            //maxResults: 5,
            orderBy: "startTime",
            singleEvents: true,
            timeMin: options.timeMin,
            timeMax: options.timeMax,
            fields: "items(end,start,summary,description),summary"
        })
        .withAuthClient(authClient)
        .execute(function(err, calendar) {
            if (err) {
                // TODO: After the access_token is refreshed, there should be a new attempt to getCalendar
                if (err.message == "Invalid Credentials") {
                    //console.log("Invalid OAuth credentials");
                    refreshAccessToken(options, req);
                } else {
                    console.log("An error occurred!\n", err);
                    options.error(true);
                }
            } else
                options.success(calendar.items);
        });
};

// Fetch access & refresh token
    /* this function is only for the first time to fetch access & refresh tokens
    if there is a refresh token registered for that user but no valid access token, you need to use refreshAccessToken function*/
var getFirstToken = function(oauth2Client, req, res) {
    // OAuth options
    var oauthOptions = {access_type: 'offline', scope: 'https://www.googleapis.com/auth/calendar'};

    // Prompt for consent page if no valid refresh token
    if (_.isUndefined(req.session.refresh_token)) {
        oauthOptions.prompt = 'consent';
    }

    // Generate request URL and redirect user
    res.redirect(oauth2Client.generateAuthUrl(oauthOptions));

    // After user authentication
    // Google responds with an access "code"

};

// Refreshes access_token
var refreshAccessToken = function(options, req, callback) {
    //console.log("Refreshing OAuth access token.");
    // check if there is credentials registered in session - (access token expired in usage time)
    // if not(access token expired already) db query to fetch the refresh token for that user
    request.post(
        'https://accounts.google.com/o/oauth2/token', {
            form: {
                client_id: oauth_cache.web.client_id,
                client_secret: oauth_cache.web.client_secret,
                refresh_token: req.session.refresh_token,
                grant_type: 'refresh_token'
            }
        },
        function(error, response) {
            if (error) {
                console.log('Could not refresh OAuth tokens!\n', error);
            }

            // Parse body of http response
            var body = JSON.parse(response.body);
            if (body.error) {
                console.log("Refreshing OAuth token failed!\n", body.error);
                options.error(true);
            } else if (body.access_token) {
                req.session.credentials = body;
                if(_.isFunction(callback)){ callback(); }
            }
        });
};

var gCalToFullCalendar = function(events) {
    return _.map(events, function(event) {
        return {
            title: event.summary,
            start: event.start.dateTime, //FullCalendar can parse ISO8601 date strings
            end: event.end.dateTime,
            className: 'fc-gcal',
            gCal: true, //we could check the bg color in the front end but this way semantically makes more sense
        };
    });
};

var overallGoogleCheck = function(req, res, callback) {
    if (_.isUndefined(req.session.refresh_token)) {
        //check the database for refresh token
            db.staff.find({username:User.getUser(req)}, function(err, data) {
                        if(err || !data || data.length < 1) {
                            console.log(req.url);
                            console.log(err);
                            console.log('There is an error when fetching refresh token for the user');
                            res.status(404).send('Not found');
                            return;
                        } else {
                            if (_.isUndefined(data[0].refresh_token)) { //if there is no refresh token,
                                res.status(404).send('Not found');
                                return;
                            } else { //if there is one for the user
                                req.session.refresh_token = data[0].refresh_token;
                                refreshAccessToken({}, req, callback);
                            }
                        }
                    });
    } else {
        if(_.isFunction(callback)){ callback(); }
    }
};

var oauth2Client;

module.exports = {
    authorize: function(req, res) {
        //if we have the refresh token for the user, then we just need to refreshAccessToken, otherwise take permission
        oauth2Client = new OAuth2Client(oauth_cache.web.client_id, oauth_cache.web.client_secret, Preferences.googleRedirectUrl);
        getFirstToken(oauth2Client, req, res);
    },
    oauth2callback: function(req, res) {
        oauth2Client.getToken(req.query.code, function(err, tokens) {
            //We should check if the user is in wesleyan.edu domain and if ze is registered in our system
            googleapis.discover('calendar', 'v3').withOpts({cache: {path: './config'}})
                .execute(function(err, client) {
                    var auth = new OAuth2Client();
                    auth.credentials = tokens;
                    client
                        .calendar.acl.list({
                            calendarId: 'primary',
                            fields: "items(id,role)"
                        })
                        .withAuthClient(auth)
                        .execute(function(err, names) {
                            if (err) {
                                // TODO: After the access_token is refreshed, there should be a new attempt to getCalendar
                                if (err.message == "Invalid Credentials") {
                                    //console.log("Invalid OAuth credentials");
                                    refreshAccessToken(options, req);
                                } else {
                                    console.log("An error occurred!\n", err);
                                    options.error(true);
                                }
                            } else { //Now we have the calendar owner and readers, let's check it
                                //find owner, delete 'user:' from id, split to check the user name and domain
                                var user = (_.findWhere(names.items, {'role':'owner'})).id.substr(5).split('@'); 
                                if(user[1] === 'wesleyan.edu' && cache.get('staffUsernameArray').indexOf(user[0]) !== -1 && User.getUser(req) === user[0]) {
                                    //console.log(user[0] + ' is in Wesleyan domain and in our staff list, and the logged in user');
                                    req.session.credentials = tokens;
                                    req.session.refresh_token = tokens.refresh_token;

                                    //register the refresh token to the database, for that user
                                    db.staff.update( 
                                        {username: User.getUser(req)},
                                        { $set: {'refresh_token': tokens.refresh_token } }, 
                                        function(err, updated) {
                                            if (err || !updated) {
                                                console.log(req.url);
                                                console.log("Refresh token not updated:" + err);
                                            } else {
                                                //console.log("Refresh token updated for " + User.getUser(req));
                                                res.write(JSON.stringify(true).toString("utf-8"));
                                                res.end();
                                            }
                                        });
                                    
                                    res.redirect(Preferences.path_on_server);
                                } else {
                                    // should explain the user that they have to use their valid wesleyan.edu accounts
                                    //         or they are not registered in the Spec system.
                                    console.log('Something is wrong with this user ' + User.getUser(req));
                                    res.redirect(Preferences.path_on_server + 'authorize');
                                }
                            }
                        });
                });
        });            
    },
    events: function(req, res) {
        var start = new Date(req.query.start * 1000),
            end = new Date(req.query.end * 1000);

        var all = function() {
            read_models(req, {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                //timeMin: (new Date).toISOString(), //today
                //timeMax: new Date((new Date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), //next week
                success: function(items) {
                    res.json(gCalToFullCalendar(items));
                }
            });
        };
        overallGoogleCheck(req, res, all);

    }
};