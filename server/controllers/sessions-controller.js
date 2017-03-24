var passport = require('passport');

const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar';
exports.CAL_SCOPE = CAL_SCOPE;

// Limit the scope as much as possible to reduce bug surface.
const SCOPE_WHITELIST = [
  CAL_SCOPE
];

function parseCSV(str) {
  return str
    .split(',')
    .map(v => v.trim())
    .filter(v => v);
}

exports.login = function(req, res, next) {
  // Logout to support requesting additional scopes within a live session.
  req.logout();

  const additionalScopes = parseCSV(req.query.scope || '')
    .filter(s => SCOPE_WHITELIST.includes(s));
  const scopes = [
    'profile',
    'email',
    ...additionalScopes
  ];
  req.session.scopes = scopes;
  passport.authenticate('google', {
    scope: [...scopes]
  })(req, res, next);
};

exports.getRequestScopes = function(req, res, next) {
  const additionalScopes = parseCSV(req.query.scope || '');
  res.render(req.render, {
    user: req.user,
    scopes: additionalScopes
  });
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
