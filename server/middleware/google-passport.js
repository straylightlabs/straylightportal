var secrets = require('../config/secrets');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var User = require('../models/user');

function updateUserProfile(src, dest) {
  if (!dest.displayName) {
    dest.displayName = src.displayName;
  }
  if (!dest.imageUrl && src.image) {
    dest.imageUrl = src.image.url;
  }
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
      callbackURL: "https://straylight.jp/member/auth/google/callback"
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
          updateUserProfile(profile, user.profile);
          return cb(null, user);
        });
      });
    }
  ));
}
