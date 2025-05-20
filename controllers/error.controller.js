function renderError(req, res, next) {
  console.log("ERROR: ", res.locals.message, req.user);
  return res.render("error", {
    error: res.locals.error,
    status: res.locals.message,
    description: res.locals.description,
  });
}

module.exports = { renderError };
