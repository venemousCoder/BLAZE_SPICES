const crypto = require("crypto");
const passport = require("passport");
const userModels = require("../models/user");
const mongoose = require("mongoose");
const jwt = require("../utils/jwt");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

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
    req.login(user, function (err) {
      if (err)
        return res.status(500).json({
          status: "fail",
          message: "failed to create session",
          error: err,
        });

      // Successfully authenticated and session created
      req.session.token = jwt.generateToken(req.user);
      res.status(201).render("home", {
        status: "success",
        message: " user created",
      });
      return next();
    });
  });
}

function userLogin(req, res, next) {
  passport.authenticate("local", function (err, user) {
    if (!user)
      return res.status(403).json({
        status: "fail",
        message: "incorrect username or password ",
      });
    if (err)
      return res.status(500).json({
        status: "fail",
        message: "failed to authenticate user",
        error: err,
      });
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
        res.status(201).render("home", {
          status: "success",
          message: "successfully logged in",
        });
        return next();
      }
      res.status(201).render("home", {
        status: "success",
        message: "successfully logged in",
      });
      return next();
    });
  })(req, res, next);
}

function deleteUser(req, res, next) {
  const uId = mongoose.Types.ObjectId.createFromHexString(req.query.id);
  userModels.User.findByIdAndDelete(uId)
    .then((deletedAccount) => {
      res.status(200).json({
        status: "success",
        message: `Account: "${deletedAccount.username}" deleted successfully`,
        redirect: "/signUp",
      });
      return next();
    })
    .catch((err) => {
      return res.status(500).json({
        status: "fail",
        message: `could not delete account`,
        error: err,
      });
    });
}
function updateUserProfile(req, res, next) {
  const userId = req.user._id;
  const updateData = {
    username: req.body.username,
    email: req.body.email,
  };

  userModels.User.findByIdAndUpdate(userId, updateData, { new: true })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).json({
          status: "fail",
          message: "User not found",
        });
      }
      if (req.body.password) {
        updatedUser.setPassword(req.body.password, (err) => {
          if (err) {
            return res.status(500).json({
              status: "fail",
              message: "Failed to update password",
              error: err,
            });
          }
          updatedUser
            .save()
            .then(() => {
              res.status(200).json({
                status: "success",
                message: "Profile updated successfully",
                user: updatedUser,
              });
              return next();
            })
            .catch((err) => {
              return res.status(500).json({
                status: "fail",
                message: "Failed to save updated user",
                error: err,
              });
            });
        });
      } else {
        res.status(200).json({
          status: "success",
          message: "Profile updated successfully",
          user: updatedUser,
        });
        return next();
      }
    })
    .catch((err) => {
      return res.status(500).json({
        status: "fail",
        message: "Failed to update profile",
        error: err,
      });
    });
}
function logout(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(500).json({
      status: "fail",
      message: "Session unset",
    });
  }
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        status: "fail",
        message: "Error logging out user",
        error: err,
      });
    }
    res.status(200).render("login", {
      status: "success",
      message: "successfully logged out",
      redirect: "/login",
    });
    return next();
  });
}

function googleLogin(req, res, next) {
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
}

function getHome(req, res) {
  return res.render("home", {
    title: "Home Page",
    message: "Welcome to the Home Page",
  });
}

function getSignUp(req, res) {
  return res.render("signup", {
    title: "SignUp",
    // message: "Welcome to the Home Page",
  });
}

function getLogin(req, res) {
  return res.render("login", {
    title: "Login",
    // message: "Welcome to the Home Page",
  });
}

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
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour

    await user.save();

    // Send reset email
    const resetUrl = `http://localhost:4000/reset-password/${resetToken}`;
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
      text: `Click on the link to reset your password: http://localhost:4000/resetpassword/${user._id}`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).json({
          status: "fail",
          message: "Failed to send email",
          error: err,
        });
      }
      res.status(200).render("resetpassword", {
        status: "success",
        message: "Email sent",
        // info: info,
        userId: user._id,
      });
      req.session.create()
      return next();
    });
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: "Failed to send email",
      error: err,
    });
  }
}

function resetPassword(req, res, next) {}

module.exports = {
  getHome,
  getLogin,
  getSignUp,
  logout,
  userLogin,
  createUser,
  deleteUser,
  updateUserProfile,
  googleLogin,
  getforgetPassword,
  forgetPassword,
  resetPassword,
};
