var secrets = require('../config/secrets');
var config = require('../config/main');
var base = require('airtable').base('appI5wbax01HyDamh');
var google = require('googleapis');
var calendar = google.calendar('v3');
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

function createNewUser(googleProfile, cb) {
  var email = googleProfile.emails[0].value;
  fetchProfileFromAirtable(email, function(err, airtableProfile) {
    if (err) return cb(err);

    var membershipPlan = airtableProfile.get('Portal Membership');
    var imageUrl = googleProfile.photos && googleProfile.photos.length == 1
      ? googleProfile.photos[0].value : '';
    var mailingAddress = airtableProfile.get('Physical Address').split('\n').join(' ');
    var firstBillingDateStr = airtableProfile.get('First Billing Date');
    var firstBillingDate = new Date(firstBillingDateStr + 'T00:00:00+0900');
    var mobilePhone = airtableProfile.get('Mobile');

    if (membershipPlan.length == 0 ||
        !new RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}').test(firstBillingDateStr)) {
      return cb(`Invalid data in Airtable: membershipPlan=${membershipPlan} firstBillingDate=${firstBillingDateStr}`);
    }

    var user = new User({
      email: email,
      membershipPlan: membershipPlan,
      profile: {
        displayName: googleProfile.displayName,
        imageUrl: imageUrl,
        mailingAddress: {
          value: mailingAddress,
          isPrivate: true
        },
        mobilePhone: {
          value: mobilePhone,
          isPrivate: true
        }
      },
      billing: {
        firstBillingDate: firstBillingDate
      }
    });
    user.save(function(err) {
      return cb(err, user);
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

  var strategy = new GoogleStrategy({
      clientID: secrets.googleOAuth.clientID,
      clientSecret: secrets.googleOAuth.clientSecret,
      callbackURL: config.baseUrl + '/auth/google/callback',
    },
    function(accessToken, refreshToken, profile, cb) {
      // Use this OAuth2 client for Google APIs.
      //google.options({
      //  auth: strategy._oauth2
      //});
      //var event = {
      //  "end": {
      //    "dateTime": "2017-03-10T20:00:00+0900"
      //  },
      //  "start": {
      //    "dateTime": "2017-03-10T19:00:00+0900"
      //  },
      //  "attendees": [
      //  {
      //    "email": "taj@straylight.jp"
      //  }
      //  ],
      //  "summary": "Test event",
      //  "description": "Test event description",
      //  "location": "Location"
      //};
      //calendar.events.insert({
      //  auth: strategy._oauth2
      //  calendarId: 'primary',
      //  sendNotifications: true,
      //  resource: event,
      //}, function(err, event) {
      //  if (err) {
      //    console.log('There was an error contacting the Calendar service: ' + err);
      //    return;
      //  }
      //  console.log('Event created: %s', event.htmlLink);
      //});

      process.nextTick(function() {  // wait for all the data from Google
        var email = profile.emails[0].value;
        User.findOne({ email: email }, function (err, user) {
          if (err || user) {
            return cb(err, user);
          }
          createNewUser(profile, function(err, user) {
            return cb(err, user);
          });
        });
      });
    }
  );
  passport.use(strategy);
}
