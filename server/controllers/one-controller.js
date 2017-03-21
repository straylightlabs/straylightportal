const axios = require('axios');

exports.get = function(req, res, next) {
  axios.get('http://192.168.0.3:8080/status').then(response => {
    res.render(req.render, {
      user: req.user,
      locked: response.data == 'LOCKED'
    });
  }).catch(next);
};

