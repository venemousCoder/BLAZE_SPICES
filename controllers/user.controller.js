// Description: This file contains the user controller.
// It exports a function that renders the home view.
const recipe = require("../models/recipe");
const { User } = require("../models/user"); // Make sure this is the discriminator!
const path = require("path");
const fs = require("fs");
const cloudinary = require("../utils/cloudinary"); // adjust path as needed
const axios = require("axios");

//************************** */
//
//  CLOUDINARY HELPER FUNCTION
//
//************************** */
function deleteCloudinaryMedia(url) {
  if (!url) return;
  // Extract public_id from URL
  // Example: https://res.cloudinary.com/<cloud_name>/.../blaze_spices/recipes/images/abc123.jpg
  const matches = url.match(
    /\/blaze_spices\/recipes\/(?:images|videos)\/([^\.\/]+)\./
  );
  if (matches && matches[1]) {
    const publicId = `blaze_spices/recipes/${
      url.includes("/images/") ? "images" : "videos"
    }/${matches[1]}`;
    const resourceType = url.includes("/videos/") ? "video" : "image";
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) console.warn("Cloudinary deletion error:", error);
      }
    );
  }
}

// *****************************CONTROLLERS START*****************

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
              // console.log("RECIPE.VID", recipes);
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

// Render the edit recipe page with current recipe data
function getUpdateRecipe(req, res, next) {
  const recipeId = req.params.id;
  recipe
    .findById(recipeId)
    .then((recipeDoc) => {
      if (!recipeDoc) {
        return res.status(404).redirect("/error");
      }
      // Only allow the owner to edit
      if (String(recipeDoc.owner) !== String(req.user._id)) {
        return res.status(403).redirect("/error");
      }
      return res.render("updaterecipe", {
        recipe: recipeDoc,
        user: req.user,
        currentPage: "edit-recipe",
      });
    })
    .catch((err) => {
      console.error("Error loading recipe for edit:", err);
      return res.status(500).redirect("/error");
    });
}

// Handle the update recipe form submission
function updateRecipe(req, res, next) {
  const recipeId = req.params.id;
  recipe
    .findById(recipeId)
    .then(async (recipeDoc) => {
      if (!recipeDoc) {
        return res.status(404).redirect("/error");
      }
      // Only allow the owner to update
      if (String(recipeDoc.owner) !== String(req.user._id)) {
        return res.status(403).redirect("/error");
      }

      // Update fields
      recipeDoc.title = req.body.title;
      recipeDoc.description = req.body.description;
      recipeDoc.ingredients = Array.isArray(req.body.ingredients)
        ? req.body.ingredients
        : [req.body.ingredients];
      recipeDoc.steps = Array.isArray(req.body.steps)
        ? req.body.steps
        : [req.body.steps];
      recipeDoc.preparationTime = req.body.preparationTime;
      recipeDoc.cookingTime = req.body.cookingTime;
      recipeDoc.cuisine = req.body.cuisine;
      recipeDoc.category = req.body.category;
      recipeDoc.difficulty = req.body.difficulty;
      recipeDoc.servings = req.body.servings;

      // Handle image or video update if a new file is uploaded
      if (req.file) {
        if (req.file.mimetype.startsWith("image/")) {
          recipeDoc.image = req.file.path; // Cloudinary URL
        } else if (req.file.mimetype.startsWith("video/")) {
          recipeDoc.video = req.file.path; // Cloudinary URL
        }
      }
      // Optionally delete the old image or video file
      if (req.file) {
        // Delete old image if new image uploaded
        if (req.file.mimetype.startsWith("image/") && recipeDoc.image) {
          if (recipeDoc.image.startsWith("/uploads/recipes/")) {
            // Local file
            const oldPath = path.join(__dirname, "../public", recipeDoc.image);
            fs.unlink(oldPath, (err) => {
              if (err) console.warn("Could not delete old image:", err);
            });
          } else if (recipeDoc.image.startsWith("http")) {
            // Cloudinary
            deleteCloudinaryMedia(recipeDoc.image);
          }
        }
        // Delete old video if new video uploaded
        if (req.file.mimetype.startsWith("video/") && recipeDoc.video) {
          if (recipeDoc.video.startsWith("/uploads/videos/")) {
            // Local file
            const oldPath = path.join(__dirname, "../public", recipeDoc.video);
            fs.unlink(oldPath, (err) => {
              if (err) console.warn("Could not delete old video:", err);
            });
          } else if (recipeDoc.video.startsWith("http")) {
            // Cloudinary
            deleteCloudinaryMedia(recipeDoc.video);
          }
        }
      }

      //LOCAL UPLOAD FOR MULTER
      // if (req.file) {
      //   if (req.file.mimetype.startsWith("image/")) {
      //     recipeDoc.image = `/uploads/recipes/${req.file.filename}`;
      //   } else if (req.file.mimetype.startsWith("video/")) {
      //     recipeDoc.video = `/uploads/videos/${req.file.filename}`;
      //   }
      // }

      await recipeDoc.save();
      return res.redirect(`/user/recipes`);
    })
    .catch((err) => {
      console.error("Error updating recipe:", err);
      return res.status(500).redirect("/error");
    });
}

