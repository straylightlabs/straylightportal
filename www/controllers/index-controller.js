var path = require('path');

exports.get = function(req, res, next) {
  res.sendFile(path.join(__dirname + '/../static/index.html'));
}

