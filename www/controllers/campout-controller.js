const base = require('airtable').base('app9sEiwyXY9fXFbQ');
const fs = require('fs');
const mustache = require('mustache');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const sendmail = require('sendmail')();

function sendEmail(email, name, textFile) {
  const templatePath = path.join(__dirname, '../views/' + textFile);
  fs.readFile(templatePath, 'utf8', (error, text) => {
    if (error) {
      console.error('Failed to load: ' + textFile);
      return;
    }
    const from = '"Straylight Campout" <campout@straylight.jp>';
    const mailOptions = {
      from: from,
      to: email,
      subject: 'Straylight Campout Registration Complete / ご登録完了',
      text: mustache.to_html(text, { name: name }),
    };
    sendmail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send email: ' + error);
      }
    });
  });
}

exports.getPasswordPage = function(req, res, next) {
  const data = {
    passwordPage: true,
    class: 'full',
  };
  res.render('campout-index', data);
}

exports.getFormPage = function(req, res, next) {
  base('Hosts').select({}).firstPage((error, records) => {
    if (error) {
      console.error('Failed to fetch Hosts: ' + error);
      return res.status(500).send('Broken backend response');
    }
    const straylightMembers = records.map((record) => ({
      id: record.id,
      name: record.get('Name'),
    })).sort((lhs, rhs) => {
      if (lhs.name < rhs.name) {
        return -1;
      }
      if (lhs.name > rhs.name) {
        return 1;
      }
      return 0;
    });
    const data = {
      formPage: true,
      straylightMembers: straylightMembers,
    };
    res.render('campout-index', data);
  });
}

exports.getPaymentPage = function(req, res, next) {
  if (req.query.email && req.query.name && req.query.customerId) {
    req.session.email = req.query.email;
    req.session.name = req.query.name;
    req.session.customerId = req.query.customerId;
  }
  const data = {
    paymentPage: true,
    email: req.session.email,
    stripePubKey: process.env.STRIPE_PUB_KEY,
  };
  res.render('campout-index', data);
}

exports.getConfirmationPage = function(req, res, next) {
  const data = {
    confirmationPage: true,
  };
  res.render('campout-index', data);
}

exports.getNoCardPage = function(req, res, next) {
  const data = {
    noCardPage: true,
  };
  res.render('campout-index', data);
}

exports.postPasswordPage = function(req, res, next) {
  if (req.body.password.toLowerCase() != 'manazuru') {
    req.flash('error', [{ msg: 'Incorrect password'}]);
    return res.redirect('/campout');
  }
  return res.redirect('/campout/form');
}

exports.postFormPage = function(req, res, next) {
  req.checkBody('name', 'Name is required.').notEmpty();
  req.checkBody('email', 'Email is required.').isEmail();
  req.checkBody('phone', 'Phone is required.').notEmpty();
  req.checkBody('address', 'Address is required.').notEmpty();
  req.checkBody('zipcode', 'Zipcode is required.').notEmpty();

  req.getValidationResult().then((result) => {
    if (!result.isEmpty()) {
      req.flash('error', result.array());
      return res.redirect('/campout/form');
    }

    base('Attendees').create({
      'Name': req.body.name,
      'Invited by': [req.body.inviter],
      'Email': req.body.email,
      'Phone': req.body.phone,
      'Postal Address 1': req.body.address,
      'Postal Code': req.body.zipcode,
      'Children': req.body.children,
      'Favorite moment': req.body.q1,
      'Participation': req.body.q2,
      'Helping': req.body.q3,
    }, (error, record) => {
      if (error) {
        console.error('Failed to add Attendee: ' + error);
        return res.status(500).send('Broken backend response');
      }
      req.session.email = req.body.email;
      req.session.name = req.body.name;
      req.session.customerId = record.getId();
      res.redirect('/campout/payment')
    });
  });
}

exports.postPaymentPage = function(req, res, next) {
  if (!req.body.stripeEmail) {
    base('Attendees').update(req.session.customerId, {
      'Payment Status': 'Unpaid',
    }, (error, record) => {
      if (error) {
        return res.status(500).send('Broken backend response');
      }
      sendEmail(req.session.email, req.session.name, 'campout-no-card-email.txt');
      res.redirect('/campout/confirmation-nocard');
    });
    return;
  }

  stripe.customers.create({
     email: req.body.stripeEmail,
    source: req.body.stripeToken
  })
  .then((customer) =>
    stripe.charges.create({
           amount: 6000,
      description: 'Straylight Campout Registration Fee',
         currency: 'jpy',
         customer: customer.id
    }))
  .then((charge) =>
    base('Attendees').update(req.session.customerId, {
      'Payment Status': 'Paid',
      'Stripe Charge ID': charge.id,
    }, (error, record) => {
      if (error) {
        return res.status(500).send('Broken backend response');
      }
      sendEmail(req.session.email, req.session.name, 'campout-confirmation-email.txt');
      res.redirect('/campout/confirmation');
    }))
  .catch((error) => {
    console.error('Failed to create charge: ' + error);
    return res.status(500).send(error + ' Please go back and try again.');
  });
}

