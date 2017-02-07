'use strict';

var express = require('express');
var swig = require('swig');
var subdomainOffset = process.env.SUBDOMAIN_OFFSET || 0;
var secrets = require('./config/secrets');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')({ session: session });
var mongoose = require('mongoose');
var passport = require('passport');
var bodyParser = require('body-parser');
var compress = require('compression')();
var lodash = require('lodash');
// var Authentication = require('./authentication');
var expressValidator = require('express-validator');
var errorHandler = require('./middleware/error');
var passportMiddleware = require('./middleware/google-passport');
var viewHelper = require('./middleware/view-helper');
var flash = require('express-flash');
var cors = require('cors');
var corsOptions = {
  origin: '*'
};

// setup db
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

// express setup
var app = express();

app.locals._ = lodash;
app.locals.stripePubKey = secrets.stripeOptions.stripePubKey;
app.locals.production = app.get('env') === 'production';

if (app.get('env') === 'production') {
  swig.setDefaults({ cache: 'memory' });
} else {
  swig.setDefaults({ cache: false });
}
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(favicon(path.join(__dirname + '/../public/favicon.png')));
app.use(logger('dev'));

app.use(compress);
app.use(bodyParser());
app.use(expressValidator());
app.use(cookieParser());

app.use(express.static(path.join(__dirname + '/../public')));

app.use(session({
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 60 * 1000  // 1 minute
  },
  secret: secrets.sessionSecret,
  store: new MongoStore({
    url: secrets.db,
    auto_reconnect: true
  })
}));

// setup passport authentication
app.use(passport.initialize());
app.use(passport.session());
passportMiddleware(passport);

// other
app.use(flash());
app.use(cors(corsOptions));

// setup view helper
app.use(viewHelper);

// setup routes
var routes = require('./routes');
routes(app, passport);

/// catch 404 and forwarding to error handler
app.use(errorHandler.notFound);

/// error handlers
if (app.get('env') === 'development') {
  // TODO(ryok): So far, this has been unuseful hiding details of errors.
  // app.use(errorHandler.development);
} else {
  app.use(errorHandler.production);
}

module.exports = app;
