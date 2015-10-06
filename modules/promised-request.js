var Q = require('q');

module.exports = function(url) {
    var deferred = Q.defer();
    require('request')(url, function(err, response, body) {
        if(!err) {
            return deferred.resolve(body);
        } else {
            return deferred.reject(new Error(err));
        }
    });
    return deferred.promise;
};
