const url = require('url');

const secrets = require('./config/secrets');
const config = require('./config/main');
// middleware
const StripeWebhook = require('stripe-webhook-middleware');
const isAuthenticated = require('./middleware/auth').isAuthenticated;
const isUnauthenticated = require('./middleware/auth').isUnauthenticated;
const setRender = require('middleware-responder').setRender;
const setRedirect = require('middleware-responder').setRedirect;
const stripeEvents = require('./middleware/stripe-events');
const upload = require('multer')({ dest: config.fileUploadDir });
// controllers
const users = require('./controllers/users-controller');
const guests = require('./controllers/guests-controller');
const events = require('./controllers/events-controller');
const library = require('./controllers/library-controller');
const index = require('./controllers/index-controller');
const sessions = require('./controllers/sessions-controller');
const files = require('./controllers/files-controller');
const one = require('./controllers/one-controller');
const hooks = require('./controllers/hooks-controller');

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

  // Homepage.
  app.get('/',
    setRedirect({auth: '/home'}),
    isUnauthenticated,
    setRender('index'),
    index.getHome);

  // Sessions.
  app.get('/auth/google',
    setRedirect({auth: '/home'}),   
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
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getHome);
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
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getSubscription);
  app.get('/invoice',
    setRender('invoice'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getInvoice);
  app.get('/files/:fileId',
    setRedirect({auth: '/'}),
    isAuthenticated,
    files.get);
  app.get('/members',
    setRender('members'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getMembers);
  app.get('/guests(/:guest_id)?',
    setRender('guests'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    guests.get);
  app.get('/events(/:event_id)?',
    setRender('events'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    events.get);
  app.get('/library',
    setRender('library'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    library.get);
  app.get('/one',
    setRender('one'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    one.get);

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
    setRedirect({auth: '/', success: '/home', failure: '/subscription'}),
    isAuthenticated,
    users.postSubscription);
  app.post('/user/subscription/cancel',
    setRedirect({auth: '/', success: '/home', failure: '/subscription'}),
    isAuthenticated,
    users.postCancelSubscription);
  // Guests API.
  app.post('/guests/create',
    setRedirect({auth: '/', success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.create);
  app.post('/guests/edit/:guest_id',
    setRedirect({auth: '/', success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.edit);
  app.post('/guests/delete/:guest_id',
    setRedirect({auth: '/', success: '/guests', failure: '/guests'}),
    isAuthenticated,
    guests.delete);
  // Events API.
  app.post('/events/create',
    setRedirect({auth: '/', success: '/events', failure: '/events'}),
    isAuthenticated,
    events.create);
  app.post('/events/edit/:event_id',
    setRedirect({auth: '/', success: '/events', failure: '/events'}),
    isAuthenticated,
    events.edit);
  app.post('/events/delete/:event_id',
    setRedirect({auth: '/', success: '/events', failure: '/events'}),
    isAuthenticated,
    events.delete);
  // One JSON API.
  app.post('/one/lock',
    setRedirect({auth: '/', success: '/one', failure: '/one'}),
    isAuthenticated,
    one.postLockState);
  app.get('/one/doorlighting', one.getDoorLighting);
  app.post('/one/doorlighting',
    setRedirect({auth: '/', success: '/one', failure: '/one'}),
    isAuthenticated,
    one.postDoorLighting);

  // Stripe webhook events.
  app.post('/stripe/events',
    stripeWebhook.middleware,
    stripeEvents
  );
  // Other hooks.
  app.post('/hooks/lock', hooks.lock);
  app.post('/hooks/blescan', hooks.blescan);
};
