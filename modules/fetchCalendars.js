var Preferences   = require('./../config/Preferences.js');

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


// Fetches calendar objects from Google calendar
var getCalendar = function(client, authClient, userId, options) {
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
                    console.log("Invalid OAuth credentials");
                } else {
                    console.log("An error occurred!\n", err);
                    options.error(true);
                }
            } else
                options.success(calendar.items);
        });
};

// Requests list and sends response to collection
var readModels = function(options) {
    googleapis.discover('calendar', 'v3').withOpts({cache: {path: './config'}})
        .execute(function(err, client) {
            var auth = new OAuth2Client();
            auth.credentials = options.credentials;
            getCalendar(client, auth, 'me', options);
        });
};

// Refreshes access_token
var refreshAccessToken = function(options, callback) {
    //console.log("Refreshing OAuth access token.");
    // check if there is credentials registered in session - (access token expired in usage time)
    // if not(access token expired already) db query to fetch the refresh token for that user
    request.post(
        'https://accounts.google.com/o/oauth2/token', {
            form: {
                client_id: oauth_cache.web.client_id,
                client_secret: oauth_cache.web.client_secret,
                refresh_token: options.refresh_token,
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
                if(_.isFunction(callback)){ callback(body); }
            }
        });
};

var userCheck = function(options, callback) {
    var user = _(cache.get('storeStaff')).findWhere({username: options.user});
    if(_(user).isUndefined()) {
        options.error('No such user');
        return;
    }
    if(_(user.refresh_token).isUndefined()) {
        options.error('That user does not have a refresh token.');
        return;
    } else {
        options.refresh_token = user.refresh_token;
        refreshAccessToken(options, callback);
    }
};

module.exports = function(options) {
    // options object has: start, end, user, success, error
    userCheck(options, function(credentials) {
        readModels({
            credentials: credentials,
            timeMin: options.start.toISOString(),
            timeMax: options.end.toISOString(),
            success: options.success,
            error:   options.error
        });
    });
};

/* //example usage:
fetchCalendars({
    start: new Date('April 2014'),
    end:   new Date('June 2014'),
    user:  'ckorkut',
    success: function(items) {
        console.log(JSON.stringify(items));
    },
    error: function(err) {
        console.error('Failed calendar fetch: ' + err);
    }
});
*/