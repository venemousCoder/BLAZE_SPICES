function renderError(req, res, next) {
  console.log("ERROR: ",res.locals.message," NEXT: ", next())
  return res.render("error", {
    error: res.locals.message,
    status: res.locals.message,
  });
}

module.exports = { renderError };
