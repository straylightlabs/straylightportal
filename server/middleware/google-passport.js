var secrets = require('../config/secrets');
var config = require('../config/main');
var base = require('airtable').base('appI5wbax01HyDamh');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var User = require('../models/user');

function fetchProfileFromAirtable(email, cb) {
  base('People').select({
    filterByFormula: "{Portal Email} = '" + email + "'"
  }).firstPage(function(error, people) {
    if (error) {
      return cb(error);
    }
    if (people.length == 0) {
      return cb('Your email is not registered in the system. Please contact core@straylight.jp for assistance.');
    }
    return cb(null, people[0]);
  });
}

function createNewUser(googleProfile, accessToken, refreshToken, cb) {
  var email = googleProfile.emails[0].value;
  fetchProfileFromAirtable(email, function(err, airtableProfile) {
    if (err) return cb(err);

    var membershipPlan = airtableProfile.get('Portal Membership');
    var imageUrl = googleProfile.photos && googleProfile.photos.length == 1
      ? googleProfile.photos[0].value : '';
    var mailingAddress = (airtableProfile.get('Physical Address') || '').split('\n');
    var firstBillingDateStr = airtableProfile.get('First Billing Date');
    var mobilePhone = airtableProfile.get('Mobile') || '';

    if (!membershipPlan ||
        !new RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}').test(firstBillingDateStr)) {
      return cb(`Invalid data in Airtable: membershipPlan=${membershipPlan} firstBillingDate=${firstBillingDateStr}`);
    }

    var firstBillingDate = new Date(firstBillingDateStr + 'T00:00:00+0900');
    var user = new User({
      email: email,
      membershipPlan: membershipPlan,
      profile: {
        displayName: googleProfile.displayName,
        imageUrl: imageUrl,
        mailingAddress: {
          street: mailingAddress[0],
          city: mailingAddress[1],
          state: mailingAddress[2],
          zip: mailingAddress[3],
          country: mailingAddress[4],
          isPrivate: true
        },
        mobilePhone: {
          countryCode: mobilePhone.split(' ')[0].replace('+', ''),
          number: mobilePhone.split(' ')[1],
          isPrivate: true
        }
      },
      billing: {
        firstBillingDate: firstBillingDate
      },
      oauth2: {
        accessToken: accessToken,
        refreshToken: refreshToken
      }
    });
    user.save(function(err) {
      cb(err, user);
    });
  });
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

  var clientID = secrets.googleOAuth.clientID;
  var clientSecret = secrets.googleOAuth.clientSecret;
  var callbackURL = config.baseUrl + '/auth/google/callback';
  var strategy = new GoogleStrategy({
      clientID: clientID,
      clientSecret: clientSecret,
      callbackURL: callbackURL
    },
    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function() {  // wait for all the data from Google
        var email = profile.emails[0].value;
        User.findOne({ email: email }, function (err, user) {
          if (err) {
            return cb(err);
          }
          if (user) {
            user.oauth2.accessToken = accessToken;
            // TODO(ryok): Currently refreshToken is undefined. We need to set
            // Offline mode to retrieve refreshToken.
            user.oauth2.refreshToken = refreshToken;
            return user.save(function(err) {
              if (err) return cb(err);

              cb(null, user);
            });
          }
          createNewUser(profile, accessToken, refreshToken, function(err, user) {
            return cb(err, user);
          });
        });
      });
    }
  );
  passport.use(strategy);
}
