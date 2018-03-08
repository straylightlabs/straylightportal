const axios = require('axios');

const LOCK_CONTROLLER_URL = 'http://localhost:8083';
const DOOR_CONTROLLER_URL = 'http://localhost:8084';
const SLACK_URL = 'https://hooks.slack.com/services/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';
const RES_CODE_LOCKED = 'LOCKED';
const RES_CODE_UNLOCKED = 'UNLOCKED';
const FETCH_CONFIG = { timeout: 2000 };

function isFromTrustedNetwork(req) {
  return req.headers['x-real-ip'] === process.env.PORTAL_TRUSTED_NETWORK_IP;
}

exports.get = function(req, res, next) {
  axios.get(LOCK_CONTROLLER_URL + '/status', FETCH_CONFIG).then(response => {
    res.render(req.render, {
      user: req.user,
      locked: response.data == RES_CODE_LOCKED,
      fromTrustedNetwork: isFromTrustedNetwork(req)
    });
  }).catch(err => {
    res.render(req.render, {
      user: req.user,
      locked: false,
      lockUnreachable: true,
      fromTrustedNetwork: isFromTrustedNetwork(req)
    });
  });
};

exports.getLockState = function(req, res, next) {
  axios.get(LOCK_CONTROLLER_URL + '/status', FETCH_CONFIG).then(response => {
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
  const action = req.body.action;
  if (action != 'lock' && action != 'unlock') {
    return next('Unknown action: ' + action);
  }

  const firstName = req.user.profile.displayName.split(' ')[0];
  const state = action == 'lock' ? 'left' : 'arrived';
  axios.post(SLACK_URL, {
    channel: '#logs',
    text: `${firstName} has ${state}.`,
    username: 'Front door'
  });

  axios.get(`${LOCK_CONTROLLER_URL}/${action}`, FETCH_CONFIG).then(response => {
    req.flash('success', 'Request sent to the Lock');
    res.redirect(req.redirect.success);
  }).catch(next);
};

exports.postDoorState = function(req, res, next) {
  if (!isFromTrustedNetwork(req)) {
    return next('Not from a trusted network');
  }
  const pattern = req.body.pattern;
  var patternRpc;
  if (pattern == 'rainbow') {
    patternRpc = 'rainbow()';
  } else if (pattern == 'flicker') {
    patternRpc = 'flicker(150,150,150)';
  } else if (pattern == 'clear') {
    patternRpc = 'set(0,0,0)';
  } else {
    return next('Unknown pattern: ' + pattern);
  }

  axios.get(`${DOOR_CONTROLLER_URL}/${patternRpc}`).then(response => {
    req.flash('success', 'Pattern sent to the Door');
    res.redirect(req.redirect.success);
  }).catch(next);
};

