// Description: This file contains the user controller.
// It exports a function that renders the home view.
const userModels = require("../models/user");
const recipe = require("../models/recipe");

function getDahsboard(req, res, next) {
  if (req.user.role === "admin") {
    return res.redirect("admin/dashboard");
  }
  // Always fetch fresh user with populated posts
  userModels.User.findById(req.user._id)
    .populate("posts")
    .then(user => {
      if (!user) return res.status(404).redirect("/error");
      return res.render("userdashboard", { user });
    })
    .catch(err => {
      console.error("Error fetching user for dashboard:", err);
      return res.status(500).redirect("/error");
    });
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
              req.user = updatedUser;
              req.session.save();
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

function getFeeds(req, res, next) {
  recipe
    .find()
    .populate("owner")
    .then((recipes) => {
      if (!recipes) {
        return res.status(404).redirect("/error");
        // return res.render("feeds", { recipes: recipes, user: req.user });
      }
      // console.log("RECIPES: ", recipes[0]._id)
      return res.render("feeds", { recipe: recipes, user: req.user });
    });
  //
  // return res.render("feeds", { user: req.user });
}

function getRecipe(req, res, next) {
  const recipeId = req.params.id;
  recipe.findById(recipeId).then((recipe) => {
    if (!recipe) {
      return res.status(404).redirect("/error");
    }
    return res.render("recipe", { recipe: recipe, user: req.user });
  });
}

// function getProfile(req, res, next) {
//   // const userId = req.params.id;
//   // userModels.User.findById(userId).then((user) => {
//   //   if (!user) {
//   //     return res.status(404).redirect('/error');
//   //   }
//   return res.render("dashboard", { user: user, currentUser: req.user });
//   // });
// }

function createRecipe(req, res, next) {
  const newRecipe = {
    owner: req.user._id,
    title: req.body.title,
    description: req.body.description,
    ingredients: req.body.ingredients
      .replace("[", "")
      .replace("]", "")
      .split(","),
    steps: req.body.steps,
    image: req.file ? `/uploads/recipes/${req.file.filename}` : null, // Save the image path
  };

  recipe
    .create(newRecipe)
    .then((recipe) => {
      if (!recipe) {
        return res.status(500).redirect("/error");
      }
      // Add the recipe to the user's posts array
      console.log(recipe._id);
      userModels.User.findByIdAndUpdate(req.user._id, {
        $addToSet: { posts: recipe._id },
      })
        .then(() => {
          console.log("Recipe created successfully:", recipe);
          return res.status(201).redirect("/user/feeds");
        })
        .catch((err) => {
          console.error("Error updating user posts:", err);
        });
    })
    .catch((err) => {
      console.error("Error creating recipe:", err);
      return res.status(500).redirect("/error");
    });
}

function testUserAccountDetails(req, res, next) {
  userModels.User.findById("67b30bac01a363247489e447")
    .populate("posts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      console.log("USER: ", user);
      return res.send(user);
    })
    .catch((err) => {
      console.error("Error fetching user:", err);
      return res.status(500).redirect("/error");
    });
}
//**********************************************/
//*
//*  GET USER PROFILE
//*
//**********************************************/
function getProfile(req, res, next) {
  const userId = req.params.id;
  userModels.User.findById(userId)
    .populate("posts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("profile", { user: user, currentUser: req.user });
    })
    .catch((err) => {
      console.error("Error fetching user profile:", err);
      return res.status(500).redirect("/error");
    });
}

function getMyProfile (req, res, next){
  const userId = req.user._id;
  userModels.User.findById(userId)
    .populate("posts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("profile", { user: user, currentUser: req.user });
    })
    .catch((err) => {
      console.error("Error fetching user profile:", err);
      return res.status(500).redirect("/error");
    });
}

function editProfile(req, res, next) {
  const userId = req.user._id;
  const updateData = {
    username: req.body.username,
    email: req.body.email,
    bio: req.body.bio,
    tag: req.body.tag
  };

  // Add profile image to updateData if a new image was uploaded
  if (req.file) {
    updateData.profileImage = `/uploads/profile/${req.file.filename}`;
  }

  userModels.User.findByIdAndUpdate(userId, updateData, { 
    new: true,
    runValidators: true // This ensures enum validation for tag
  })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).redirect("/error");
      }

      // Update session user data
      req.user = updatedUser;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).redirect("/error");
        }
        // Redirect back to dashboard with success message
        res.locals.message = "Profile updated successfully";
        return res.redirect("/user/dashboard");
      });
    })
    .catch((err) => {
      console.error("Profile update error:", err);
      res.locals.error = "Failed to update profile";
      return res.status(500).redirect("/error");
    });
}
module.exports = {
  testUserAccountDetails,
  getDahsboard,
  getFeeds,
  deleteUser,
  updateUserProfile,
  logout,
  getRecipe,
  getProfile,
  getMyProfile,
  editProfile,
  createRecipe,
};
