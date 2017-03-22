const axios = require('axios');

const LOCK_CONTROLLER_URL = 'http://localhost:8083';
const RES_CODE_LOCKED = 'LOCKED';
const RES_CODE_UNLOCKED = 'UNLOCKED';

function isFromTrustedNetwork(req) {
  return req.headers['x-real-ip'] === process.env.PORTAL_TRUSTED_NETWORK_IP;
}

exports.get = function(req, res, next) {
  axios.get(LOCK_CONTROLLER_URL + '/status').then(response => {
    res.render(req.render, {
      user: req.user,
      locked: response.data == RES_CODE_LOCKED,
      fromTrustedNetwork: isFromTrustedNetwork(req)
    });
  }).catch(next);
};

exports.getLockState = function(req, res, next) {
  axios.get(LOCK_CONTROLLER_URL + '/status').then(response => {
    res.json({
      state: response.data
    });
  }).catch(err => {
    res.json({
      error: err
    });
  });
};

exports.postLockState = function(req, res, next) {
  if (!isFromTrustedNetwork(req)) {
    return next('Not from a trusted network');
  }
  var action = req.body.action;
  if (action != 'lock' && action != 'unlock') {
    return next('Unknown action: ' + action);
  }

  axios.get(`${LOCK_CONTROLLER_URL}/${action}`).then(response => {
    req.flash('success', 'Request sent to August Lock');
    res.redirect(req.redirect.success);
  }).catch(next);
};

