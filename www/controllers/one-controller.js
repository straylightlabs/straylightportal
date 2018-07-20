const base = require('airtable').base('appI5wbax01HyDamh');
const dateformat = require('dateformat');
const fs = require('fs');
const mustache = require('mustache');
const path = require('path');
if (process.env.STRAYLIGHTMAILER_PASSWORD) {
  const transporter = require('nodemailer').createTransport('smtps://straylightmailer%40gmail.com:' + process.env.STRAYLIGHTMAILER_PASSWORD + '@smtp.gmail.com');
  var sendmail = transporter.sendMail.bind(transporter);
} else {
  var sendmail = require('sendmail')();
}

function formatDate(str) {
  if (!str || str.length == 0) {
    return '';
  }
  if (str.constructor === Array) {
    str = str[0];
  }
  var date = new Date(str);
  return dateformat(date, 'dddd, mmmm d');
}

function parseTime(str) {
  var c = str.split(':');
  return parseInt(c[0]) * 60 + parseInt(c[1]);
}

function fetchReservations(req, res, data, continuation) {
  base('Reservations').select({
    view: 'Available Dates'
  }).firstPage(function(error, records) {
    if (error) {
      console.error('Fetch Reservations: ' + error);
      res.status(500).send('Broken backend response');
      return;
    }
    data.availableDates = records.map(function(record) {
      return {
        id: record.id,
        date: formatDate(record.get('Date')),
        startTime: parseTime(record.get('Start Time')),
        endTime: parseTime(record.get('End Time'))
      };
    });
    continuation();
  });
}

function fetchPerson(req, res, data, continuation) {
  var memberId = req.params.memberId;
  base('People').select({
    view: 'Everyone',
    filterByFormula: "{Invitation URL} = '" + memberId + "'"
  }).firstPage(function(error, records) {
    if (error) {
      console.error('Fetch People: ' + error);
      res.status(500).send('Broken backend response');
      return;
    }
    if (records.length == 0) {
      data.error = true;
    } else if (records.length > 1) {
      console.error('Multiple records for the key: ' + memberId);
      data.error = true;
    } else {
      var person = records[0];
      data.personId = person.id;
      data.name = person.get('Name');
      data.firstName = person.get('First Name');
      data.email = person.get('Email');
      data.mobile = person.get('Mobile');
      data.reservedDate = formatDate(person.get('Reserved Date'));
      data.reservedTime = person.get('Reserved Time');
    }
    continuation();
  });
}

exports.get = function(req, res, next) {
  var data = {
    loadCount: 0
  };

  function maybeRender() {
    if (++data.loadCount >= 2) {
      console.info('Page Requested: ' + JSON.stringify(data));
      res.render('one-reservation', data);
    }
  }

  fetchReservations(req, res, data, function() { maybeRender(data); });
  fetchPerson(req, res, data, function() { maybeRender(data); });
}

function updateReservation(req, res, continuation) {
  base('Reservations').update(req.body.date, {
    'Reserved Person': [req.body.person],
    'Reserved Time': req.body.time
  }, function(error, record) {
    if (error) {
      console.error('Update Reservations: ' + error);
      res.status(500).send('Broken backend response');
      return;
    }
    continuation();
  });
}

function updatePerson(req, res, continuation) {
  base('People').update(req.body.person, {
    'Email': req.body.email,
    'Mobile': req.body.mobile,
  }, function(error, record) {
    if (error) {
      console.error('Update People: ' + error);
      res.status(500).send('Broken backend response');
      return;
    }
    continuation();
  });
}

function sendEmailConfirmation(data) {
  var templatePath = path.join(__dirname, '../views/one-reservation-confirmation-email.mustache');
  fs.readFile(templatePath, 'utf8', function(error, template) {
    if (error) {
      console.error('Send Mail Template: ' + error);
      return;
    }
    var from = '"Straylight One" <one@straylight.jp>';
    var mailOptions = {
      from: from,
      to: data.email,
      bcc: from,
      subject: 'Straylight One Visit on ' + data.reservedDate + ' at ' + data.reservedTime,
      text: mustache.to_html(template, data)
    };
    sendmail(mailOptions, function(error, info) {
      console.info('Send Email: ' + JSON.stringify(info));
      if (error) {
        console.error('Send Email: ' + error);
      }
    });
  });
}

exports.post = function(req, res, next) {
  if (!req.body.date || !req.body.time || !req.body.email) {
    exports.get(req, res, next);
    return;
  }

  var data = {
    updateCount: 0
  };

  function maybeRender() {
    if (++data.updateCount >= 2) {
      fetchPerson(req, res, data, function() {
        sendEmailConfirmation(data);
        res.render('one-reservation', data);
      });
    }
  }

  updateReservation(req, res, function() { maybeRender(data); });
  updatePerson(req, res, function() { maybeRender(data); });
}

