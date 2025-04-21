// Description: This file contains the user controller.
// It exports a function that renders the home view.
// const = require("../models/user");
const recipe = require("../models/recipe");
const { User } = require("../models/user"); // Make sure this is the discriminator!

function getDahsboard(req, res, next) {
  if (req.user.role === "admin") {
    return res.redirect("admin/dashboard");
  }
  // Always fetch fresh user with populated posts
  User.findById(req.user._id)
    .populate("posts")
    .then((user) => {
      if (!user) return res.status(404).redirect("/error");
      return res.render("userdashboard", { user });
    })
    .catch((err) => {
      console.error("Error fetching user for dashboard:", err);
      return res.status(500).redirect("/error");
    });
}

//**********************************************/
//*
//*  DELETE USER ACCOUNT (3 PARTS)
//*
//**********************************************/

// 1. Delete everything (user, posts, comments)
function deleteUserAndEverything(req, res, next) {
  const userId = req.user._id;
  User.findById(userId)
    .then((user) => {
      if (!user) return res.status(404).redirect("/error");
      // Delete all recipes owned by user
      return recipe.deleteMany({ owner: userId }).then(() => user);
    })
    .then((user) => {
      // Optionally, delete comments if you have a Comment model
      // Comment.deleteMany({ author: userId })
      return User.findByIdAndDelete(userId);
    })
    .then((deletedUser) => {
      res.locals.message = `Account: "${deletedUser.username}" and all data deleted successfully`;
      return res.status(200).redirect("/signup");
    })
    .catch((err) => {
      return res.status(500).json({
        status: "fail",
        message: "Could not delete account and data",
        error: err,
      });
    });
}

// 2. Delete account only (posts stay intact)
function deleteUserAccountOnly(req, res, next) {
  const userId = req.user._id;
  User.findByIdAndDelete(userId)
    .then((deletedUser) => {
      if (!deletedUser) return res.status(404).redirect("/error");
      res.locals.message = `Account: "${deletedUser.username}" deleted, posts remain`;
      return res.status(200).redirect("/signup");
    })
    .catch((err) => {
      return res.status(500).json({
        status: "fail",
        message: "Could not delete account",
        error: err,
      });
    });
}

// 3. Deactivate account (soft delete)
function deactivateUserAccount(req, res, next) {
  const userId = req.user._id;
  User.findByIdAndUpdate(
    userId,
    { isActive: false }, // You must have an isActive field in your User schema
    { new: true }
  )
    .then((user) => {
      if (!user) return res.status(404).redirect("/error");
      res.locals.message = `Account: "${user.username}" deactivated`;
      return res.status(200).redirect("/login");
    })
    .catch((err) => {
      return res.status(500).json({
        status: "fail",
        message: "Could not deactivate account",
        error: err,
      });
    });
}

///**********************************************/
//*
//*  UPDATE USER PASSWORD
//*
//**********************************************/

function getUpdatePassword(req, res, next) {
  return res.render("changepassword", {
    user: req.user,
  });
}

