'use strict';

var moment = require('moment');
var User = require('../models/user');

function isImageMime(mime) {
  return (
      mime == 'image/png' ||
      mime == 'image/jpeg' ||
      mime == 'image/gif');
}

function joinMobilePhone(countryCode, number) {
  if (countryCode[0] != '+') {
    countryCode = '+' + countryCode;
  }
  return [countryCode, number].join(' ');
}

function getTrialEnd() {
  var trialEnd = new Date();
  trialEnd.setHours(23);
  trialEnd.setMinutes(59);
  trialEnd.setSeconds(59);
  trialEnd.setMilliseconds(0);
  if (trialEnd.getDate() > 25) {
    if (trialEnd.getMonth() == 11) {
      trialEnd.setMonth(0);
      trialEnd.setYear(trialEnd.getYear() + 1);
    } else {
      trialEnd.setMonth(trialEnd.getMonth() + 1);
    }
  }
  trialEnd.setDate(25);
  return trialEnd;
}

function createOneTimeInvoice(firstBillingDate, baseInvoice) {
  var trialEnd = getTrialEnd();
  var daysToBill = Math.floor((trialEnd.getTime() - firstBillingDate.getTime()) / (86400 * 1000));
  if (daysToBill <= 0) {
    return null;
  }
  var amountDue = Math.floor(baseInvoice.subtotal / 30 * daysToBill);
  var planName = baseInvoice.lines.data[0].plan.name;
  var fromDate = moment(firstBillingDate).format('YYYY/MM/DD');
  var toDate = moment(trialEnd).format('YYYY/MM/DD');
  var description = `${daysToBill} days of ${planName} subscription (${fromDate} - ${toDate})`;
  return {
    currency: 'jpy',
    currency_symbol: '¥',
    amount_due: amountDue,
    description: description
  };
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
    user.profile.mobilePhone.value = joinMobilePhone(req.body.mobilePhoneCountryCode, req.body.mobilePhone);
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
    user.getInvoices({ limit: 10 }, function(err, upcomingInvoice, invoices) {
      if (err) {
        error = (err && err.message) ? err.message
            : 'Your invoices could not be retrieved.';
      }
      if (!user.stripe.plan) {
        // The date needs to be adjusted if subscription hasn't been made.
        upcomingInvoice.date = getTrialEnd().getTime() / 1000;
      }
      var oneTimeInvoice = !user.stripe.plan &&
          createOneTimeInvoice(user.billing.firstBillingDate, upcomingInvoice);
      return res.render(req.render, {
        user: req.user,
        error: error,
        oneTimeInvoice: oneTimeInvoice,
        upcomingInvoice: upcomingInvoice,
        invoices: invoices,
        moment: moment
      });
    });
  });
};

exports.postSubscription = function(req, res, next) {
  var oneTimeInvoice = null;
  if (req.body.oneTimeInvoice) {
    oneTimeInvoice = JSON.parse(decodeURIComponent(req.body.oneTimeInvoice));
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setPlan({
      plan: user.membershipPlan,
      trialEnd: getTrialEnd()
    }, function(err) {
      if (err) {
        var msg = (err.code && err.code == 'card_declined')
            ? 'Your card was declined. Please provide a valid card.'
            : (err && err.message)
                ? err.message
                : 'An unexpected error occurred.';
        req.flash('errors', { msg: msg });
        return res.redirect(req.redirect.failure);
      }

      if (!oneTimeInvoice) {
        return res.redirect(req.redirect.success);
      }
      user.createInvoice(oneTimeInvoice, function(err, invoice) {
        if (err) {
          return next(err.message || 'Failed to create invoice');
        }
        return res.redirect(req.redirect.success);
      });
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

