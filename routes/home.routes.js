const router = require("express").Router();
const homeControllers = require("../controllers/home.controller");
const userControllers = require("../controllers/user.controller");
const passport = require("passport");

router.get("/", homeControllers.getHome);
router.get("/signup", homeControllers.getSignUp);
router.get("/login", homeControllers.getLogin);
router.post("/signup", userControllers.createUser);
router.post("/login", userControllers.userLogin);
router.get("/logout", userControllers.logout);
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

router.get("/auth/google/login", userControllers.googleLogin);

module.exports = router;
