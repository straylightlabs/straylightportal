'use strict';

var moment = require('moment');
var User = require('../models/user');
var NotFoundError = require('../middleware/error').NotFoundError;

const MSECS_PER_DAY = 86400 * 1000;

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
  var daysToBill = Math.floor((trialEnd.getTime() - firstBillingDate.getTime()) / MSECS_PER_DAY);
  if (daysToBill <= 0) {
    return null;
  }
  var amountDue = Math.floor(baseInvoice.subtotal / 30 * daysToBill);
  var planName = baseInvoice.lines.data[0].plan.name;
  var fromDate = moment(firstBillingDate).format('YYYY/MM/DD');
  var toDate = moment(trialEnd).format('YYYY/MM/DD');
  var description = `${planName} (${fromDate} - ${toDate})`;
  return {
    currency: 'jpy',
    currency_symbol: '¥',
    amount_due: amountDue,
    description: description
  };
}

function handleOneTimeInvoice(user, req, res, next) {
  if (!req.body.oneTimeInvoice) {
    next();
  }
  // TODO(ryok): Insecure. Use session.
  var oneTimeInvoice = JSON.parse(decodeURIComponent(req.body.oneTimeInvoice));
  user.createInvoice(oneTimeInvoice, next);
}

function handleStripeError(err, req, res, next) {
  if (err.message) {
    req.flash('error', err.message);
    return res.redirect(req.redirect.failure);
  }
  next(err);
}

exports.getHome = function(req, res, next) {
  res.onboardOr(req.user, function() {
    res.render(req.render, {user: req.user});
  });
};

exports.getDefault = function(req, res, next) {
  res.render(req.render, {user: req.user});
};

exports.postProfile = function(req, res, next) {
  req.sanitizeBody('displayName').trim();
  req.sanitizeBody('mailingAddress').trim();
  req.sanitizeBody('mailingAddressPrivate').toBoolean();
  req.sanitizeBody('mobilePhonePrivate').toBoolean();
  req.sanitizeBody('currentLocation').trim();

  req.checkBody('displayName', 'Display Name is required').notEmpty();
  req.checkBody('mailingAddress', 'Mailing Address is required').notEmpty();
  req.checkBody('mobilePhone', 'Mobile Phone is required').notEmpty().isInt();
  req.checkBody('mobilePhoneCountryCode', 'Country Code is required').matches('^\\+[0-9]{1,3}$');

  var errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors);
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
    user.profile.mailingAddress.isPrivate = req.body.mailingAddressPrivate;
    user.profile.mobilePhone.value = joinMobilePhone(req.body.mobilePhoneCountryCode, req.body.mobilePhone);
    user.profile.mobilePhone.isPrivate = req.body.mobilePhonePrivate;
    user.profile.currentLocation = req.body.currentLocation;
    user.profile.bio = req.body.bio;
    user.profile.interests = req.body.interests;
    if (req.file) {
      user.profile.imageUrl = `{{res.locals.base_url}}/files/${req.file.filename}?mime=${encodeURIComponent(req.file.mimetype)}`;
    }
    user.profile.isConfirmed = true;

    user.save(function(err) {
      if (err) return next(err);

      req.flash('success', 'Profile information updated');
      res.onboardOr(user, function() {
        res.redirect(req.redirect.success);
      });
    });
  });
};

exports.postBilling = function(req, res, next) {
  req.sanitizeBody('addressStreet').trim();
  req.sanitizeBody('addressCity').trim();
  req.sanitizeBody('addressState').trim();
  req.sanitizeBody('addressZip').trim();

  req.checkBody('stripeToken', 'Please provide a valid card').notEmpty();
  req.checkBody('addressStreet', 'Street Address is required').notEmpty();
  req.checkBody('addressCity', 'City is required').notEmpty();
  req.checkBody('addressState', 'State / Prefecture is required').notEmpty();
  req.checkBody('addressZip', 'Zip Code is required').matches('^[-0-9]{1,8}$');

  var errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors);
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setCard(req.body.stripeToken, function(err) {
      if (err) return handleStripeError(err, req, res, next);

      user.billing.companyName = req.body.companyName;
      user.billing.address.street = req.body.addressStreet;
      user.billing.address.city = req.body.addressCity;
      user.billing.address.state = req.body.addressState;
      user.billing.address.zip = req.body.addressZip;
      user.save(function(err) {
        if (err) return next(err);

        res.onboardOr(user, function() {
          res.redirect(req.redirect.success);
        });
      });
    });
  });
};

exports.getSubscription = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    if (!user.stripe.last4) return next('Billing information missing');

    // TODO(ryok): Support pagination.
    user.getInvoices({ limit: 50 }, function(err, upcomingInvoice, invoices) {
      if (err) return handleStripeError(err, req, res, next);

      var oneTimeInvoice;
      if (!user.stripe.plan) {
        // The date needs to be adjusted if subscription hasn't been created.
        upcomingInvoice.date = getTrialEnd().getTime() / 1000;
        // One-time, prorated invoice for the membership until the trial ends.
        oneTimeInvoice = createOneTimeInvoice(user.billing.firstBillingDate, upcomingInvoice);
      }
      return res.render(req.render, {
        user: req.user,
        oneTimeInvoice: oneTimeInvoice,
        upcomingInvoice: upcomingInvoice,
        invoices: invoices,
        moment: moment
      });
    });
  });
};

exports.postSubscription = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setPlan({
      plan: user.membershipPlan,
      trialEnd: getTrialEnd()
    }, function(err) {
      if (err) return handleStripeError(err, req, res, next);

      handleOneTimeInvoice(user, req, res, function(err) {
        if (err) return handleStripeError(ett, req, res, next);

        user.isOnboarded = true;
        user.save(function(err) {
          if (err) return next(err);

          req.flash('success', 'You have successfully subscribed');
          res.redirect(req.redirect.success);
        });
      });
    });
  });
};

exports.postCancelSubscription = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.cancelStripe(function(err) {
      if (err) return handleStripeError(err, req, res, next);

      user.billing.firstBillingDate = new Date();
      user.save(function(err) {
        if (err) return next(err);

        req.flash('success', 'You have successfully canceled subscription');
        res.redirect(req.redirect.success);
      });
    });
  });
};

exports.getInvoice = function(req, res, next) {
  if (!req.query.id) {
    return next(new NotFoundError('Invoice not found'));
  }

  // TODO(ryok): Wait.. why req.user isn't enough?
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.getInvoice(req.query.id, function(err, invoice) {
      if (err) return handleStripeError(err, req, res, next);

      return res.render(req.render, {
        user: req.user,
        invoice: invoice,
        moment: moment});
    });
  });
};

exports.getMembers = function(req, res, next) {
  User.find({}, function(err, users) {
    if (err) return next(err);

    users.forEach(function(u) {
      if (u.id != req.user.id) {
        u.hidePrivateInfo = true;
      }
    });
    users.sort(function(lhs, rhs) {
      lhs = lhs.profile.displayName.toUpperCase();
      rhs = rhs.profile.displayName.toUpperCase();
      if (lhs < rhs) {
        return -1;
      }
      if (lhs > rhs) {
        return 1;
      }
      return 0;
    });

    res.render(req.render, {
      user: req.user,
      users: users
    });
  });
};
