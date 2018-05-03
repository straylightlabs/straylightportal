const lockController = require('./utils/LockController');
const ledController = require('./utils/LEDController');
const straylightNetwork = require('./utils/StraylightNetwork');
const memberPresence = require('./utils/MemberPresence').singleton;

exports.get = (req, res, next) => {
  const commonData = {
    user: req.user,
    presentMembers: [...memberPresence.getPresentMembers()],
    scanLogs: memberPresence.getScanLogs(),
    fromTrustedNetwork: straylightNetwork.getFromNetwork(req),
  };

  lockController.getStatus()
    .then(locked => {
      res.render(req.render, {
        locked,
        ...commonData,
      });
    })
    .catch(err => {
      res.render(req.render, {
        locked: false,
        lockUnreachable: true,
        ...commonData,
      });
    });
};

exports.postLockState = (req, res, next) => {
  if (!straylightNetwork.getFromNetwork(req)) {
    return next('Not from a trusted network');
  }
  const action = req.body.action;
  if (action === 'lock') {
    lockController.lock()
      .then(() => {
        req.flash('success', 'Request sent to the lock controller');
        res.redirect(req.redirect.success);
      })
      .catch(next);
  } else if (action === 'unlock') {
    lockController.unlock()
      .then(() => {
        req.flash('success', 'Request sent to the lock controller');
        res.redirect(req.redirect.success);
      })
      .catch(next);
  } else {
    return next('Unknown action: ' + action);
  }
};

exports.postLEDState = (req, res, next) => {
  if (!straylightNetwork.getFromNetwork(req)) {
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

  ledController.set(patternRpc)
    .then(() => {
      req.flash('success', 'Pattern sent to the LED controller');
      res.redirect(req.redirect.success);
    })
    .catch(next);
};

