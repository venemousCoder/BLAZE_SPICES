// Description: This file contains the home controller.
// It exports a function that renders the home view.

function getHome(req, res) {
  return res.render("home", {
    title: "Home Page",
    message: "Welcome to the Home Page",
  });
}

module.exports = { getHome };
