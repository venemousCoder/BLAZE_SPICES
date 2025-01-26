// Description: This file contains the home controller.
// It exports a function that renders the home view.

function getHome(req, res) {
  return res.render("home", {
    title: "Home Page",
    message: "Welcome to the Home Page",
  });
}

function getSignUp(req, res){
  return res.render("signup", {
    title: "SignUp",
    // message: "Welcome to the Home Page",
  });
}

function getLogin(req, res){
  return res.render("login", {
    title: "Login",
    // message: "Welcome to the Home Page",
  });
}


module.exports = { getHome, getLogin, getSignUp };
