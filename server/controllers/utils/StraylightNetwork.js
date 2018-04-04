var StraylightNetwork = module.exports = {
  ipAddress: '',
  setFromNetwork: function(req) {
    StraylightNetwork.ipAddress = req.headers['x-real-ip'];
  },
  getFromNetwork: function(req) {
    return req.headers['x-real-ip'] === StraylightNetwork.ipAddress;
  },
};
