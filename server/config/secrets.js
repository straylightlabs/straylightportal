module.exports = {
  db: process.env.MONGO_DB_URL || `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASS}@localhost:27017/straylightportal`,

  sessionSecret: process.env.SESSION_SECRET,

  stripeOptions: {
    apiKey: process.env.STRIPE_KEY,
    stripePubKey: process.env.STRIPE_PUB_KEY,
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || 'UA-83867266-1',

  googleOAuth: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },

  asanaAccessToken: process.env.ASANA_ACCESS_TOKEN,
  augustAccessToken: process.env.AUGUST_ACCESS_TOKEN
};
