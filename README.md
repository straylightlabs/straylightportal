# Straylight Portal

This project is an expressjs app, largely based on [eddywashere's template](https://github.com/eddywashere/node-stripe-membership-saas) as of now. It handles basic authentication with Google OAuth2 and management of membership subscription through [Stripe](https://stripe.com/) API.

### Requirements

- nodejs & npm
- mongodb
- nodemon (for faster development)

### Getting Started

First update `/server/config/secrets.js` with the following credentials:
- Stripe [API keys](https://dashboard.stripe.com/account/apikeys) and [plan info](https://dashboard.stripe.com/test/plans)
- Session secret
- Google Analytics ID
- Google OAuth2 client ID and secret

Install dependencies with `npm install`.
Start the server with `nodemon server`.
