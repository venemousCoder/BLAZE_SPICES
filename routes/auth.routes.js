const router = require("express").Router();
const passport = require("passport");
const authControllers = require("../controllers/auth.controller");
const jwt = require("jsonwebtoken")

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
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // res.locals.currentUser = req.user;
    
    // if (!user) {
      //       return res.status(404).json({
        //         status: "fail",
        //         message: "User not found",
        //       });
        //     }
        req.login(user, function (err) {
          if (err) {
            return res.status(500).json({
              status: "fail",
              message: "Failed to create session",
              error: err,
            });
          }
          // Successfully authenticated and session created
          res.locals.currentUser = req.user;
          req.session.token = jwt.generateToken(req.user);
          req.session.token = token;
          res.status(200).redirect("/user/dashboard");
          return next();
        });

    next();
  }
);


router.get("/google/login", authControllers.googleLogin);

router.get("/forgotpassword", authControllers.getforgetPassword);

router.post("/forgotpassword", authControllers.forgetPassword);

router.get("/resetpassword/:token", authControllers.getResetPassword);

module.exports = router;
