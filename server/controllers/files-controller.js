const UPLOAD_DIR = 'uploads/';

var fs = require('fs');
var path = require('path');
var NotFoundError = require('../middleware/error').NotFoundError;

exports.get = function(req, res, next) {
  if (!req.query.mime) {
    return next(new NotFoundError('Mime param missing'));
  }
  var filename = path.join(UPLOAD_DIR, req.params.fileId);
  fs.readFile(filename, function(err, data) {
    if (err) {
      return next(new NotFoundError('File not found'));
    }
    res.writeHead(200, {'Content-Type': req.query.mime});
    res.end(data);
  });
}
