/******************************************************************
 *
 * HOME CONTROLLERS
 *
 ******************************************************************/

function getHome(req, res) {
  if (req.isAuthenticated()) {
    console.log("true");
    return res.render("home", {
      title: "Home Page",
      message: "Welcome to the Home Page",
      user: req.user,
    });
  }
  return res.render("home", {
    title: "Home Page",
    message: "Welcome to the Home Page",
    user: "",
  });
}

function getSignUp(req, res) {
  return res.render("signup", {
    title: "SignUp",
    // message: "Welcome to the Home Page",
  });
}

function getLogin(req, res) {
  return res.render("login", {
    title: "Login",
    // message: "Welcome to the Home Page",
  });
}

module.exports = {
  getHome,
  getLogin,
  getSignUp,
};
