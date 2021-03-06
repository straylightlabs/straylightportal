const fetch = require('node-fetch');
const { Set } = require('immutable');
const secrets = require('../../config/secrets');
const memberPresence = require('./MemberPresence').singleton;

const DOOR_3C_ID = '394D1ABD12AF4886A5331C0652713448';
const DOOR_3D_ID = 'BBD5DDBBADE948DCA163DE5245279F31';
const DOOR_3C_URL = `https://api-production.august.com/locks/${DOOR_3C_ID}`;
const DOOR_3D_URL = `https://api-production.august.com/locks/${DOOR_3D_ID}`;
const DOOR_3C_LOCK_URL = `https://api-production.august.com/remoteoperate/${DOOR_3C_ID}/lock`;
const DOOR_3D_LOCK_URL = `https://api-production.august.com/remoteoperate/${DOOR_3D_ID}/lock`;
const DOOR_3C_UNLOCK_URL = `https://api-production.august.com/remoteoperate/${DOOR_3C_ID}/unlock`;
const DOOR_3D_UNLOCK_URL = `https://api-production.august.com/remoteoperate/${DOOR_3D_ID}/unlock`;
const HEADERS = {
  'Content-Type': 'application/json',
  'x-august-access-token': secrets.augustAccessToken,
  'x-august-api-key': '79fd0eb6-381d-4adf-95a0-47721289d1d9',
};

const lastTimeAccessed = new Map();
function rateLimit(token) {
  const lastTime = lastTimeAccessed.get(token) || 0;
  if (new Date() - lastTime < 20 * 1000) {
    return true;
  }
  lastTimeAccessed.set(token, new Date());
  return false;
}

function put(url) {
  return new Promise((resolve, reject) => {
    console.debug(`PUT: ${url}`);

    if (rateLimit(url)) {
      return reject('Rate-limited.');
    }

    fetch(url, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: HEADERS,
    })
    .then(res => res.json())
    .then(json => {
      console.debug(`PUT response: ${JSON.stringify(json)}`);
      resolve(json);
    })
    .catch(err => {
      console.error(`PUT response failure: ${err}`);
      reject(err);
    });
  });
}

function getStatus(url) {
  return new Promise((resolve, reject) => {
    console.debug(`GET: ${url}`);
    fetch(url, {
      headers: HEADERS,
    })
    .then(res => res.json())
    .then(json => {
      console.debug(`GET response: ${JSON.stringify(json)}`);
      resolve(json.LockStatus.status === 'locked');
    })
    .catch(err => {
      console.error(`GET response failure: ${err}`);
      reject(err);
    });
  });
}

const lock = exports.lock = () => Promise.all([
  put(DOOR_3C_LOCK_URL),
  put(DOOR_3D_LOCK_URL)]);

const unlock = exports.unlock = () => Promise.all([
  put(DOOR_3C_UNLOCK_URL),
  put(DOOR_3D_UNLOCK_URL)]);

exports.getStatus = () => Promise.all([
  getStatus(DOOR_3C_URL),
  getStatus(DOOR_3D_URL)]);
