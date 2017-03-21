var secrets = require('../config/secrets');
var config = require('../config/main');
var moment = require('moment');

module.exports = function(req, res, next) {
  res.locals.serviceName = config.serviceName;
  res.locals.shortServiceName = config.shortServiceName;
  res.locals.path = req.path;
  res.locals.googleAnalytics = secrets.googleAnalytics;
  res.locals.base_url = config.baseUrl;
  res.locals.moment = moment;
  next();
};
