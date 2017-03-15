const UPLOAD_DIR = 'uploads/';

const url = require('url');

const secrets = require('./config/secrets');
// middleware
const StripeWebhook = require('stripe-webhook-middleware');
const isAuthenticated = require('./middleware/auth').isAuthenticated;
const isUnauthenticated = require('./middleware/auth').isUnauthenticated;
const setRender = require('middleware-responder').setRender;
const setRedirect = require('middleware-responder').setRedirect;
const stripeEvents = require('./middleware/stripe-events');
const upload = require('multer')({ dest: UPLOAD_DIR });
// controllers
const users = require('./controllers/users-controller');
const guests = require('./controllers/guests-controller');
const index = require('./controllers/index-controller');
const sessions = require('./controllers/sessions-controller');
const files = require('./controllers/files-controller');

var stripeWebhook = new StripeWebhook({
  stripeApiKey: secrets.stripeOptions.apiKey,
  respond: true
});

module.exports = function(app, passport) {

  // Prepend base_url to every redirection path.
  app.use(function(req, res, next) {
    if (!res.locals.base_url) {
      return next();
    }
    var base_path = url.parse(res.locals.base_url).pathname;
    if (base_path == '/') {
      return next();
    }
    var redirect = res.redirect;
    res.redirect = function() {
      var i = 0;
      if (arguments.length == 2) {
        i++;  // skip "status"
      }
      arguments[i] = base_path + arguments[i];
      redirect.apply(res, arguments);
    };
    next();
  });

  // Add a method to redirect to a different page during onboarding.
  app.use(function(req, res, next) {
    res.onboardOr = function(user, innerNext) {
      if (!user.isOnboarded) {
        if (!user.profile.isConfirmed) {
          return res.redirect('/profile/edit');
        }
        if (!user.stripe.last4) {
          return res.redirect('/billing');
        }
        if (!user.stripe.plan) {
          return res.redirect('/subscription');
        }
      }
      innerNext();
    };
    next();
  });

  // Common redirect options.
  app.use(setRedirect({
    auth: '/'
  }));

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
    isAuthenticated,
    users.getHome);
  app.get('/profile',
    setRender('profile'),
    isAuthenticated,
    users.getDefault);
  app.get('/profile/edit',
    setRender('profile-edit'),
    isAuthenticated,
    users.getDefault);
  app.get('/billing',
    setRender('billing'),
    isAuthenticated,
    users.getDefault);
  app.get('/subscription',
    setRender('subscription'),
    isAuthenticated,
    users.getSubscription);
  app.get('/invoice',
    setRender('invoice'),
    isAuthenticated,
    users.getInvoice);
  app.get('/files/:fileId', files.get);
  app.get('/members',
    setRender('members'),
    isAuthenticated,
    users.getMembers);
  app.get('/guests(/:guest_id)?',
    setRender('guests'),
    isAuthenticated,
    guests.get);

  // User API.
  app.post('/user/profile',
    setRedirect({success: '/profile', failure: '/profile/edit'}),
    isAuthenticated,
    upload.single('avatar'),
    users.postProfile);
  app.post('/user/billing',
    setRedirect({success: '/subscription', failure: '/billing'}),
    isAuthenticated,
    users.postBilling);
  app.post('/user/subscription',
    setRedirect({success: '/home', failure: '/subscription'}),
    isAuthenticated,
    users.postSubscription);
  app.post('/user/subscription/cancel',
    setRedirect({success: '/home', failure: '/subscription'}),
    isAuthenticated,
    users.postCancelSubscription);
  // Guests API.
  app.post('/guests/create',
    setRedirect({success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.create);
  app.post('/guests/edit/:guest_id',
    setRedirect({success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.edit);
  app.post('/guests/delete/:guest_id',
    setRedirect({success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.delete);

  // Stripe webhook events.
  app.post('/stripe/events',
    stripeWebhook.middleware,
    stripeEvents
  );
};
