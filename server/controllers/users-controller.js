'use strict';

var moment = require('moment');
var User = require('../models/user');

function isImageMime(mime) {
  return (
      mime == 'image/png' ||
      mime == 'image/jpeg' ||
      mime == 'image/gif');
}

exports.getDefault = function(req, res, next) {
  var error = null;
  var errorFlash = req.flash('error');
  if (errorFlash.length) {
    error = errorFlash[0];
  }

  res.render(req.render, {user: req.user, error: error});
};

exports.getOnboardingFlow = function(req, res, next) {
  if (req.user.isOnboarded) {
    return next();
  }
  if (!req.user.profile.isConfirmed) {
    return res.redirect(req.redirect.editProfile);
  }
  if (!req.user.stripe.last4) {
    return res.redirect(req.redirect.billing);
  }
  if (!req.user.stripe.plan) {
    return res.redirect(req.redirect.subscription);
  }
  next();
};

exports.postProfile = function(req, res, next) {
  req.assert('displayName', 'Display Name is required').notEmpty();
  req.assert('mailingAddress', 'Mailing Address is required').notEmpty();
  req.assert('mobilePhone', 'Mobile Phone is required').notEmpty();
  req.assert('mobilePhoneCountryCode', 'Mobile Phone is required').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    req.flash('errors', errors);
    return res.redirect(req.redirect.failure);
  }

  if (req.file && !isImageMime(req.file.mimetype)) {
    req.flash('error', 'The image file is not recognized.');
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.profile.displayName = req.body.displayName;
    user.profile.mailingAddress.value = req.body.mailingAddress;
    user.profile.mailingAddress.isPrivate = req.body.mailingAddressPrivate == '1';
    user.profile.mobilePhone.value = [req.body.mobilePhoneCountryCode, req.body.mobilePhone].join('-');
    user.profile.mobilePhone.isPrivate = req.body.mobilePhonePrivate == '1';
    if (req.file) {
      user.profile.imageUrl = '/portal/files/' + req.file.filename + '?mime=' + encodeURIComponent(req.file.mimetype);
    }
    user.profile.isConfirmed = true;

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect(req.redirect.success);
    });
  });
};

exports.postBilling = function(req, res, next) {
  var stripeToken = req.body.stripeToken;
  if (!stripeToken) {
    req.flash('errors', { msg: 'Please provide a valid card.' });
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setCard(stripeToken, function(err) {
      if (err) {
        var msg = (err.code && err.code == 'card_declined')
            ? 'Your card was declined. Please provide a valid card.'
            : (err && err.message)
                ? err.message
                : 'An unexpected error occurred.';
        req.flash('errors', { msg: msg });
        return res.redirect(req.redirect.failure);
      }
      user.billing.companyName = req.body.companyName;
      user.billing.address.street = req.body.addressStreet;
      user.billing.address.city = req.body.addressCity;
      user.billing.address.state = req.body.addressState;
      user.billing.address.zip = req.body.addressZip;
      user.save(function(err) {
        if (err) {
          req.flash('errors', { msg: err });
          return res.redirect(req.redirect.failure);
        }
        return res.redirect(req.redirect.success);
      });
    });
  });
};

exports.getSubscription = function(req, res, next) {
  var error = null;
  var errorFlash = req.flash('error');
  if (errorFlash.length) {
    error = errorFlash[0];
  }

  if (!req.user.stripe.customerId) {
    return res.redirect(req.billing);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    // TODO(ryok): Support pagination.
    user.getInvoices(10 /* limit */, function(err, upcomingInvoice, invoices) {
      if (err) {
        error = (err && err.message) ? err.message
            : 'Your invoices could not be retrieved.';
      }
      return res.render(req.render, {
        user: req.user,
        error: error,
        upcomingInvoice: upcomingInvoice,
        invoices: invoices,
        moment: moment});
    });
  });
};

exports.postSubscription = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setPlan(user.membershipPlan, null /* token */, function(err) {
      if (err) {
        var msg = (err.code && err.code == 'card_declined')
            ? 'Your card was declined. Please provide a valid card.'
            : (err && err.message)
                ? err.message
                : 'An unexpected error occurred.';
        req.flash('errors', { msg: msg });
        return res.redirect(req.redirect.failure);
      }
      if (!user.isOnboarded) {
        user.isOnboarded = true;
        user.save(function(err) {
          if (err) return next(err);
          return res.redirect(req.redirect.success);
        });
      } else {
        return res.redirect(req.redirect.success);
      }
    });
  });
};

exports.postCancelSubscription = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.cancelStripe(function(err) {
      if (err) {
        var msg = (err && err.message) ? err.message
            : 'An unexpected error occurred.';
        req.flash('errors', { msg: msg });
        return res.redirect(req.redirect.failure);
      }
      req.flash('success', { msg: 'You have successfully canceled subscription.' });
      res.redirect(req.redirect.success);
    });
  });
};

exports.getInvoice = function(req, res, next) {
  if (!req.query.id) {
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.getInvoice(req.query.id, function(err, invoice) {
      var error = null;
      if (err) {
        error = (err && err.message) ? err.message
            : 'Your invoice could not be retrieved.';
      }
      return res.render(req.render, {
        user: req.user,
        error: error,
        invoice: invoice,
        moment: moment});
    });
  });
};

