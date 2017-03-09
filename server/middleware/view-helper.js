var secrets = require('../config/secrets');

module.exports = function(req, res, next) {
  // TODO(ryok): Move moment here.
  res.locals.path = req.path;
  res.locals.googleAnalytics = secrets.googleAnalytics;
  next();
};
