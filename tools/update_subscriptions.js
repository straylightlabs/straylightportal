const secrets = require("../server/config/secrets");
const stripe = require("stripe")(secrets.stripeOptions.apiKey);
const mongoose = require('mongoose');
const User = require('../server/models/user');

mongoose.Promise = global.Promise;
mongoose.connect(secrets.db);
mongoose.connection.on('error', () => {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

const newPlanMap = {
'Ryo Kawaguchi': 'maker_15000',
//'Taj Campbell': '',
//'Keigo Fukugaki': '',
//'Alisaun Fukugaki': '',
//'Ikue Nomura': '',
//'Jake Kerr': '',
//'Lauren Nguyen': '',
//'Mariya Suzuki': '',
//'Roy Husada': '',
//'Anuraag Agrawal': '',
//'Daniel Harris Rosen': '',
//'Jay Paul Zimmermann': '',
};

User.find({}).cursor().on('data', (user) => {
  const name = user.profile.displayName;
  console.info(name, '==================');

  const newPlan = newPlanMap[name];
  if (!newPlan || newPlan == user.membershipPlan) {
    console.info('No need to update plan.');
    return;
  }

  console.info('Updating to new plan', newPlan);
  user.membershipPlan = newPlan;

  if (user.stripe.plan && user.stripe.plan != newPlan) {
    user.stripe.plan = newPlan;
    stripe.customers.updateSubscription(user.stripe.customerId, user.stripe.subscriptionId, {
        plan: newPlan,
      }, (err, subscription) => {
        if (err) return console.error(err);
        console.info('Successfully updated stripe');
      }
    );
  }

  user.save((err) => {
    if (err) return console.error(err);
    console.info('Successfully updated mongo DB');
  });
});

