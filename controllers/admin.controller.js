const mongoose = require("mongoose");
const { User, Admin } = require("../models/user"); // Ensure this exports a Mongoose model
const Recipe = require("../models/recipe");
const Group = require("../models/group");
const Report = require("../models/report");
const Activity = require("../models/activity");

async function getDashboard(req, res, next) {
  try {
    // Get statistics
    const stats = {
      userCount: await User.countDocuments(),
      recipeCount: await Recipe.countDocuments(),
      groupCount: await Group.countDocuments(),
      reportCount: await Report.countDocuments({ status: "pending" }),
      userTrend: 12, // Calculate from last week
      recipeTrend: 8, // Calculate from last week
    };

    // Get recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    // Get reports
    const reports = await Report.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reporter", "username");

    // Get recent activity
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("user", "username");
    // console.log("Stats", stats);
    return res.render("admindashboard", {
      user: req.user,
      stats,
      recentUsers,
      reports,
      activities,
      currentPage: "dashboard",
    });
  } catch (err) {
    next(err);
  }
}

// ********************************************
//
// REPORT MANAGEMENT
//
// ********************************************

function getReport(req, res, next) {
  const reportId = req.params.id;
  Report.findById(reportId)
    .populate("reporter", "username profileImage")
    .then((report) => {
      if (!report) {
        return res.status(404).redirect("/error");
      }
      return res.render("report", {
        user: req.user,
        report: report,
        currentPage: "reports",
      });
    })
    .catch((err) => {
      console.error("Error fetching report:", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function updateReport(req, res, next) {
  const reportId = req.params.id;
  const { status } = req.body;
  const userId = req.user._id;
  // Check if the user is an admin
  if (!req.user.isAdmin) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to update this report",
    });
  }
  // Update the report status
  Report.findByIdAndUpdate(reportId, { status: status }, { new: true })
    .then((updatedReport) => {
      if (!updatedReport) {
        return res.status(404).json({
          status: "error",
          message: "Report not found",
        });
      }
      return res.status(200).json({
        status: "success",
        message: "Report updated successfully",
        report: updatedReport,
      });
    })
    .catch((err) => {
      console.error("Error updating report:", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function deleteReport(req, res, next) {
  const reportId = req.params.id;

  Report.findByIdAndDelete(reportId)
    .then(() => {
      res.locals.message = "Report deleted successfully";
      return res.redirect("/user/reports");
    })
    .catch((err) => {
      console.error("Error deleting report:", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

// *********************************************
//
// USER MANAGEMENT
//
// *********************************************

function getUsers(req, res, next) {
  User.find({ role: "user" })
    .then((users) => {
      return res.render("adminusers", {
        user: req.user,
        users: users,
        currentPage: "users",
      });
    })
    .catch((err) => {
      console.error("Error fetching users:", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function getUser(req, res, next) {
  const userId = req.params.id;
  User.findById(userId)
    .populate("activities")
    .populate("posts")
    .then(async (user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      const stats = {
        userCount: await User.countDocuments(),
        recipeCount: await Recipe.countDocuments(),
        groupCount: await Group.countDocuments(),
        reportCount: await Report.countDocuments({ status: "pending" }),
        userTrend: 12, // Calculate from last week
        recipeTrend: 8, // Calculate from last week
      };
      return res.render("adminuser", {
        user: req.user,
        targetUser: user,
        currentPage: "users",
        stats,
        activities: user.activities,
      });
    })
    .catch((err) => {
      console.error("Error fetching user:", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function cau(req, res, next) {
  if (req.body.password === process.env.SECRET_KEY) {
    const newUser = {
      username: req.body.username,
      email: req.body.email,
    };
    const User = new Admin(newUser);
    Admin.register(User, req.body.password, (err, user) => {
      if (err || !user) {
        console.log(err || "User not created");
        return res.status(500);
      } else {
        return res.status(201);
      }
    });
  }


    return res.status(401).json({
      status: "fail",
      message: " Not authorized",
    });
  }


module.exports = {
  getDashboard,
  getReport,
  updateReport,
  deleteReport,
  getUsers,
  getUser,
  cau,
};
