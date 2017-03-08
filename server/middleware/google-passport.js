var secrets = require('../config/secrets');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var User = require('../models/user');

function updateUserProfile(src, dest) {
  var updated = false;
  if (!dest.displayName) {
    dest.displayName = src.displayName;
    updated = true;
  }
  if (!dest.imageUrl && src.photos && src.photos.length) {
    dest.imageUrl = src.photos[0].value;
    updated = true;
  }
  return updated;
}

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new GoogleStrategy({
      clientID: secrets.googleOAuth.clientID,
      clientSecret: secrets.googleOAuth.clientSecret,
      callbackURL: 'https://straylight.jp/portal/auth/google/callback',
      scope: [
        'profile',
        'email',
        // TODO(ryok): these additional scopes are being ignored.
        'https://www.googleapis.com/auth/user.addresses.read',
        'https://www.googleapis.com/auth/user.phonenumbers.read'
      ]
    },
    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function() {  // wait for all the data from Google
        var email = profile.emails[0].value;
        User.findOne({ email: email }, function (err, user) {
          if (err) {
            return cb(err);
          }
          if (!user) {
            return cb('Your email is not registered in the system. Please contact core@straylight.jp for assistance.');
          }
          if (updateUserProfile(profile, user.profile)) {
            user.save(function(err) {
              return cb(err, user);
            });
          }
          return cb(null, user);
        });
      });
    }
  ));
}
