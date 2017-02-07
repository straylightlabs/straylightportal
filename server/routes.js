'use strict';

// middleware
var StripeWebhook = require('stripe-webhook-middleware'),
isAuthenticated = require('./middleware/auth').isAuthenticated,
isUnauthenticated = require('./middleware/auth').isUnauthenticated,
setRender = require('middleware-responder').setRender,
setRedirectInternal = require('middleware-responder').setRedirect,
stripeEvents = require('./middleware/stripe-events'),
secrets = require('./config/secrets');
// controllers
var users = require('./controllers/users-controller'),
index = require('./controllers/index-controller'),
sessions = require('./controllers/sessions-controller');

var stripeWebhook = new StripeWebhook({
  stripeApiKey: secrets.stripeOptions.apiKey,
  respond: true
});

// Prepend '/portal' to every path.
function setRedirect(routes) {
  for (var key in routes) {
    routes[key] = '/portal' + routes[key];
  }
  return setRedirectInternal(routes);
}

module.exports = function (app, passport) {

  // homepage and dashboard
  app.get('/',
    setRedirect({auth: '/profile'}),
    isUnauthenticated,
    setRender('index'),
    index.getHome);

  // sessions
  app.get('/auth/google',
    isUnauthenticated,
    sessions.login);
  app.get('/auth/google/callback',
    setRedirect({auth: '/profile', success: '/profile', failure: '/'}),
    isUnauthenticated,
    sessions.postLogin);
  app.get('/logout',
    setRedirect({auth: '/', success: '/'}),
    isAuthenticated,
    sessions.logout);

  app.get('/billing',
    setRender('billing'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getDefault);
  app.get('/profile',
    setRender('profile'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getDefault);

  // user api stuff
  app.post('/user/billing',
    setRedirect({auth: '/', success: '/billing', failure: '/billing'}),
    isAuthenticated,
    users.postStartSubscription);

  // use this url to receive stripe webhook events
  app.post('/stripe/events',
    stripeWebhook.middleware,
    stripeEvents
  );
};
