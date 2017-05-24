const asana = require('asana');
const google = require('googleapis');
const moment = require('moment');
const calendar = google.calendar('v3');
const secrets = require('../config/secrets');

const EXTERNAL_CAL_ID = 'primary';
const INTERNAL_CAL_ID = 'straylight.jp_dvovuo73ok4pjq7qf6q5vg76lg@group.calendar.google.com';
const DEFAULT_TIME = '15:00';

function joinPhrases(phrases) {
  var joined = phrases.slice(0, -1).join(', ');
  if (phrases.length > 1) {
    joined += ' and ';
  }
  if (phrases.length > 0) {
    joined += phrases[phrases.length - 1];
  }
  return joined;
}

function getTimeOptions() {
  var options = [];
  var time = moment().startOf('day');
  while (true) {
    time.add(1800, 'seconds');
    const option = time.format('HH:mm');
    if (option === '00:00') {
      break;
    }
    options.push(option);
  }
  return options;
}

function isValidDate(date) {
  var daysApart = Math.abs(new Date().getTime() - date.getTime()) / 86400000;
  return daysApart < 365;
}

function parseGuestData(req, res, next) {
  req.sanitizeBody('date').trim();
  req.sanitizeBody('timeStart').trim();
  req.sanitizeBody('timeEnd').trim();

  var errors = req.validationErrors();

  var names = req.body.names.map(n => n.trim()).filter(n => n);
  var emails = req.body.emails.map(n => n.trim()).filter(n => n);
  if (names.length === 0) {
    errors.push('Please enter at least one guest name');
  }
  if (names.length !== emails.length) {
    errors.push('Please provide one email for each guest');
  }

  var dateStart = new Date(`${req.body.date} ${req.body.timeStart}`);
  var dateEnd = new Date(`${req.body.date} ${req.body.timeEnd}`);
  if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
    errors.push('Please format the date and times correctly');
  }

  next(errors, {
    id: req.params.guest_id,
    names: names,
    emails: emails,
    dateStart: dateStart,
    dateEnd: dateEnd,
    project: req.body.project,
    notes: req.body.notes
  });
}

function postCalendarEvent(event) {
  return new Promise(function(resolve, reject) {
    const next = function(err, event) {
      if (err) return reject(err);
      resolve(event);
    };
    if (event.eventId) {
      calendar.events.update(event, next);
    } else {
      calendar.events.insert(event, next);
    }
  });
}

function postInternalCalendarEvent(user, guest) {
  return postCalendarEvent({
    calendarId: INTERNAL_CAL_ID,
    sendNotifications: true,
    eventId: guest.internalEventId,
    resource: {
      "start": {
        "dateTime": guest.dateStart.toISOString()
      },
      "end": {
        "dateTime": guest.dateEnd.toISOString()
      },
      "attendees": [],
      "summary": `Guest - ${joinPhrases(guest.names)}`,
      "description":
          `Guest: ${joinPhrases(guest.names)}\n` +
          `Host: ${user.profile.displayName}\n` +
          `Project: ${guest.project}\n\n` +
          `Notes: ${guest.notes}\n`,
      "location": "Straylight, Shibuya, Tokyo"
    }
  });
}

function postExternalCalendarEvent(user, guest) {
  return postCalendarEvent({
    calendarId: EXTERNAL_CAL_ID,
    sendNotifications: true,
    eventId: guest.externalEventId,
    resource: {
      "start": {
        "dateTime": guest.dateStart.toISOString()
      },
      "end": {
        "dateTime": guest.dateEnd.toISOString()
      },
      "attendees": [
        {
          "email": user.email
        },
      ].concat(guest.emails.map(email => (
        {
          "email": email
        }
      ))),
      "summary": "Straylight visit",
      "description":
        `Dear ${joinPhrases(guest.names)},\n` +
        `${user.profile.displayName} has invited you to visit Straylight.\n\n` +  
        'We are located 1-minute west of Yoyogi-Hachiman Station in the Createur Building. Follow the stairs up to 3rd floor and head to the door on your left.\n\n' +
        'Straylight\n' +
        'Createur 3C, 4-5 Motoyoyogicho\n' +
        'Shibuya-ku, Tokyo 151-0062\n' +
        'https://goo.gl/maps/nd3kzhkqAax',
      "location": "Straylight, Shibuya, Tokyo"
    },
  });
}

