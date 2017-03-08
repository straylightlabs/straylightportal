var mongoose = require('mongoose');
var stripeCustomer = require('./plugins/stripe-customer');
var secrets = require('../config/secrets');
var timestamps = require('mongoose-timestamp');

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  membershipPlan: String,
  isOnboarded: Boolean,
  profile: {
    displayName: String,
    imageUrl: String,
    mailingAddress: {
      value: String,
      isPrivate: Boolean
    },
    mobilePhone: {
      value: String,
      isPrivate: Boolean
    },
    isConfirmed: Boolean
  },
  billing: {
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    },
    companyName: String
  }
});

userSchema.plugin(timestamps);
userSchema.plugin(stripeCustomer, secrets.stripeOptions);

module.exports = mongoose.model('User', userSchema);
