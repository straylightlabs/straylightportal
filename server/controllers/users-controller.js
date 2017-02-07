'use strict';

var User = require('../models/user');

exports.getDefault = function(req, res, next){
  var form = {},
  error = null,
  formFlash = req.flash('form'),
  errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  res.render(req.render, {user: req.user, form: form, error: error, plans: User.getPlans()});
};

exports.postStartSubscription = function(req, res, next) {
  var stripeToken = req.body.stripeToken;
  if (!stripeToken) {
    req.flash('errors', { msg: 'Please provide a valid card.' });
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) {
      return next(err);
    }

    console.info('setPlan');
    user.setPlan(user.membershipPlan, stripeToken, function (err) {
      if (err) {
        var msg = (err.code && err.code == 'card_declined')
            ? 'Your card was declined. Please provide a valid card.'
            : (err && err.message)
                ? err.message
                : 'An unexpected error occurred.';
        req.flash('errors', { msg: msg });
        return res.redirect(req.redirect.failure);
      }
      req.flash('success', { msg: 'You have successfully subscribed your membership.' });
      res.redirect(req.redirect.success);
    });
  });
};

exports.postCancelSubscription = function(req, res, next) {
};

