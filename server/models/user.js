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
    currentLocation: String,
    bio: String,
    interests: String,
    isConfirmed: Boolean
  },
  billing: {
    // TODO(ryok): Take from "invoice.source".
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    },
    companyName: String,
    firstBillingDate: Date
  },
  guests: [{
    name: String,
    email: String,
    dateStart: Date,
    dateEnd: Date,
    project: String,
    notes: String,
    internalEventId: String,
    externalEventId: String
  }],
  oauth2: {
    accessToken: String,
    refreshToken: String
  }
});

userSchema.plugin(timestamps);
userSchema.plugin(stripeCustomer, secrets.stripeOptions);

module.exports = mongoose.model('User', userSchema);
