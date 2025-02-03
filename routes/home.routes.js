const router = require("express").Router();
const homeControllers = require("../controllers/home.controller");
const passport = require("passport");

router.get("/", homeControllers.getHome);
router.get("/signup", homeControllers.getSignUp);
router.get("/login", homeControllers.getLogin);
router.post("/signup", homeControllers.createUser);
router.post("/login", homeControllers.userLogin);
router.get("/logout", homeControllers.logout);
router.get("/auth/google", (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
); // Redirect to home page after successful login

router.get("/auth/google/login", homeControllers.googleLogin);

router.get("/forgotpassword", homeControllers.getforgetPassword);

router.post("/forgotpassword", homeControllers.forgetPassword);

router.post("/resetpassword", homeControllers.resetPassword);

module.exports = router;
