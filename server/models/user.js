var mongoose = require('mongoose');
var stripeCustomer = require('./plugins/stripe-customer');
var secrets = require('../config/secrets');
var timestamps = require('mongoose-timestamp');

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  membershipPlan: String,
  profile: {
    displayName: String,
    imageUrl: String
  }
});

userSchema.plugin(timestamps);
userSchema.plugin(stripeCustomer, secrets.stripeOptions);

module.exports = mongoose.model('User', userSchema);
