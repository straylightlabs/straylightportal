const asana = require('asana');
const google = require('googleapis');
const calendar = google.calendar('v3');
const secrets = require('../config/secrets');

const EXTERNAL_CAL_ID = 'primary';
const INTERNAL_CAL_ID = 'straylight.jp_dvovuo73ok4pjq7qf6q5vg76lg@group.calendar.google.com';

function isValidDate(date) {
  var daysApart = Math.abs(new Date().getTime() - date.getTime()) / 86400000;
  return daysApart < 365;
}

function parseGuestData(req, res, next) {
  req.sanitizeBody('name').trim();
  req.sanitizeBody('email').trim();
  req.sanitizeBody('date').trim();
  req.sanitizeBody('timeStart').trim();
  req.sanitizeBody('timeEnd').trim();

  req.checkBody('name', 'Guest Name is required').notEmpty();
  req.checkBody('email', 'Guest Email is required').notEmpty();

  var errors = req.validationErrors();

  var dateStart = new Date(`${req.body.date} ${req.body.timeStart}`);
  var dateEnd = new Date(`${req.body.date} ${req.body.timeEnd}`);
  if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
    errors.push('Please format the date and times correctly');
  }

  next(errors, {
    id: req.params.guest_id,
    name: req.body.name,
    email: req.body.email,
    dateStart: dateStart,
    dateEnd: dateEnd,
    project: req.body.project,
    notes: req.body.notes
  });
}

function postCalendarEvent(event) {
  return new Promise(function(resolve, reject) {
    var next = function(err, event) {
      if (err) reject(err);
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
      "summary": `Guest - ${guest.name}`,
      "description":
          `Guest: ${guest.name}\n` +
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
        {
          "email": guest.email
        }
      ],
      "summary": "Straylight visit",
      "description":
        `Dear ${guest.name},\n` +
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
  getAsanaProjects().then(function(projects) {
    const now = new Date().getTime();
    const upcomingGuests = req.user.guests.filter(g => g.dateStart.getTime() > now);
    const pastGuests = req.user.guests.filter(g => g.dateStart.getTime() <= now);
    const guestById = req.params.guest_id && req.user.guests.id(req.params.guest_id);
    if (guestById) {
      guestById.upcoming = guestById.dateStart.getTime() > now;
    }
    res.render(req.render, {
      user: req.user,
      upcomingGuests: upcomingGuests,
      pastGuests: pastGuests,
      guest: guestById,
      projects: projects,
      exampleDate: new Date('2017-12-09T15:00:00+0900')
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

    updatedGuest.name = guest.name;
    updatedGuest.email = guest.email;
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
