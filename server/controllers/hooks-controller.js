const oneController = require('./one-controller');
const lockController = require('./utils/LockController');
const memberPresence = require('./utils/MemberPresence').singleton;
const straylightNetwork = require('./utils/StraylightNetwork');

exports.lock = (req, res, next) => {
  console.debug(JSON.stringify(req.body));
  if (req.body.locked) {
    lockController.lock();
  }
  res.end();
}

exports.blescan = (req, res, next) => {
  memberPresence.addScanEvent(req.body.macAddress);
  straylightNetwork.setFromNetwork(req);
  res.end();
}

