const UPLOAD_DIR = 'uploads/';

var fs = require('fs');
var path = require('path');

exports.get = function(req, res) {
  if (!req.query.mime) {
    console.error('mime query missing');
    return res.status(404).send('Not found');
  }
  var filename = path.join(UPLOAD_DIR, req.params.fileId);
  fs.readFile(filename, function(err, data) {
    if (err) {
      console.error(req.params.fileId + ' not found');
      return res.status(404).send('Not found');
    }
    res.writeHead(200, {'Content-Type': req.query.mime});
    res.end(data);
  });
}
