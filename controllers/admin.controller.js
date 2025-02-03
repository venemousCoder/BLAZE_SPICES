function getDashboard(req, res, next) {
  return res.render("admindashboard", { user: req.user });
}

module.exports = { getDashboard };
