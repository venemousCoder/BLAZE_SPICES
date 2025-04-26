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
    .populate("posts.comments.user")
    .then((user) => {
      if (!user) return res.status(404).redirect("/error");
      return res.render("userdashboard", {
        user,
        currentPage: "dashboard",
      });
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
      User.findById(req.user._id)
        .populate("posts")
        .populate("posts.comments.user")
        .then((user) => {
          if (!user) return res.status(404).redirect("/error");
          // Fetch users with more than 10 followers, sorted by follower count descending
          User.aggregate([
            { $addFields: { followerCount: { $size: "$followers" } } },
            { $match: { followerCount: { $gte: 10 } } },
            { $sort: { followerCount: -1 } },
            { $limit: 10 },
          ])
            .then((topUsers) => {
              if (!recipes) {
                return res.status(404).redirect("/error");
              }
              console.log("RECIPES: ", topUsers);
              return res.render("feeds", {
                recipe: recipes,
                user: req.user,
                topUsers,
                currentPage: "feeds",
              });
            })
            .catch((err) => {
              console.error("Error fetching top users:", err);
              return res.status(500).redirect("/error");
            });
        })
        .catch((err) => {
          console.error("Error fetching user for dashboard:", err);
          return res.status(500).redirect("/error");
        });
    })
    .catch((err) => {
      console.error("Error getting top users", err);
      return res.status(500).redirect("/error");
    });
}

function getRecipes(req, res, next) {
  User.findById(req.user._id)
    .populate({
      path: "posts",
      populate: {
        path: "owner",
        select: "username profileImage",
      },
    })
    .then((user) => {
      console.log("USERFROMGETRECIPES: ", user.posts);
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("myrecipes", {
        user: req.user,
        recipes: user.posts,
        currentPage: "recipes",
      });
    })
    .catch((err) => {
      console.error("Error fetching recipes:", err);
      return res.status(500).redirect("/error");
    });
}

function getRecipeById(req, res, next) {
  const recipeId = req.params.id;
  recipe
    .findById(recipeId)
    .populate("owner")
    .then((recipe) => {
      if (!recipe) {
        return res.status(404).redirect("/error");
      }
      return res.render("recipe", {
        recipe: recipe,
        user: req.user,
        currentPage: "recipe",
      });
    });
}

function getNewRecipePage(req, res, next) {
  return res.render("newrecipe", {
    user: req.user,
    currentPage: "newrecipe",
  });
}

function createRecipe(req, res, next) {
  const newRecipe = {
    owner: req.user._id,
    title: req.body.title,
    description: req.body.description,
    ingredients: req.body.ingredients,
      // .replace("[", "")
      // .replace("]", "")
      // .split(","),
    steps: req.body.steps,
    // .replace("[", "").replace("]", "").split(","),
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
        .then((user) => {
          //notify followers
          const notification = {
            read: false,
            from: user.id,
            message: `made a new recipe 🥣`,
            type: "recipe",
            reference: recipe._id, // ID of the new recipe
            createdAt: new Date(),
          };
          User.updateMany(
            { following: user.id },
            { notifications: notification },
            { new: true }
          )
            .then(() => {
              console.log("Recipe created successfully:", recipe);
              return res.status(201).redirect("/user/feeds");
            })
            .catch((err) => {
              console.error("Error updating user posts:", err);
            });
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
      return res.render("profile", {
        User: user,
        user: req.user,
        currentPage: "profile",
      });
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
      return res.render("myprofile", {
        user: user,
        currentUser: req.user,
        currentPage: "myprofile",
      });
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
      // Optionally update rank or other logic here
      targetUser.updateRankBasedOnFollowers();
      await targetUser.save();
      // Create notification for the user being followed
      const notification = {
        read: false,
        from: currentUserId,
        message: `followed you 👥`,
        type: "follow",
        reference: currentUserId, // ID of the user who followed
        createdAt: new Date(),
      };

      await User.findByIdAndUpdate(
        userToFollowId,
        { $push: { notifications: notification } },
        { new: true }
      );

      return res.redirect(req.get("Referrer") || "/");
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
      return res.location(req.get("Referrer") || "/");
    })
    .catch((err) => {
      console.error("Error unfollowing user:", err);
      return res.status(500).redirect("/error");
    });
}

function getFollowers(req, res, next) {
  User.findById(req.user._id)
    .populate("followers")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("followers", {
        user: req.user,
        followers: user.followers,
        currentPage: "followers",
      });
    })
    .catch((err) => {
      console.error("Error fetching followers:", err);
      return res.status(500).redirect("/error");
    });
}

