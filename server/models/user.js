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
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      isPrivate: Boolean
    },
    mobilePhone: {
      countryCode: String,
      number: String,
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
    name: String,  // deprecated
    email: String,  // deprecated
    names: [String],
    emails: [String],
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

userSchema.methods.profileImageAbsoluteUrl = function(baseUrl) {
  const url = this.profile.imageUrl;
  if (url.match(new RegExp('https?://'))) {
    return url;
  }
  return baseUrl + url;
};

userSchema.plugin(timestamps);
userSchema.plugin(stripeCustomer, secrets.stripeOptions);

module.exports = mongoose.model('User', userSchema);
