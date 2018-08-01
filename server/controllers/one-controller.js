const lockController = require('./utils/LockController');
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
        locked: [false, false],
        lockUnreachable: true,
        ...commonData,
      });
    });
};

exports.postLockState = (req, res, next) => {
  const action = req.body.action;
  if (action === 'lock') {
    lockController.lock()
      .then(() => {
        req.flash('success', 'Locked both doors successfully');
        res.redirect(req.redirect.success);
      })
      .catch(next);
  } else if (action === 'unlock') {
    lockController.unlock()
      .then(() => {
        req.flash('success', 'Unlocked both doors successfully');
        res.redirect(req.redirect.success);
      })
      .catch(next);
  } else {
    return next('Unknown action: ' + action);
  }
};

