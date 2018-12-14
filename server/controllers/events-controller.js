const google = require('googleapis');
const moment = require('moment');
const calendar = google.calendar('v3');
const secrets = require('../config/secrets');
const User = require('../models/user');

const STRAYLIGHT_CALENDAR_ID = 'straylight.jp_dvovuo73ok4pjq7qf6q5vg76lg@group.calendar.google.com';
const DEFAULT_TIME = '15:00';

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

function parseEventData(req, res) {
  req.sanitizeBody('name').trim();
  req.sanitizeBody('date').trim();
  req.sanitizeBody('timeStart').trim();
  req.sanitizeBody('timeEnd').trim();

  var errors = [];
  if (!req.body.name) {
    errors.push('Event name is required');
  }
  if (!req.body.details) {
    errors.push('Event details are required');
  }

  var names = req.body.names;
  var emails = req.body.emails;
  if (!Array.isArray(names)) {
    names = [names];
  }
  if (!Array.isArray(emails)) {
    emails = [emails];
  }
  names = names.map(n => n.trim()).filter(n => n);
  emails = emails.map(n => n.trim()).filter(n => n);
  if (names.length !== emails.length) {
    errors.push('Please provide email for each guest');
  }

  var dateStart = new Date(`${req.body.date} ${req.body.timeStart}`);
  var dateEnd = new Date(`${req.body.date} ${req.body.timeEnd}`);
  if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
    errors.push('Please format the date and times correctly');
  }

  return [ errors, {
    id: req.params.event_id,
    eventType: req.body.eventType,
    name: req.body.name,
    names: names,
    emails: emails,
    dateStart: dateStart,
    dateEnd: dateEnd,
    details: req.body.details,
    organizers: req.body.organizers,
  } ];
}

function createEventDescription(event) {
  const policy =
    event.eventType === 'public' ? 'This event is open to Straylight members and our guests. If you are a guest and would like to invite someone, please contact the host.'
    : event.eventType === 'members' ? 'This event is open to Straylight members only. If you would like to invite someone who is not a member, please contact the host.'
    : 'Straylight is a private space run by our community. Please seek permission from the host before inviting other guests.';

  return `${event.details.replace(/\s+$/g,'')}

Hosted by: ${event.organizers}

-----

${policy}

We are located 1-minute west of Yoyogi-Hachiman Station in the Createur Building. Follow the stairs up to 3rd floor and head to the door on your left.

https://goo.gl/maps/nd3kzhkqAax`;
}

function postCalendarEvent(user, event) {
  return new Promise(function(resolve, reject) {
    User.find({}, function(err, users) {
      if (err) return reject(err);

      var emails = [user.email].concat(event.emails);
      if (event.eventType !== 'private') {
        emails = emails.concat(
            users
            .filter(user => !user.isDisabled)
            .map(user => user.email));
      }
      // Sort and deduplicate.
      emails = [...new Set(emails)];
      const calendarEvent = {
        calendarId: STRAYLIGHT_CALENDAR_ID,
        sendNotifications: true,
        eventId: event.eventId,
        resource: {
          "start": {
            "dateTime": event.dateStart.toISOString()
          },
          "end": {
            "dateTime": event.dateEnd.toISOString()
          },
          "attendees": emails.map(email => (
            {
              "email": email
            }
          )),
          "summary": event.name,
          "description": createEventDescription(event),
          "location": "Straylight, Shibuya, Tokyo"
        },
      };
      const next = function(err, calendarEvent) {
        if (err) return reject(err);
        resolve(calendarEvent);
      };
      if (calendarEvent.eventId) {
        calendar.events.update(calendarEvent, next);
      } else {
        calendar.events.insert(calendarEvent, next);
      }
    });
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

exports.get = function(req, res, next) {
  req.sanitizeQuery('copy').toBoolean();

  const events = req.user.events
      .sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
  var eventById = req.params.event_id && req.user.events.id(req.params.event_id);
  if (eventById) {
    eventById.timeStart = moment(eventById.dateStart).format('HH:mm');
    eventById.timeEnd = moment(eventById.dateEnd).format('HH:mm');
  }
  res.render(req.render, {
    user: req.user,
    events: events,
    event: eventById || {
      timeStart: DEFAULT_TIME,
      timeEnd: DEFAULT_TIME
    },
    timeOptions: getTimeOptions()
  });
};

exports.create = function(req, res, next) {
  const [errors, event] = parseEventData(req, res);
  if (errors.length) {
    req.flash('error', errors);
    return res.redirect(req.redirect.failure);
  }

  postCalendarEvent(req.user, event)
  .then(function(calendarEvent) {
    event.eventId = calendarEvent.id;
    event.url = calendarEvent.htmlLink;
    req.user.events.push(event);
    req.user.save(function(err) {
      if (err) return next(err);

      req.flash('success', 'Your event registration is complete');
      res.redirect(req.redirect.success);
    });
  }).catch(next);
};

exports.edit = function(req, res, next) {
  const [errors, event] = parseEventData(req, res);
  if (errors.length) {
    req.flash('error', errors);
    return res.redirect(req.redirect.failure);
  }

  var updatedEvent = req.user.events.id(event.id);
  if (!updatedEvent) return next('Invalid or missing event ID');

  updatedEvent.eventType = event.eventType;
  updatedEvent.name = event.name;
  updatedEvent.names = event.names;
  updatedEvent.emails = event.emails;
  updatedEvent.date = event.date;
  updatedEvent.dateStart = event.dateStart;
  updatedEvent.dateEnd = event.dateEnd;
  updatedEvent.details = event.details;
  updatedEvent.organizers = event.organizers;

  req.user.save(function(err) {
    if (err) return next(err);

    postCalendarEvent(req.user, updatedEvent)
    .then(function() {
      req.flash('success', 'Your event registration has been updated');
      res.redirect(req.redirect.success);
    }).catch(next);
  });
};

exports.delete = function(req, res, next) {
  var event = req.user.events.id(req.params.event_id);
  if (!event) {
    return next('Missing or invalid event ID');
  }

  var eventId = event.eventId;

  event.remove();
  req.user.save(function(err) {
    if (err) return next(err);

    deleteCalendarEvent(STRAYLIGHT_CALENDAR_ID, eventId)
    .then(function(event) {
      req.flash('success', 'Your event registration has been canceled');
      res.redirect(req.redirect.success);
    })
    .catch(next);
  })
};

