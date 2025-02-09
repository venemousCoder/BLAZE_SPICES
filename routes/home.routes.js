const router = require("express").Router();
const homeControllers = require("../controllers/home.controller");
const passport = require("passport");

router.get("/", homeControllers.getHome);
router.get("/signup", homeControllers.getSignUp);
router.get("/login", homeControllers.getLogin);



module.exports = router;
