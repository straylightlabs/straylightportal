const BASE_URL = process.env.PORTAL_BASE_URL;

var secrets = require('../config/secrets');

module.exports = function(req, res, next) {
  // TODO(ryok): Move moment here.
  res.locals.path = req.path;
  res.locals.googleAnalytics = secrets.googleAnalytics;
  res.locals.base_url = BASE_URL;
  next();
};
