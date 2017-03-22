# Straylight Portal

Straylight Portal is a web server based on expressjs framework. It handles
basic authentication with Google OAuth2 and management of membership
subscription through [Stripe](https://stripe.com/) API.

### Requirements

- nodejs & yarn
- mongodb (consider [mlab](https://www.mlab.com/) if you want managed solution)
- nodemon (for "dev" script)

### Getting Started

First update `/server/config/secrets.js` with the following credentials:
- Stripe [API keys](https://dashboard.stripe.com/account/apikeys)
- Session secret (some random string)
- Google Analytics ID
- Google OAuth2 client ID and secret
- Asana access token

Install dependencies with `yarn install`.
Start the server with `yarn dev`.

### TODOs

- Move to client-side rendering & API server
- Isolate Straylight specific code
