// Description: This file contains the user controller.
// It exports a function that renders the home view.
const mongoose = require("mongoose");
const userModels = require("../models/user");

function getDahsboard(req, res, next) {
  if (req.user.role === "admin") {
    return res.redirect("admin/dashboard");
  }
  return res.render("userdashboard", { user: req.user });
}

function deleteUser(req, res, next) {
  const uId = req.user._id;
  // mongoose.Types.ObjectId.createFromHexString(req.user._id);
  userModels.User.findByIdAndDelete(uId)
    .then((deletedAccount) => {
      res.locals.message = `Account: "${deletedAccount.username}" deleted successfully`;
      return res.status(200).redirect("/signup");
      //  next();
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
  console.log("LOGOUT");
  req.logout((error, user) => {
    if (error) {
      console.log("ERROR: ", error);
      return res.status(500).redirect("/error/");
    }
    req.session.token = "";
    req.session.destroy();
    res.redirect("/login");
  });
}

module.exports = { getDahsboard, deleteUser, updateUserProfile, logout };
