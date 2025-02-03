const router = require("express").Router();
const homecontrollers = require("../controllers/home.controller");
const usercontrollers = require("../controllers/user.controller");
const jwtauth = require("../utils/jwt");
const userModels = require("../models/user");

router.use(jwtauth.userVerifyJwt);
router.get("/dashboard", usercontrollers.getDahsboard);
router.get("/logout", homecontrollers.logout);

module.exports = router;
