const crypto = require("crypto");
const passport = require("passport");
const userModels = require("../models/user");
const mongoose = require("mongoose");
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
    console.log("USER AUTH: ", user);
    if (!user) {
      res.locals.error = "User not found";
      return res.status(404).redirect("/login");
    }
    if (err) {
      res.locals.error = err;
      return res.status(404).redirect("/login");
    }
    req.login(user, function (err) {
      if (err)
        return res.status(500).json({
          status: "fail",
          message: "failed to create session",
          error: err,
        });
      // Successfully authenticated and session created
      req.session.token = jwt.generateToken(req.user);
      userModels.Account.findOneAndUpdate(
        { email: req.user.email },
        { verified: true }
      )
        // .populate("groups.id", "-__v")
        // .populate("posts")
        .then((user) => {
          req.user = user;
          req.session.user = user; // Assign after populate completes
          req.session.save((err) => {
            if (err) {
              return res.status(500).json({
                status: "fail",
                message: "Failed to save session",
                error: err,
              });
            }
            console.log("Session saved successfully");
            console.log("USER: ", req.user.posts);
            console.log("SESSION: ", req.session);
            console.log("req.USER: ", req.session.user);
            if (req.user.role === "admin") {
              res.status(200).redirect("/admin/dashboard");
              return next();
            }
            res.status(200).redirect("/user/dashboard");
            return next();
          });
        })
        .catch((err) => {
          return res.status(500).json({
            status: "fail",
            message: "Error populating user data",
            error: err,
          });
        });
    });
  })(req, res, next);
}

function googleLogin(req, res, next) {
  console.log("Before passport");
  passport.authenticate(
    "google",
    { scope: ["profile", "email"] },
    function (err, user) {
      console.log("USER:GAUTH: ", user);
      if (err) {
        return res.status(500).json({
          status: "fail",
          message: "Google authentication failed",
          error: err,
        });
      }
      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: "User not found",
        });
      }
      req.login(user, function (err) {
        if (err) {
          return res.status(500).json({
            status: "fail",
            message: "Failed to create session",
            error: err,
          });
        }
        // Successfully authenticated and session created
        // res.locals.currentUser = req.user;
        req.session.token = jwt.generateToken(req.user);
        return res.status(200).redirect("/user/dashboard");
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
  // console.log("IN GETFP",res.locals.message)
  return res.render("forgetpassword", {
    title: "Forget Password",
    message: res.locals.message,
  });
}

async function forgetPassword(req, res, next) {
  // const oAuth2Client = new google.auth.OAuth2(
  //   process.env.GMAIL_CLIENT_ID,
  //   process.env.GMAIL_CLIENT_SECRET,
  //   process.env.GMAIL_REDIRECT_URI
  // );
  // oAuth2Client.setCredentials({
  //   refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  // });
  const email = req.body.email;
  // try {
  //   const user = await userModels.Account.findOne({ email: email });
  //   if (!user) {
  //     return res.status(404).json({
  //       status: "fail",
  //       message: "User not found",
  //     });
  //   }
  //   const token = crypto.randomBytes(32).toString("hex");
  //   const expiration = Date.now() + 3600000; // 1 hour validity
  //   console.log("TOKEN: ", token, "EXPIRATION: ", expiration, "USER", user);
  //   // Save token & expiration in the DB without modifying schema
  //   var updateduser = await userModels.User.findOneAndUpdate(
  //     { email: email },
  //     { $set: { resetPasswordToken: token, resetPasswordExpires: expiration } },
  //     { new: true }
  //   );

  //   console.log("UPDATED USER", updateduser);
  //   // Token valid for 1 hour

  //   // Send reset email
  //   const resetUrl = `http://localhost:4000/auth/resetpassword/${token}`;
  //   const accessToken = await oAuth2Client.getAccessToken();
  //   const transporter = nodemailer.createTransport({
  //     service: "gmail",
  //     auth: {
  //       type: "OAuth2",
  //       user: process.env.EMAIL,
  //       clientId: process.env.GMAIL_CLIENT_ID,
  //       clientSecret: process.env.GMAIL_CLIENT_SECRET,
  //       refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  //       accessToken: accessToken.token,
  //     },
  //   });
  //   const mailOptions = {
  //     from: process.env.EMAIL,
  //     to: email,
  //     subject: "Password Reset",
  //     text: `Click on the link to reset your password: ${resetUrl}`,
  //   };
  //   transporter.sendMail(mailOptions, (err, info) => {
  //     if (err) {
  //       res.locals.message = err;
  //       return res.status(500).redirect("/error");
  //     }
  res.locals.message = `Reset password link sent to email: ${email}`;
  // console.log(res.locals.message);
  return next();
  // return res.status(200).redirect(`/auth/forgotpassword`);
  //   });
  // } catch (err) {
  //   console.error(err);
  //   res.locals.error = err;
  //   return res.status(500).redirect("/error");
  // }
}

async function getResetPassword(req, res, next) {
  const user = await userModels.Account.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
  });

  if (!user) {
    console.log("Invalid or expired token");
    res.locals.message = "Invalid or expired token";
    return res.status(400).redirect("/error/");
    // return next(res.locals.message)
  }
  res.render("resetpassword", {
    title: "Reset Password",
    token: req.params.token,
    userId: user.resetPasswordToken,
  });
}

async function resetPassword(req, res, next) {
  try {
    const user = await userModels.Account.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(400).redirect("/error/");
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
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.status(500).json({ message: "Internal server error" });
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
