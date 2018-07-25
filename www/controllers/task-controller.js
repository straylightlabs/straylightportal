// TODO(ryok): Clean up this controller to reduce duplicated code.

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
  if (!str) {
    return '';
  }
  var date = new Date(str);
  return dateformat(date, 'dddd, mmmm d');
}

function fetchReservationsToRemind(continuation) {
  base('Reservations').select({
    view: 'Reminder Email Queue'
  }).firstPage(function(error, records) {
    if (error) {
      console.error('Fetch Reservations to remind: ' + error);
      return;
    }
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var dateStr = record.get('Date') + ' ' + record.get('Reserved Time');
      var secondsToReservation = (new Date(dateStr).getTime() - new Date().getTime()) / 1000;
      if (secondsToReservation < 86400) {
        var person = {
          reservedDate: formatDate(record.get('Date')),
          reservedTime: record.get('Reserved Time')
        };
        var reservation = {
          id: record.id,
          reservedPerson: person
        };
        var reservedPeople = record.get('Reserved Person');
        if (!reservedPeople || reservedPeople.length != 1) {
          console.error('Corrupted column: Reserved Person');
          continue;
        }
        fetchPerson(reservedPeople[0], person, function() {
          continuation(reservation);
        });
      }
    }
  });
}

function fetchPerson(id, data, continuation) {
  base('People').find(id, function(error, record) {
    if (error) {
      console.error('Fetch People by ID: ' + error);
      return;
    }
    data.name = record.get('Name');
    data.email = record.get('Email');
    data.mobile = record.get('Mobile');
    continuation();
  });
}

function sendReminderEmail(data) {
  var templatePath = path.join(__dirname, '../views/one-reservation-reminder-email.mustache');
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
      subject: 'Reminder: Straylight One Visit on ' + data.reservedDate + ' at ' + data.reservedTime,
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

function updateReservation(id) {
  base('Reservations').update(id, {
    'Sent Reminder Email': true
  }, function(error, record) {
    if (error) {
      console.error('Update Reservations: ' + error);
    }
  });
}

exports.sendReminderEmails = function() {
  console.info('Running sendReminderEmails task.');

  fetchReservationsToRemind(function(reservation) {
    sendReminderEmail(reservation.reservedPerson);
    updateReservation(reservation.id);
  });
}

