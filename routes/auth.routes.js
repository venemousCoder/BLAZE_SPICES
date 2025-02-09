const router = require("express").Router();
const passport = require("passport");
const authControllers = require("../controllers/auth.controller");

router.post("/signup", authControllers.createUser);

router.post("/login", authControllers.userLogin);

router.get("/google", (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
); 

router.get("/google/login", authControllers.googleLogin);

router.get("/forgotpassword", authControllers.getforgetPassword);

router.post("/forgotpassword", authControllers.forgetPassword);

router.get("/resetpassword/:token", authControllers.getResetPassword);

module.exports = router;
