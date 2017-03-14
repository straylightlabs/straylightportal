var secrets = require('../config/secrets');
var config = require('../config/main');
var moment = require('moment');

module.exports = function(req, res, next) {
  // TODO(ryok): Move moment here.
  res.locals.path = req.path;
  res.locals.googleAnalytics = secrets.googleAnalytics;
  res.locals.base_url = config.baseUrl;
  res.locals.moment = moment;
  next();
};