function getFollowing(req, res, next) {
  User.findById(req.user._id)
    .populate("following")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("following", {
        user: req.user,
        following: user.following,
        currentPage: "following",
      });
    })
    .catch((err) => {
      console.error("Error fetching following:", err);
      return res.status(500).redirect("/error");
    });
}

function getUserFollowers(req, res, next) {
  const userId = req.params.id;
  User.findById(userId)
    .populate("followers")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("followers", {
        user: req.user,
        profileUser: user,
        followers: user.followers,
        currentPage: "followers",
      });
    })
    .catch((err) => {
      console.error("Error fetching followers:", err);
      return res.status(500).redirect("/error");
    });
}

function getUserFollowing(req, res, next) {
  const userId = req.params.id;
  User.findById(userId)
    .populate("following")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("following", {
        user: req.user,
        profileUser: user,
        following: user.following,
        currentPage: "following",
      });
    })
    .catch((err) => {
      console.error("Error fetching following:", err);
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
    .then(async (recipe) => {
      if (!recipe) {
        return res.status(404).json({
          status: "error",
          message: "Recipe not found",
        });
      }

      // Check if user has already liked
      const alreadyLiked = recipe.likedBy.includes(userId);

      if (alreadyLiked) {
        // Unlike: Remove user from likedBy and decrease likes count
        recipe.likedBy.pull(userId);
        recipe.likes = Math.max(0, recipe.likes - 1); // Prevent negative likes

        // Remove recipe from user's likes array
        await User.findByIdAndUpdate(
          userId,
          { $pull: { likes: recipeId } },
          { new: true }
        );
      } else if (String(userId) !== String(recipe.owner._id)) {
        // Like: Add user to likedBy and increase likes count
        const notification = {
          read: false,
          from: userId,
          message: `liked your post`,
          type: "like",
          reference: recipeId, // ID of the post
          createdAt: new Date(),
        };

        await User.findByIdAndUpdate(
          recipe.owner._id,
          { $push: { notifications: notification } },
          { new: true }
        );

        // Add recipe to user's likes array
        await User.findByIdAndUpdate(
          userId,
          { $addToSet: { likes: recipeId } },
          { new: true }
        );

        recipe.likedBy.push(userId);
        recipe.likes = (recipe.likes || 0) + 1;
      }
      return recipe.save();
    })
    .then((updatedRecipe) => {
      // Return JSON response for AJAX requests
      return res.json({
        status: "success",
        likes: updatedRecipe.likes,
        liked: updatedRecipe.likedBy.includes(userId),
      });
    })
    .catch((err) => {
      console.error("Error liking/unliking recipe:", err);
      return res.status(500).json({
        status: "error",
        message: "Failed to update like status",
      });
    });
}

function getLikedRecipes(req, res, next) {
  User.findById(req.user._id)
    .populate({
      path: "likes",
      populate: {
        path: "owner",
        select: "username profileImage",
      },
    })
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      return res.render("likedrecipes", {
        user: user,
        likedRecipes: user.likes,
        currentPage: "liked-recipes",
      });
    })
    .catch((err) => {
      console.error("Error fetching liked recipes:", err);
      return res.status(500).redirect("/error");
    });
}

// **********************************************/
// *
//*   COMMENTS
// *
// **********************************************/
// This function is used to get comments for a specific recipe

function getComments(req, res, next) {
  const recipeId = req.params.id;
  recipe
    .findById(recipeId)
    .populate("comments")
    .populate("comments.user") // Populate the user field in comments
    .populate("owner")
    .then((recipe) => {
      if (!recipe) {
        return res.status(404).redirect("/error");
      }
      console.log(recipe);
      return res.render("comments", { recipe: recipe, user: req.user });
    })
    .catch((err) => {
      console.error("Error fetching comments:", err);
      return res.status(500).redirect("/error");
    });
}

