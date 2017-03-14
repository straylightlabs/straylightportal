var secrets = require('../config/secrets');
var config = require('../config/main');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

exports.setOAuth2Client = function(req, res, next) {
  if (!req.user) return next();

  // TODO(ryok): Handle expiration of access token.
  var clientID = secrets.googleOAuth.clientID;
  var clientSecret = secrets.googleOAuth.clientSecret;
  var callbackURL = config.baseUrl + '/auth/google/callback';
  var oauth2Client = new OAuth2(clientID, clientSecret, callbackURL);
  oauth2Client.setCredentials({
    access_token: req.user.oauth2.accessToken,
    refresh_token: req.user.oauth2.refreshToken
  });
  google.options({
    auth: oauth2Client
  });
  next();
};

exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect(req.redirect.auth);
};

exports.isUnauthenticated = function(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }

  res.redirect(req.redirect.auth);
};
