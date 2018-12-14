exports.get = function(req, res, next) {
  res.render(req.render, {user: req.user});
};

