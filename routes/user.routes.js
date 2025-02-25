const router = require("express").Router();
const homecontrollers = require("../controllers/home.controller");
const usercontrollers = require("../controllers/user.controller");
const jwtauth = require("../utils/jwt");

router.use(jwtauth.userVerifyJwt);

router.get("/logout", usercontrollers.logout);

router.get("/feeds", usercontrollers.getFeeds);

// router.get("/profile", usercontrollers.getProfile);

router.get("/dashboard", usercontrollers.getDahsboard);

router.get("/deactivate", usercontrollers.deleteUser);

router.put("/updateacc", usercontrollers.updateUserProfile);

module.exports = router;
