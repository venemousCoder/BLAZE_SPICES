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
    console.log(user);
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
      res.locals.currentUser = req.user;
      req.session.token = jwt.generateToken(req.user);
      if (req.user.role === "admin") {
        res.status(200).redirect("/admin/dashboard");
        return next();
      }
      res.status(200).redirect("/user/dashboard");
      return next();
    });
  })(req, res, next);
}

function googleLogin(req, res, next) {
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
}

/******************************************************************
 *
 * FORGET PASSWORD CONTROLLERS
 *
 ******************************************************************/
function getforgetPassword(req, res) {
  return res.render("forgetpassword", {
    title: "Forget Password",
    // message: "Welcome to the Home Page",
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
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiration = Date.now() + 3600000; // 1 hour validity
    console.log("TOKEN: ", token, "EXPIRATION: ", expiration, "USER", user);
    // Save token & expiration in the DB without modifying schema
    var updateduser = await userModels.Account.findOneAndUpdate(
      { email: email },
      { $set: { resetPasswordToken: token, resetPasswordExpires: expiration } },
      { new: true }
    );

    userModels.Account.findOneAndUpdate(
      { email: email },
      {
        $set: { resetPasswordToken: token, resetPasswordExpires: expiration },
      },
      { new: true }
    )
      .then((updatedUser) => {
        console.log("UPDATED USER THEN:", updatedUser);
        return updatedUser;
      })
      .catch((err) => {
        console.log("ERROR:", err);
        res.locals.error = err;
        return res.status(500).redirect("/forgotpassword");
      });
    console.log("UPDATED USER", updateduser);
    // Token valid for 1 hour

    // Send reset email
    const resetUrl = `http://localhost:4000/resetpassword/${token}`;
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
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        res.locals.error = err;
        return res.status(500).redirect("/forgotpassword");
      }
      res.locals.success = "success";
      return res.status(200).redirect(`/forgotpassword`);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).redirect("/forgotpassword");
  }
}

async function getResetPassword(req, res) {
  const user = await userModels.Account.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
  });

  if (!user) {
    return res.status(400).redirect("/error/");
  }
  res.render("resetpassword", {
    title: "Reset Password",
    token: req.params.token,
  });
}

async function resetPassword(req, res, next) {
  try {
    const user = await userModels.Account.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(400).redirect("*");
    }

    // Set new password using passport-local-mongoose method
    user.setPassword(req.body.password, async (err) => {
      if (err) {
        return res.status(500).json({ message: "Error resetting password" });
      }

      await userModels.Account.updateOne(
        { email: user.email },
        { $unset: { resetPasswordToken: "", resetPasswordExpires: "" } } // Removes these fields
      );

      res.status(200).redirect("/login");
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
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