function createComment(req, res, next) {
  const recipeId = req.params.id;
  const userId = req.user._id;
  const commentText = req.body.comment; // Matches the textarea name="comment"

  const newComment = {
    content: commentText, // Changed from 'text' to 'content' to match your template
    user: userId,
    createdAt: new Date(),
  };

  recipe
    .findByIdAndUpdate(
      recipeId,
      { $push: { comments: newComment } }, // Changed from comment to comments, using $push instead of $addToSet
      {
        new: true,
        runValidators: true,
      }
    )
    .then((updatedRecipe) => {
      if (!updatedRecipe) {
        return res.status(404).redirect("/error");
      }
      // Redirect back to the comments page
      return res.redirect(`/user/recipe/${recipeId}/comments`);
    })
    .catch((err) => {
      console.error("Error adding comment:", err);
      return res.status(500).redirect("/error");
    });
}

function updateComment(req, res, next) {
  const recipeId = req.params.id;
  const commentId = req.params.commentId; // Assuming you have a way to get the comment ID
  const updatedText = req.body.comment; // Assuming you have a way to get the updated text

  recipe
    .findOneAndUpdate(
      { _id: recipeId, "comments._id": commentId },
      { $set: { "comments.$.content": updatedText } }, // Assuming 'content' is the field name in your comment schema
      { new: true }
    )
    .then((updatedRecipe) => {
      if (!updatedRecipe) {
        return res.status(404).redirect("/error");
      }
      return res.redirect(`/user/recipe/${recipeId}/comments`);
    })
    .catch((err) => {
      console.error("Error updating comment:", err);
      return res.status(500).redirect("/error");
    });
}

function deleteComment(req, res, next) {
  const recipeId = req.params.id;
  const commentId = req.params.commentId;
  recipe
    .findByIdAndUpdate(
      recipeId,
      { $pull: { comments: { _id: commentId, user: req.user._id } } },
      { new: true }
    )
    .then(() => res.redirect(`/user/recipe/${recipeId}/comments`))
    .catch((err) => {
      console.error("Error deleting comment:", err);
      res.status(500).redirect("/error");
    });
}

//**********************************************/
//*
//*  NOTIFICATIONS
//*
//**********************************************/

function getNotifications(req, res, next) {
  User.findById(req.user._id)
    .populate("notifications.from")
    .then((user) => {
      // Sort notifications by createdAt descending (newest first)
      const notifications = (user.notifications || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return res.render("notifications", {
        user,
        notifications,
        currentPage: "notifications",
      });
    })
    .catch((err) => {
      console.error("Error fetching notifications:", err);
      res.status(500).redirect("/error");
    });
}

function markAllAsRead(req, res, next) {
  User.findByIdAndUpdate(
    req.user._id,
    { $set: { "notifications.$[].read": true } },
    { new: true }
  )
    .then(() => {
      return res.redirect("/user/notifications");
    })
    .catch((err) => {
      console.error("Error marking notifications as read:", err);
      return res.status(500).redirect("/error");
    });
}

function markAsRead(req, res, next) {
  console.log("MARK AS READ!!!!!");
  User.findOneAndUpdate(
    { _id: req.user._id, "notifications._id": req.params.id },
    { $set: { "notifications.$.read": true } },
    { new: true }
  )
    .then(() => {
      console.log("JIBBERISH");
      return res.status(200).json({
        status: "success",
      });
    })
    .catch((err) => {
      console.error("Error marking notifications as read:", err);
      return res.status(500).redirect("/error");
    });
}

//**********************************************/
//*
function hi(req, res, next) {
  return res.render("hello", { bye: req.params.id });
}

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
  getRecipeById,
  getRecipes,
  getNewRecipePage,
  createRecipe,
  getProfile,
  getMyProfile,
  editProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserFollowers,
  getUserFollowing,
  likeRecipe,
  getLikedRecipes,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getNotifications,
  markAllAsRead,
  markAsRead,
  hi,
};
