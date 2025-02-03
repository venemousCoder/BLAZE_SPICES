// Description: This file contains the user controller.
// It exports a function that renders the home view.

function getDahsboard(req, res, next) {
  if (req.user.role === "admin") {
    return res.redirect("admin/dashboard");
  }
  return res.render("userdashboard", { user: req.user });
}

module.exports = { getDahsboard };
