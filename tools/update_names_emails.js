const mongoose = require('mongoose');
const secrets = require("../server/config/secrets");
const User = require('../server/models/user');

mongoose.Promise = global.Promise;
mongoose.connect(secrets.db).then(() => {
  console.info('Connected to MongoDB.');
}).catch(err => {
  console.error('MongoDB connection Error. Make sure MongoDB is running.');
});

User.find({}).cursor().on('data', (user) => {
  var shouldUpdate = false;
  user.guests.forEach(guest => {
    if (guest.name) {
      guest.name = null;
      guest.names = [guest.name];
      shouldUpdate = true;
    }
    if (guest.email) {
      guest.email = null;
      guest.emails = [guest.email];
      shouldUpdate = true;
    }
  });
  if (shouldUpdate) {
    user.save((err) => {
      if (err) return console.error(err);
      console.info('Successfully updated ' + user.profile.displayName);
    });
  }
});

