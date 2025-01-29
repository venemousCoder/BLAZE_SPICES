const router = require("express").Router();
const userControllers = require("../controllers/home.controller");

router.get("logout", userControllers.logout);

module.exports = router;