// Delete a recipe (and remove from user's posts)
function deleteRecipe(req, res, next) {
  const recipeId = req.params.id;
  recipe
    .findById(recipeId)
    .then(async (recipeDoc) => {
      if (!recipeDoc) {
        return res
          .status(404)
          .json({ status: "error", message: "Recipe not found" });
      }
      // Only allow the owner to delete
      if (String(recipeDoc.owner) !== String(req.user._id)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      // Optionally delete the old image or video file
      if (req.file) {
        // Delete old image if new image uploaded
        if (req.file.mimetype.startsWith("image/") && recipeDoc.image) {
          if (recipeDoc.image.startsWith("/uploads/recipes/")) {
            // Local file
            const oldPath = path.join(__dirname, "../public", recipeDoc.image);
            fs.unlink(oldPath, (err) => {
              if (err) console.warn("Could not delete old image:", err);
            });
          } else if (recipeDoc.image.startsWith("http")) {
            // Cloudinary
            deleteCloudinaryMedia(recipeDoc.image);
          }
        }
        // Delete old video if new video uploaded
        if (req.file.mimetype.startsWith("video/") && recipeDoc.video) {
          if (recipeDoc.video.startsWith("/uploads/videos/")) {
            // Local file
            const oldPath = path.join(__dirname, "../public", recipeDoc.video);
            fs.unlink(oldPath, (err) => {
              if (err) console.warn("Could not delete old video:", err);
            });
          } else if (recipeDoc.video.startsWith("http")) {
            // Cloudinary
            deleteCloudinaryMedia(recipeDoc.video);
          }
        }
      }
      // Optionally delete the image file FOR LOCAL MULTER
      // if (recipeDoc.image && recipeDoc.image.startsWith("/uploads/recipes/")) {
      //   const imgPath = path.join(__dirname, "../public", recipeDoc.image);
      //   fs.unlink(imgPath, (err) => {
      //     if (err) console.warn("Could not delete recipe image:", err);
      //   });
      // }

      // Remove recipe from user's posts
      await User.findByIdAndUpdate(recipeDoc.owner, {
        $pull: { posts: recipeId },
      });

      // Delete the recipe
      await recipe.deleteOne({ _id: recipeId });

      return res
        .status(200)
        .json({ status: "success", message: "Recipe deleted" });
    })
    .catch((err) => {
      console.error("Error deleting recipe:", err);
      return res
        .status(500)
        .json({ status: "error", message: "Failed to delete recipe" });
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

  // Handle media
  if (req.file) {
    if (req.file.mimetype.startsWith("image/")) {
      newRecipe.image = req.file.path; // Cloudinary URL
    } else if (req.file.mimetype.startsWith("video/")) {
      newRecipe.video = req.file.path; // Cloudinary URL
    }
  }

  newRecipe.ingredients = Array.isArray(req.body.ingredients)
    ? req.body.ingredients
    : [req.body.ingredients];
  newRecipe.steps = Array.isArray(req.body.steps)
    ? req.body.steps
    : [req.body.steps];
  console.log("From Create controller: ", newRecipe);
  recipe
    .create(newRecipe)
    .then((recipe) => {
      if (!recipe) {
        return res.status(500).redirect("/error");
      }
      // Add the recipe to the user's posts array
      User.findByIdAndUpdate(req.user._id, {
        $addToSet: { posts: recipe._id },
      })
        .then(() => res.status(201).redirect("/user/feeds"))
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
    .populate("posts.owner")
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
// *  VIDEO UPLOAD
//*
//**********************************************/

// This function is used to upload a video for a recipe
async function uploadRecipeVideo(req, res, next) {
  const recipeId = req.params.id;
  console.log("VIDEO UPLOAD");
  console.log("RECIPE ID: ", recipeId);
  console.log("FILE: ", req.file);
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "error", message: "No video uploaded" });
  }
  try {
    const recipeDoc = await recipe.findById(recipeId);
    if (!recipeDoc) {
      return res
        .status(404)
        .json({ status: "error", message: "Recipe not found" });
    }
    // Save the video path (adjust the field as needed)
    recipeDoc.video = `/uploads/videos/${req.file.filename}`;
    await recipeDoc.save();
    var video = recipeDoc.video;
    return next(video);
  } catch (err) {
    console.error("Error uploading video:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to upload video" });
  }
}

//***************************************/
//
//  EXPLORE AND SAVE - UNSAVE
//
//************************************ */

// Explore recipes from TheMealDB API
async function explore(req, res, next) {
  console.log("EXPLORE");
  const query = req.query.q || ""; // Search query from user input
  const category = req.query.category || ""; // Category filter
  const area = req.query.area || ""; // Cuisine/Area filter
  
  try {
    let apiUrl;
    let meals = [];

    // Get categories for filter dropdown
    const categoriesResponse = await axios.get('https://www.themealdb.com/api/json/v1/1/categories.php');
    const categories = categoriesResponse.data.categories;

    if (query) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else if (category) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else if (area) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else {
      // No search/filter: Show 10 random meals
      const randomMeals = await Promise.all(
        Array(10).fill().map(async () => {
          const response = await axios.get('https://www.themealdb.com/api/json/v1/1/random.php');
          return response.data.meals[0];
        })
      );
      meals = randomMeals;
    }
    console.log(meals)
    return res.render("explore", {
      user: req.user,
      meals: meals,
      categories: categories,
      currentPage: "explore",
      searchQuery: query,
      selectedCategory: category,
      selectedArea: area,
      isInitialLoad: !query && !category && !area
    });
  } catch (err) {
    console.error("Error fetching from TheMealDB:", err);
    return res.status(500).redirect("/error");
  }
}

async function getSavedRecipes(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).redirect('/error');
    }

    // Fetch saved TheMealDB recipes
    const savedMeals = await Promise.all(
      user.savedExternalRecipes.map(async (mealId) => {
        try {
          const response = await axios.get(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
          );
          return response.data.meals[0];
        } catch (err) {
          console.error(`Error fetching meal ${mealId}:`, err);
          return null;
        }
      })
    );

    // Filter out any failed requests
    const validMeals = savedMeals.filter(meal => meal !== null);

    return res.render('savedRecipes', {
      user: req.user,
      savedRecipes: validMeals,
      currentPage: 'saved-recipes'
    });
  } catch (err) {
    console.error('Error fetching saved recipes:', err);
    return res.status(500).redirect('/error');
  }
}

async function saveRecipe(req, res) {
  try {
    const mealId = req.params.id;
    const userId = req.user._id;
    const isExternal = req.path.includes('external');

    const user = await User.findById(userId);
    
    if (isExternal) {
      // Handle external (TheMealDB) recipes
      const isSaved = user.savedExternalRecipes.includes(mealId);
      
      await User.findByIdAndUpdate(userId, {
        [isSaved ? '$pull' : '$addToSet']: { 
          savedExternalRecipes: mealId 
        }
      });
      
    } else {
      // Handle internal recipes
      const isSaved = user.savedRecipes.includes(mealId);
      
      await User.findByIdAndUpdate(userId, {
        [isSaved ? '$pull' : '$addToSet']: { 
          savedRecipes: mealId 
        }
      });
    }

    return res.json({ 
      success: true, 
      isSaved: !isSaved 
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save recipe' 
    });
  }
}

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
  updateRecipe,
  getUpdateRecipe,
  deleteRecipe,
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
  uploadRecipeVideo,
  explore,
  saveRecipe,
  getSavedRecipes,
  hi,
};
