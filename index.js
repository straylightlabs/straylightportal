#!/usr/bin/env node

var debug = require('debug')('app');
var app = require('./server/index');
var config = require('./server/config/main');

app.set('port', config.port);

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

