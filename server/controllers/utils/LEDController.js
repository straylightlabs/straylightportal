const fetch = require('node-fetch');

const LED_CONTROLLER_URL = 'http://localhost:8086';

exports.set = (pattern) =>
  fetch(`${LED_CONTROLLER_URL}/${pattern}`);
