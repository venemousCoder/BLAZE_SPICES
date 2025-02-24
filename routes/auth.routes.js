const router = require("express").Router();
const passport = require("passport");
const authControllers = require("../controllers/auth.controller");
const jwt = require("../utils/jwt");

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
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res, next) => {
    console.log("USER:GAUTH: ", req.user);

    if (!req.user) {
      res.locals.message = "User not found";
      return res.status(404).redirect("/login");
    }

      // Successfully authenticated and session created
      req.session.token = jwt.generateToken(req.user);
      return res.status(200).redirect("/user/dashboard");
  }
);

router.get("/google/login", authControllers.googleLogin);

router.get("/forgotpassword", authControllers.getforgetPassword);

router.post("/forgotpassword", authControllers.forgetPassword, authControllers.getforgetPassword);

router.get("/resetpassword/:token", authControllers.getResetPassword);
router.post("/resetpassword/:token", authControllers.resetPassword);

module.exports = router;
