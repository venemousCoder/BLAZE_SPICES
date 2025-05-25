const crypto = require("crypto");
const passport = require("passport");
const userModels = require("../models/user");
const jwt = require("../utils/jwt");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

/******************************************************************
 *
 * SIGNUP CONTROLLERS
 *
 ******************************************************************/

function createUser(req, res, next) {
  const newUser = {
    username: req.body.username,
    email: req.body.email,
  };
  const User = new userModels.User(newUser);
  userModels.User.register(User, req.body.password, (err, user) => {
    if (err) {
      return res.status(500).json({
        status: "fail",
        message: " user not created  :try again",
        error: err,
      });
    }
    if (!user) {
      return res.status(500).json({
        status: "fail",
        message: " user not created  :try again",
      });
    }
    return res.status(201).redirect("/login");
  });
}

/******************************************************************
 *
 * LOGIN CONTROLLERS
 *
 ******************************************************************/

function userLogin(req, res, next) {
  passport.authenticate("local", function (err, user) {
    if (!user) {
      return res.render("login", {
        error: err,
        description: "Account was not found",
      });
    }
    if (err) {
      return res.render("login", {
        error: err,
        description:
          "Failed to authenticate user, check credentials and try again.",
      });
    }
    req.login(user, function (err) {
      if (err) {
        return res.render("login", {
          error: err,
          description:
            "Session not created, check network connection and try again",
        });
      }
      // Successfully authenticated and session created
      req.session.token = jwt.generateToken(req.user);
      userModels.Account.findOneAndUpdate(
        { email: req.user.email },
        { verified: true }
      )
        // .populate("groups.id", "-__v")
        // .populate("posts")
        .then((user) => {
          req.user = user._id;
          req.session.user = user._id; // Assign after populate completes
          req.session.save((err) => {
            if (err) {
              return res.render("login", {
                error: err,
                description: "Failed to save session.",
              });
            }
            console.log("Session saved successfully");
            if (user.role === "admin") {
              res.status(200).redirect("/admin/dashboard");
              return next();
            }
            res.status(200).redirect("/user/dashboard");
            return next();
          });
        })
        .catch((err) => {
          return res.render("login", {
            error: err,
            description: "Login failed",
          });
        });
    });
  })(req, res, next);
}

function googleLogin(req, res, next) {
  passport.authenticate(
    "google",
    { scope: ["profile", "email"] },
    function (error, user) {
      if (error) {
        return res.render("error", {
          error,
          description: "Google authentication failure",
        });
      }
      if (!user) {
        return res.render("error", {
          error: "UserException ",
          description: "User with the credentials was not found",
        });
      }
      req.login(user, function (error) {
        if (error) {
          return res.render("error", {
            error: error,
            description: "Session not set. Try again",
          });
        }
        // Successfully authenticated and session created
        // res.locals.currentUser = req.user;
        req.session.token = jwt.generateToken(req.user);
        console.log("SESSION: ", req.session.token);
        req.session.save((err) => {
          if (err) {
            return res.render("error", {
              error: err,
              description: "Session save failed",
            });
          }
          return res.status(200).redirect("/user/dashboard");
        });
        // return next();
      });
    }
  )(req, res, next);
}

/******************************************************************
 *
 * FORGET PASSWORD CONTROLLERS
 *
 ******************************************************************/
function getforgetPassword(req, res) {
  return res.render("forgetpassword", {
    title: "Forget Password",
    error: "None",
    message: "",
  });
}

async function forgetPassword(req, res, next) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  const email = req.body.email;
  try {
    const user = await userModels.Account.findOne({ email: email });
    if (!user) {
      return res.render("forgetpassword", {
        error: "No user was found",
        message: "Please enter a valid user account ",
        status: 404,
      });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiration = Date.now() + 3600000; // 1 hour validity;
    // Save token & expiration in the DB without modifying schema
    var updateduser = await userModels.User.findOneAndUpdate(
      { email: email },
      { $set: { resetPasswordToken: token, resetPasswordExpires: expiration } },
      { new: true }
    );

    // Token valid for 1 hour

    // Send reset email
    const resetUrl = `http://localhost:4000/auth/resetpassword/${token}`;
    const accessToken = await oAuth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset",
      text: `Click on the link to reset your password: ${resetUrl}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.render("forgetpassword", {
          error,
          message: "Network error: check your connection try again",
          status: 500,
        });
      }
      return res.status(200).redirect(`/auth/forgotpassword`);
    });
  } catch (error) {
    console.error(error);
    return res.render("forgetpassword", {
      error,
      message: error.message,
      status: 404,
    });
  }
}

async function getResetPassword(req, res, next) {
  const user = await userModels.Account.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
  });

  if (!user) {
    console.log("Invalid or expired token");
    return res.render("resetpassword", {
      error: "Invalid or expired token",
      message: "Token has expired",
      status: 404,
    });
  }
  return res.render("resetpassword", {
    title: "Reset Password",
    token: req.params.token,
    userId: user.resetPasswordToken,
    error: "None",
    message: "",
  });
}

async function resetPassword(req, res, next) {
  try {
    const user = await userModels.Account.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.render("resetpassword", {
        title: "Reset Password",
        token: req.params.token,
        userId: user.resetPasswordToken,
        error: "User not found",
        message:
          "Tokens have gone bad: <a href='/user/forgotpassword'>get new ones</a>",
      });
    }

    // Use `await` to properly hash and set the password
    await user.setPassword(req.body.password);

    // Save the updated user to the database
    await user.save();

    // Remove the reset token and expiration from the database
    await userModels.Account.updateOne(
      { email: user.email },
      { $unset: { resetPasswordToken: "", resetPasswordExpires: "" } }
    );

    return res.status(200).redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("resetpassword", {
      title: "Reset Password",
      token: req.params.token,
      userId: user.resetPasswordToken,
      error,
      message: error.message,
    });
  }
}

module.exports = {
  createUser,
  userLogin,
  googleLogin,
  getforgetPassword,
  forgetPassword,
  resetPassword,
  getResetPassword,
};
