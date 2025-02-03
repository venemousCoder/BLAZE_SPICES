const router = require("express").Router();
const errorcontrollers = require("../controllers/error.controller");

router.get("/", errorcontrollers.renderError);

module.exports = router;
