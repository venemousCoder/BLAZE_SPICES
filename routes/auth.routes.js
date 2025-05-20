const router = require("express").Router();
const passport = require("passport");
const authControllers = require("../controllers/auth.controller");
const jwt = require("../utils/jwt");
const userModels = require("../models/user");
const crypto = require("crypto");

router.post("/signup", authControllers.createUser);

router.post("/login", authControllers.userLogin);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Handle Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res, next) => {
    // Check if this is a new user (first login)
    if (req.user && !req.user.__t) {
      // This is a new user from Google auth, complete the profile
      userModels.User.findByIdAndUpdate(
        req.user._id,
        {
          followers: [],
          following: [],
          likes: [],
          savedRecipes: [],
          savedExternalRecipes: [],
          bio: "",
          profileImage: "/uploads/profile/default-profile.png",
          posts: [],
          tag: "Food Enthusiast",
          activities: [],
          verified: true,
          groups: [],
          unreadMessages: [],
          notifications: [],
        },
        { new: true }
      )
        .then((updatedUser) => {
          req.user = updatedUser;
          req.session.token = jwt.generateToken(updatedUser);
          req.session.save((err) => {
            if (err) console.error("Session save error:", err);
            return res.redirect("/user/dashboard");
          });
        })
        .catch((err) => {
          console.error("User update error:", err);
          return res.redirect("/login");
        });
    } else {
      // Existing user, just create session and redirect
      req.session.token = jwt.generateToken(req.user);
      return res.redirect("/user/dashboard");
    }
  }
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res, next) => {
    // console.log("USER:GAUTH: ", req.user);

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

router.post(
  "/forgotpassword",
  authControllers.forgetPassword,
  authControllers.getforgetPassword
);

router.get("/resetpassword/:token", authControllers.getResetPassword);
router.post("/resetpassword/:token", authControllers.resetPassword);

module.exports = router;
