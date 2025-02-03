function renderError(req, res, next, error) {
  return res.render("error", {
    error: error.err,
    status: error.status,
  });
}

module.exports = { renderError };
