'use strict';

var Stripe = require('stripe'),
stripe;

module.exports = exports = function stripeCustomer (schema, options) {
  const TAX_PERCENT = 8;

  stripe = Stripe(options.apiKey);

  schema.add({
    stripe: {
      customerId: String,
      subscriptionId: String,
      last4: String,
      plan: String
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.stripe.customerId) return next();
    user.createCustomer(function(err){
      if (err) return next(err);
      next();
    });
  });

  schema.methods.getPlan = function () {
    return options.planData[this.stripe.plan];
  };

  schema.methods.getMembershipPlan = function () {
    return options.planData[this.membershipPlan];
  };

  schema.methods.createCustomer = function(cb) {
    var user = this;

    stripe.customers.create({
      email: user.email
    }, function(err, customer){
      if (err) return cb(err);

      user.stripe.customerId = customer.id;
      return cb();
    });
  };

  schema.methods.setCard = function(stripe_token, cb) {
    var user = this;

    var cardHandler = function(err, customer) {
      if (err) return cb(err);

      if(!user.stripe.customerId){
        user.stripe.customerId = customer.id;
      }

      var card = customer.cards ? customer.cards.data[0] : customer.sources.data[0];

      user.stripe.last4 = card.last4;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    if(user.stripe.customerId){
      stripe.customers.update(user.stripe.customerId, {card: stripe_token}, cardHandler);
    } else {
      stripe.customers.create({
        email: user.email,
        card: stripe_token
      }, cardHandler);
    }
  };

  schema.methods.setPlan = function(options, cb) {
    var user = this,
    customerData = {
      plan: options.plan
    };

    var subscriptionHandler = function(err, subscription) {
      if(err) return cb(err);

      user.stripe.plan = options.plan;
      user.stripe.subscriptionId = subscription.id;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    var createSubscription = function(){
      stripe.customers.createSubscription(
        user.stripe.customerId,
        {
          plan: options.plan,
          tax_percent: TAX_PERCENT,
          trial_end: options.trialEnd && options.trialEnd.getTime() / 1000
        },
        subscriptionHandler
      );
    };

    if(options.stripe_token) {
      user.setCard(options.stripe_token, function(err){
        if (err) return cb(err);
        createSubscription();
      });


    } else {
      if (user.stripe.subscriptionId){
        // update subscription
        stripe.customers.updateSubscription(
          user.stripe.customerId,
          user.stripe.subscriptionId,
          {
            plan: options.plan,
            tax_percent: TAX_PERCENT
          },
          subscriptionHandler
        );
      } else {
        createSubscription();
      }
    }
  };

  schema.methods.updateStripeEmail = function(cb){
    var user = this;

    if(!user.stripe.customerId) return cb();

    stripe.customers.update(user.stripe.customerId, {email: user.email}, function(err, customer) {
      cb(err);
    });
  };

  function setCurrencySymbol(invoice) {
    invoice.currency_symbol = invoice.currency;
    switch (invoice.currency) {
      case 'jpy':
        invoice.currency_symbol = '¥';
        break;
      case 'usd':
        invoice.currency_symbol = '$';
        break;
      case 'eur':
        invoice.currency_symbol = '€';
        break;
    }
  }

  schema.methods.getInvoices = function(options, cb) {
    var user = this;

    if (!user.stripe.customerId) return cb();

    // TODO(ryok): Parallelize the calls.
    stripe.invoices.list({
      limit: options.limit,
      customer: user.stripe.customerId
    }, function(err, invoices) {
      if (err) {
        return cb(err);
      }
      if (!invoices || !Array.isArray(invoices.data)) {
        return cb({message: 'Failed to retrieve past invoices'});
      }
      invoices.data.forEach(function(invoice) {
        setCurrencySymbol(invoice);
      });

      var req;
      if (user.stripe.subscriptionId) {
        req = { subscription: user.stripe.subscriptionId };
      } else {
        req = {
          subscription_plan: user.membershipPlan,
          subscription_tax_percent: TAX_PERCENT
        };
      }
      stripe.invoices.retrieveUpcoming(user.stripe.customerId, req, function(err, upcomingInvoice) {
        if (err) {
          return cb(err);
        }
        if (!upcomingInvoice) {
          return cb({message: 'Failed to retrieve upcoming invoice'});
        }
        setCurrencySymbol(upcomingInvoice);
        cb(null, upcomingInvoice, invoices.data);
      });
    });
  };

  schema.methods.getInvoice = function(id, cb) {
    var user = this;

    if (!user.stripe.customerId) return cb();

    stripe.invoices.retrieve(id, function(err, invoice) {
      setCurrencySymbol(invoice);
      cb(err, invoice);
    });
  };

  schema.methods.createInvoice = function(options, cb) {
    var user = this;

    if (!user.stripe.customerId ||
        !user.stripe.subscriptionId) {
      return cb({message: 'customerId or subscriptionId missing'});
    }

    stripe.invoiceItems.create({
      customer: user.stripe.customerId,
      amount: options.amount_due,
      currency: options.currency,
      description: options.description,
      subscription: user.stripe.subscriptionId
    }, function(err, invoiceItem) {
      if (err) return cb(err);

      stripe.invoices.create({
        customer: user.stripe.customerId,
        description: options.description,
        subscription: user.stripe.subscriptionId,
        tax_percent: TAX_PERCENT
      }, cb);
    });
  };

  schema.methods.cancelStripe = function(cb){
    var user = this;

    if(user.stripe.customerId){
      stripe.customers.del(
        user.stripe.customerId
      ).then(function(confirmation) {
        user.stripe = {};
        user.save(function(err) {
          return cb(err);
        });
      }, function(err) {
        return cb(err);
      });
    } else {
      cb();
    }
  };
};
