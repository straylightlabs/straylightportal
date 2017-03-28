const secrets = require('../config/secrets');
const config = require('../config/main');
const google = require('googleapis');
const googleKey = require('../config/google-key.json');

const googleAuthClient = new google.auth.JWT(
    googleKey.client_email,
    null,
    googleKey.private_key,
    ['https://www.googleapis.com/auth/calendar'],
    'connect@straylight.jp'
    );

exports.setGoogleAuthClient = function(req, res, next) {
  if (!req.user) return next();

  googleAuthClient.authorize(function(err, tokens) {
    if (err) return next(err);

    google.options({
      auth: googleAuthClient
    });
    next();
  });
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
