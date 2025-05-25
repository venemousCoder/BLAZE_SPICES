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
          console.log("SESSION: ", req.session.token);
          req.session.save((error) => {
            if (error) {
              console.error("Session save error:", err);
              return res.render("login", {
                error,
                description: error.message,
              });
            }
            return res.status(201).redirect("/user/dashboard");
          });
        })
        .catch((error) => {
          return res.render("login", {
            error,
            description: error.message,
          });
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
      return res.render("login", {
        error: "UserException",
        description: "User not found. Check credentials and try again",
      });
    }

    // Successfully authenticated and session created
    req.session.token = jwt.generateToken(req.user);
    req.session.save((error) => {
      if (error) {
        console.error("Session save error:", err);
        return res.render("login", {
          error,
          description: error.message,
        });
      }
      // return res.status(201).redirect("/user/dashboard");
      return res.status(200).redirect("/user/dashboard");
    });
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