function deleteCalendarEvent(calendarId, eventId) {
  return new Promise(function(resolve, reject) {
    calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendNotifications: true
    }, function(err, event) {
      if (err) return reject(err);
      resolve(event);
    });
  });
}

function getAsanaProjects() {
  return new Promise(function(resolve, reject) {
    var client = asana.Client.create().useAccessToken(secrets.asanaAccessToken);
    client.projects.findAll({
      workspace: '54354912735116',
      team: '251909689419307',
      archived: false
    }, {
      public: true,
      limit: 100
    }).then(function(projects) {
      resolve(projects.data.map(p => p.name).filter(p => p.indexOf('TEMPLATE') < 0));
    }).catch(reject);
  });
}

exports.get = function(req, res, next) {
  req.sanitizeQuery('copy').toBoolean();

  getAsanaProjects().then(function(projects) {
    const now = new Date().getTime();
    const upcomingGuests = req.user.guests
        .filter(g => g.dateStart.getTime() > now)
        .sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
    const pastGuests = req.user.guests
        .filter(g => g.dateStart.getTime() <= now)
        .sort((a, b) => b.dateStart.getTime() - a.dateStart.getTime());
    var guestById = req.params.guest_id && req.user.guests.id(req.params.guest_id);
    if (guestById) {
      guestById.upcoming = guestById.dateStart.getTime() > now;
      guestById.timeStart = moment(guestById.dateStart).format('HH:mm');
      guestById.timeEnd = moment(guestById.dateEnd).format('HH:mm');
      guestById.copy = req.query.copy;
    }
    res.render(req.render, {
      user: req.user,
      upcomingGuests: upcomingGuests,
      pastGuests: pastGuests,
      guest: guestById || {
        timeStart: DEFAULT_TIME,
        timeEnd: DEFAULT_TIME
      },
      projects: projects,
      timeOptions: getTimeOptions()
    });
  }).catch(next);
};

exports.create = function(req, res, next) {
  parseGuestData(req, res, function(err, guest) {
    if (err) {
      req.flash('error', err);
      return res.redirect(req.redirect.failure);
    }

    Promise.all([
      postInternalCalendarEvent(req.user, guest),
      postExternalCalendarEvent(req.user, guest)])
    .then(function(events) {
      guest.internalEventId = events[0].id;
      guest.externalEventId = events[1].id;
      req.user.guests.push(guest);
      req.user.save(function(err) {
        if (err) return next(err);

        req.flash('success', 'Your guest registration is complete');
        res.redirect(req.redirect.success);
      });
    }).catch(next);
  });
};

exports.edit = function(req, res, next) {
  parseGuestData(req, res, function(err, guest) {
    if (err) {
      req.flash('error', err);
      return res.redirect(req.redirect.failure);
    }

    var updatedGuest = req.user.guests.id(guest.id);
    if (!updatedGuest) return next('Invalid or missing guest ID');

    updatedGuest.names = guest.names;
    updatedGuest.emails = guest.emails;
    updatedGuest.date = guest.date;
    updatedGuest.dateStart = guest.dateStart;
    updatedGuest.dateEnd = guest.dateEnd;
    updatedGuest.notes = guest.notes;

    req.user.save(function(err) {
      if (err) return next(err);

      Promise.all([
        postInternalCalendarEvent(req.user, updatedGuest),
        postExternalCalendarEvent(req.user, updatedGuest)])
      .then(function(values) {
        req.flash('success', 'Your guest registration has been updated');
        res.redirect(req.redirect.success);
      }).catch(next);
    });
  });
};

exports.delete = function(req, res, next) {
  var guest = req.user.guests.id(req.params.guest_id);
  if (!guest) {
    return next('Missing or invalid guest ID');
  }

  var internalEventId = guest.internalEventId;
  var externalEventId = guest.externalEventId;

  guest.remove();
  req.user.save(function(err) {
    if (err) return next(err);

    Promise.all([
      deleteCalendarEvent(INTERNAL_CAL_ID, internalEventId),
      deleteCalendarEvent(EXTERNAL_CAL_ID, externalEventId)])
    .then(function(values) {
      req.flash('success', 'Your guest registration has been canceled');
      res.redirect(req.redirect.success);
    })
    .catch(next);
  })
};
