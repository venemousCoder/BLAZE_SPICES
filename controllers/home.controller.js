/******************************************************************
 *
 * HOME CONTROLLERS
 *
 ******************************************************************/

function getHome(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect("/user/feeds");
  }
  return res.render("home", {
    title: "Home Page",
    message: "",
    user: "",
  });
}

function getSignUp(req, res) {
  return res.render("signup", {
    title: "SignUp",
    message: res.locals.message,
  });
}

function getLogin(req, res) {
  return res.render("login", {
    title: "Login",
    message: res.locals.message,
  });
}

module.exports = {
  getHome,
  getLogin,
  getSignUp,
};
