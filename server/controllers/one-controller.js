const lockController = require('./utils/LockController');
const ledController = require('./utils/LEDController');
const memberPresence = require('./utils/MemberPresence').singleton;
const straylightNetwork = require('./utils/StraylightNetwork');

var previousMembers = [];
setInterval(() => {
  const members = memberPresence.getPresentMembers();
  if (JSON.stringify(previousMembers) !== JSON.stringify(members)) {
    const memberNames = members.map(m => m.firstName).join(', ');
    console.info('Current members: ' + memberNames);
    if (previousMembers.length === 0 && members.length > 0) {
      lockController.unlock();
    }
    if (previousMembers.length > 0 && members.length === 0) {
      lockController.lock();
    }
  }
  previousMembers = members;
}, 1000);

exports.get = (req, res, next) => {
  lockController.getStatus()
    .then(locked => {
      res.render(req.render, {
        locked,
        user: req.user,
        fromTrustedNetwork: straylightNetwork.getFromNetwork(req)
      });
    })
    .catch(err => {
      res.render(req.render, {
        user: req.user,
        locked: false,
        lockUnreachable: true,
        fromTrustedNetwork: straylightNetwork.getFromNetwork(req)
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

