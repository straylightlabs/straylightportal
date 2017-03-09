'use strict';

function isString(obj) {
  return (Object.prototype.toString.call(obj) === '[object String]');
}

function getErrorMessage(err) {
  if (isString(err)) {
    return err;
  }
  if (isString(err.message)) {
    return err.message;
  }
  return 'Unknown error';
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);

    this.status = 404;
  }
}

module.exports = {

  NotFoundError: NotFoundError,

  notFound: function(req, res, next) {
    var err = new NotFoundError('Not Found');
    next(err);
  },

  development: function(err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    res.format({
      json: function(){
        res.json(err);
      },
      html: function(){
        res.render('error', {
          message: getErrorMessage(err),
          error: err
        });
      }
    });
  },

  production: function(err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    res.render('error', {
      message: getErrorMessage(err),
      error: false
    });
  }
};
