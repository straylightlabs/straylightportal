var passport = require('passport');

exports.login = function(req, res, next) {
  passport.authenticate('google', {
    scope : [
      'profile',
      'email',
      // TODO(ryok): those additional data are not coming through.
      // https://developers.google.com/people/api/rest/v1/people#get
      'https://www.googleapis.com/auth/user.addresses.read',
      'https://www.googleapis.com/auth/user.phonenumbers.read',
      'https://www.googleapis.com/auth/calendar'
    ]
  })(req, res, next);
};

exports.postLogin = function(req, res, next) {
  passport.authenticate('google', {
    successRedirect: req.redirect.success,
    failureRedirect: req.redirect.failure,
    failureFlash : true
  })(req, res, next);
};

exports.logout = function(req, res, next) {
  var time = 60 * 1000;

  req.logout();
  req.session.cookie.maxAge = time;
  req.session.cookie.expires = new Date(Date.now() + time);
  req.session.touch();
  req.flash('success', 'Successfully logged out');
  res.redirect(req.redirect.success);
};
