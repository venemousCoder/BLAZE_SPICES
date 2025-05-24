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
    error: ""
  });
}

function getLogin(req, res) {
  return res.render("login", {
    title: "Login",
    message: "",
    error: ""
  });
}

function getContact(req, res) {
  return res.render("contact", {
    title: "Contact",
    message: "",
  });
}
function getAbout(req, res) {
  return res.render("about", {
    title: "About",
    message: "",
  });
}

function getTerms(req, res) {
  return res.render("terms", {
    title: "Terms",
    message: "",
  });
}
function getPrivacy(req, res) {
  return res.render("privacy", {
    title: "Privacy",
    message: "",
  });
}

module.exports = {
  getHome,
  getLogin,
  getSignUp,
  getContact,
  getAbout,
  getTerms,
  getPrivacy,
};
