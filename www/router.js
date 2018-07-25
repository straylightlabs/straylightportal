const express = require('express');
const path = require('path');
const indexController = require('./controllers/index-controller');
const oneController = require('./controllers/one-controller');
const campoutController = require('./controllers/campout-controller');

module.exports = function(app) {
  app.use(express.static(path.join(__dirname, 'static')))
  app.get('/', indexController.get);
  app.get('/one/:memberId', oneController.get);
  app.post('/one/:memberId', oneController.post);
  app.get('/campout', campoutController.getPasswordPage);
  app.get('/campout/form', campoutController.getFormPage);
  app.get('/campout/payment', campoutController.getPaymentPage);
  app.get('/campout/confirmation', campoutController.getConfirmationPage);
  app.get('/campout/confirmation-nocard', campoutController.getNoCardPage);
  app.post('/campout/password', campoutController.postPasswordPage);
  app.post('/campout/form', campoutController.postFormPage);
  app.post('/campout/payment', campoutController.postPaymentPage);
}

