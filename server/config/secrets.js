module.exports = {
  db: 'mongodb://localhost:27017/straylightportal',

  sessionSecret: process.env.SESSION_SECRET,

  stripeOptions: {
    apiKey: process.env.STRIPE_KEY,
    stripePubKey: process.env.STRIPE_PUB_KEY,
    planData: {
      'maker_standard': {
        name: 'Maker',
        price: 28000
      },
      'maker_early_discount': {
        name: 'Maker (Early Discount)',
        price: 18000
      }
    }
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || 'UA-83867266-1',

  googleOAuth: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  }
};
