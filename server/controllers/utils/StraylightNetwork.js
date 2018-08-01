var StraylightNetwork = module.exports = {
  getFromNetwork: function(req) {
    return req.headers['x-real-ip'] === process.env.PORTAL_TRUSTED_NETWORK_IP;
  },
};
