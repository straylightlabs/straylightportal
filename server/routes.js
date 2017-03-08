'use strict';

const UPLOAD_DIR = 'uploads/';

var secrets = require('./config/secrets');
// middleware
var StripeWebhook = require('stripe-webhook-middleware'),
isAuthenticated = require('./middleware/auth').isAuthenticated,
isUnauthenticated = require('./middleware/auth').isUnauthenticated,
setRender = require('middleware-responder').setRender,
setRedirectInternal = require('middleware-responder').setRedirect,
stripeEvents = require('./middleware/stripe-events'),
upload = require('multer')({ dest: UPLOAD_DIR });
// controllers
var users = require('./controllers/users-controller'),
index = require('./controllers/index-controller'),
sessions = require('./controllers/sessions-controller'),
files = require('./controllers/files-controller');

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

  // Homepage.
  app.get('/',
    setRedirect({auth: '/home'}),
    isUnauthenticated,
    setRender('index'),
    index.getHome);

  // Sessions.
  app.get('/auth/google',
    isUnauthenticated,
    sessions.login);
  app.get('/auth/google/callback',
    setRedirect({auth: '/home', success: '/home', failure: '/'}),
    isUnauthenticated,
    sessions.postLogin);
  app.get('/logout',
    setRedirect({auth: '/', success: '/'}),
    isAuthenticated,
    sessions.logout);

  // Pages.
  app.get('/home',
    setRender('home'),
    setRedirect({auth: '/', editProfile: '/profile/edit', billing: '/billing', subscription: '/subscription' }),
    isAuthenticated,
    users.getOnboardingFlow,
    users.getDefault);
  app.get('/profile',
    setRender('profile'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getDefault);
  app.get('/profile/edit',
    setRender('profile-edit'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getDefault);
  app.get('/billing',
    setRender('billing'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getDefault);
  app.get('/subscription',
    setRender('subscription'),
    setRedirect({auth: '/', billing: '/billing'}),
    isAuthenticated,
    users.getSubscription);
  app.get('/invoice',
    setRender('invoice'),
    setRedirect({auth: '/', failure: '/subscription'}),
    isAuthenticated,
    users.getInvoice);
  app.get('/files/:fileId', files.get);

  // User API.
  app.post('/user/profile',
    setRedirect({auth: '/', success: '/profile', failure: '/profile/edit'}),
    isAuthenticated,
    upload.single('avatar'),
    users.postProfile);
  app.post('/user/billing',
    setRedirect({auth: '/', success: '/subscription', failure: '/billing'}),
    isAuthenticated,
    users.postBilling);
  app.post('/user/subscription',
    setRedirect({auth: '/', success: '/subscription', failure: '/subscription'}),
    isAuthenticated,
    users.postSubscription);
  app.post('/user/subscription/cancel',
    setRedirect({auth: '/', success: '/home', failure: '/subscription'}),
    isAuthenticated,
    users.postCancelSubscription);

  // Stripe webhook events.
  app.post('/stripe/events',
    stripeWebhook.middleware,
    stripeEvents
  );
};
