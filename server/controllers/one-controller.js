const axios = require('axios');

function isFromTrustedNetwork(req) {
  return req.headers['x-real-ip'] === process.env.PORTAL_TRUSTED_NETWORK_IP;
}

exports.get = function(req, res, next) {
  axios.get('http://localhost:18081/status').then(response => {
    res.render(req.render, {
      user: req.user,
      locked: response.data == 'LOCKED',
      fromTrustedNetwork: isFromTrustedNetwork(req)
    });
  }).catch(next);
};

exports.postLockState = function(req, res, next) {
  if (!isFromTrustedNetwork()) {
    return next('Not from a trusted network');
  }
  var action = req.body.action;
  if (action != 'lock' && action != 'unlock') {
    return next('Unknown action: ' + action);
  }

  axios.get('http://localhost:18081/' + action).then(response => {
    req.flash('success', 'Request sent');
    res.redirect(req.redirect.success);
  }).catch(next);
};