function updatePassword(req, res, next) {
  const userId = req.user._id;

  User.findOne(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: "User not found",
        });
      }
      if (req.body.password) {
        user.setPassword(req.body.password, (err) => {
          if (err) {
            return res.status(500).json({
              status: "fail",
              message: "Failed to update password",
              error: err,
            });
          }
          user
            .save()
            .then((updatedUser) => {
              req.user = updatedUser;
              req.session.save();
              return res.status(200).redirect("/user/dashboard");
            })
            .catch((err) => {
              return res.status(500).redirect("/error");
            });
        });
      } else {
        res.status(200).redirect("/user/dashboard");
        return next();
      }
    })
    .catch((err) => {
      res.locals.error = err;
      return res.status(500).redirect("/error");
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
      }
      // console.log("RECIPES: ", recipes[0]._id)
      return res.render("feeds", { recipe: recipes, user: req.user });
    });
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
    preparationTime: req.body.preparationTime,
    cookingTime: req.body.cookingTime,
    likes: 0,
    comments: [],
    cuisine: req.body.cuisine,
    category: req.body.category,
    difficulty: req.body.difficulty,
    servings: req.body.servings,
    likedBy: [],
  };

  recipe
    .create(newRecipe)
    .then((recipe) => {
      if (!recipe) {
        return res.status(500).redirect("/error");
      }
      // Add the recipe to the user's posts array
      console.log(recipe._id);
      User.findByIdAndUpdate(req.user._id, {
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
  User.findById("67b30bac01a363247489e447")
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
  User.findById(userId)
    .populate("posts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("profile", { user: user, currentUser: req.user });
    })
    .catch((err) => {
      console.error("Error fetching user profile: ", err);
      return res.status(500).redirect("/error");
    });
}

function getMyProfile(req, res, next) {
  const userId = req.user._id;
  User.findById(userId)
    .populate("posts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("myprofile", { user: user, currentUser: req.user });
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
    tag: req.body.tag,
  };

  // Add profile image to updateData if a new image was uploaded
  if (req.file) {
    updateData.profileImage = `/uploads/profile/${req.file.filename}`;
  }

  User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true, // This ensures enum validation for tag
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

//**********************************************/
//*
//*  FOLLOW USER
//*
//**********************************************/

// Add this function to handle following a user
function followUser(req, res, next) {
  const userToFollowId = req.params.id;
  const currentUserId = req.user._id;

  Promise.all([
    User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { following: userToFollowId } },
      { new: true }
    ),
    User.findByIdAndUpdate(
      userToFollowId,
      { $addToSet: { followers: currentUserId } },
      { new: true }
    ),
  ])
    .then(async ([currentUser, targetUser]) => {
      if (!currentUser || !targetUser) {
        return res.status(404).redirect("/error");
      }
      // Fetch as Mongoose doc and update rank
      const fullUser = await User.findById(targetUser._id);
      if (fullUser) {
        console.log("fullUser: ", fullUser);
        fullUser.updateRankBasedOnFollowers();
        await fullUser.save();
        res.redirect(req.get("Referrer") || "/"); // Refresh the page after following
        // return res.redirect("/user/profile/" + userToFollowId);
      }
    })
    .catch((err) => {
      console.error("Error following user:", err);
      return res.status(500).redirect("/error");
    });
}

//**********************************************/
//*
//*  UNFOLLOW USER
//*
//*
//**********************************************/

// This function is used to unfollow a user
// It removes the user from the current user's following list
// and removes the current user from the target user's followers list

function unfollowUser(req, res, next) {
  const userToUnfollowId = req.params.id;
  const currentUserId = req.user._id;

  Promise.all([
    // Remove from following
    User.findByIdAndUpdate(
      currentUserId,
      { $pull: { following: userToUnfollowId } },
      { new: true }
    ),
    // Remove from followers
    User.findByIdAndUpdate(
      userToUnfollowId,
      { $pull: { followers: currentUserId } },
      { new: true }
    ),
  ])
    .then(([currentUser, targetUser]) => {
      if (!currentUser || !targetUser) {
        return res.status(404).redirect("/error");
      }
      return res.redirect("back");
    })
    .catch((err) => {
      console.error("Error unfollowing user:", err);
      return res.status(500).redirect("/error");
    });
}


// **********************************************/
// *
//*  like and unlike a recipe
// *
// **********************************************/
function likeRecipe(req, res, next) {
  const recipeId = req.params.id;
  const userId = req.user._id;

  recipe
    .findById(recipeId)
    .then((recipe) => {
      if (!recipe) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Recipe not found' 
        });
      }

      // Check if user has already liked
      const alreadyLiked = recipe.likedBy.includes(userId);

      if (alreadyLiked) {
        // Unlike: Remove user from likedBy and decrease likes count
        recipe.likedBy.pull(userId);
        recipe.likes = Math.max(0, recipe.likes - 1); // Prevent negative likes
      } else {
        // Like: Add user to likedBy and increase likes count
        recipe.likedBy.push(userId);
        recipe.likes = (recipe.likes || 0) + 1;
      }

      return recipe.save();
    })
    .then((updatedRecipe) => {
      // Return JSON response for AJAX requests
      return res.json({
        status: 'success',
        likes: updatedRecipe.likes,
        liked: updatedRecipe.likedBy.includes(userId)
      });
    })
    .catch((err) => {
      console.error("Error liking/unliking recipe:", err);
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to update like status'
      });
    });
}



//**********************************************/
//*
// function hi (req, res, next) {
//   return res.render("hello", {bye: req.params.id})
// }

module.exports = {
  testUserAccountDetails,
  getDahsboard,
  getFeeds,
  deleteUserAndEverything,
  deleteUserAccountOnly,
  deactivateUserAccount,
  getUpdatePassword,
  updatePassword,
  logout,
  getRecipe,
  getProfile,
  getMyProfile,
  editProfile,
  createRecipe,
  followUser,
  unfollowUser,
  likeRecipe,
  // unlikeRecipe,
  // hi
};
