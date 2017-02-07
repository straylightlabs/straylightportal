'use strict';

exports.getHome = function(req, res, next){
  var error = null;
  var errorFlash = req.flash('error');
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  res.render(req.render, {error: error});
};
