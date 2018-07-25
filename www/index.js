const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const cors = require('cors');
const express = require('express');
const expressValidator = require('express-validator');
const flash = require('express-flash');
const session = require('express-session')
const mustacheExpress = require('mustache-express');
const path = require('path');
const router = require('./router');
const tasks = require('./tasks');

const port = 8080;

const app = express();
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, '/views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(cookieParser());
app.use(session({
  secret: 'straylight.jp',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000
  }
}));
app.use(flash());
app.use(cors());
router(app);

app.listen(port);
console.log('Server is running on port ' + port + '.');

tasks();

