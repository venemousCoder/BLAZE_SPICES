// Description: This file contains the user controller.
// It exports a function that renders the home view.

// Import necessary modules
const recipe = require("../models/recipe");
// Make sure this is the discriminator!
const { User } = require("../models/user");
const Group = require("../models/group");
const Activity = require("../models/activity");
const path = require("path");
const fs = require("fs");
const Report = require("../models/report");
// Cloudinary configuration
const cloudinary = require("../utils/cloudinary");
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

//************************** */
//
//  ACTIVITY HELPER FUNCTION
//
//************************** */

async function logActivity(userId, description) {
  try {
    await Activity.create({
      user: userId,
      description,
      timestamp: new Date(),
    });
  } catch (err) {
    //
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      logActivity(deletedUser._id, `Deleted their account and all data`);
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
              res.locals.error = err;
              res.locals.description = err.msg;
              return res.render("error", {
                error: err,
                description: err.message,
                status: 500,
              });
            });
        });
      } else {
        res.status(200).redirect("/user/dashboard");
        return next();
      }
    })
    .catch((err) => {
      res.locals.error = err;

      res.locals;
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function logout(req, res, next) {
  //
  req.logout((error, user) => {
    if (error) {
      //
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

              return res.render("feeds", {
                recipe: recipes,
                user: req.user,
                topUsers,
                currentPage: "feeds",
              });
            })
            .catch((err) => {
              //
              res.locals.error = err;
              res.locals.description = err.msg;
              return res.render("error", {
                error: err,
                description: err.message,
                status: 500,
              });
            });
        })
        .catch((err) => {
          //
          res.locals.error = err;
          res.locals.description = err.msg;
          return res.render("error", {
            error: err,
            description: err.message,
            status: 500,
          });
        });
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

// Handle the update recipe form submission
async function updateRecipe(req, res, next) {
  try {
    const recipeId = req.params.id;
    const recipeDoc = await recipe.findById(recipeId);
    console.log("Recipe Doc001:", recipeDoc);
    if (!recipeDoc) return res.status(404).redirect("/error");
    if (String(recipeDoc.owner) !== String(req.user._id))
      return res.status(403).redirect("/error");

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
    console.log("recipeDoc", recipeDoc);
    if (req.file) {
      if (req.file.mimetype.startsWith("image/")) {
        // delete old image
        if (recipeDoc.image) {
          try {
            if (recipeDoc.image.startsWith("/uploads/recipes/")) {
              const oldPath = path.join(
                __dirname,
                "../public",
                recipeDoc.image
              );
              await fs.promises.unlink(oldPath);
            } else if (recipeDoc.image.startsWith("http")) {
              deleteCloudinaryMedia(recipeDoc.image);
            }
          } catch (err) {
            console.warn("Image deletion error:", err);
          }
        }
        recipeDoc.image = req.file.path;
      }

      if (req.file.mimetype.startsWith("video/")) {
        // delete old video
        if (recipeDoc.video) {
          try {
            if (recipeDoc.video.startsWith("/uploads/videos/")) {
              const oldPath = path.join(
                __dirname,
                "../public",
                recipeDoc.video
              );
              await fs.promises.unlink(oldPath);
            } else if (recipeDoc.video.startsWith("http")) {
              deleteCloudinaryMedia(recipeDoc.video);
            }
          } catch (err) {
            console.warn("Video deletion error:", err);
          }
        }
        recipeDoc.video = req.file.path;
      }
    }

    await recipeDoc.save();
    const notification = {
      read: false,
      from: recipeDoc.owner,
      message: `updated their recipe 🆙`,
      type: "recipe",
      reference: recipeDoc._id, // ID of the user who followed
      createdAt: new Date(),
    };
    User.updateMany(
      { followers: updatedUser._id },
      {
        $push: {
          notifications: {
            notification,
          },
        },
      }
    )
      .then(async () => {
        await logActivity(req.user._id, `Updated recipe: "${recipeDoc.title}"`);
        return res.redirect(`/user/recipes`);
      })
      .catch((err) => {
        return res.render("error", {
          error: err,
          description: err.message,
          status: 500,
        });
      });
  } catch (err) {
    console.error("Update recipe error:", err);
    res.locals.error = err;
    res.locals.description = err.message || "Something went wrong";
    return res.status(500).render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
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
      await logActivity(req.user._id, `Deleted recipe: "${recipeDoc.title}"`);
      return res
        .status(200)
        .json({ status: "success", message: "Recipe deleted" });
    })
    .catch((err) => {
      //
      return res
        .status(500)
        .json({ status: "error", message: "Failed to delete recipe" });
    });
}

function getRecipes(req, res, next) {
  // .populate({
  //   path: "posts",
  //   populate: {
  //     path: "owner",
  //     select: "username profileImage",
  //   },
  // })
  recipe
    .find({ owner: req.user._id })
    .then((recipes) => {
      if (!recipes) {
        return res.status(404).redirect("/error");
      }
      return res.render("myrecipes", {
        user: req.user,
        recipes,
        currentPage: "recipes",
      });
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
  //
  recipe
    .create(newRecipe)
    .then((recipe) => {
      if (!recipe) {
        res.locals.error = err;
        res.locals.description = err.msg;
        return res.render("error", {
          error: err,
          description: err.message,
          status: 500,
        });
      }
      // Add the recipe to the user's posts array
      User.findByIdAndUpdate(req.user._id, {
        $addToSet: { posts: recipe._id },
      })
        .then((updatedUser) => {
          if (!updatedUser) {
            return res.status(404).redirect("/error");
          }
          const notification = {
            read: false,
            from: updatedUser._id,
            message: `created a new recipe 🆕`,
            type: "recipe",
            reference: recipe._id, // ID of the user who followed
            createdAt: new Date(),
          };
          User.updateMany(
            { followers: updatedUser._id },
            {
              $push: {
                notifications: {
                  notification,
                },
              },
            }
          )
            .then(() => {
              logActivity(
                req.user._id,
                `Created a new recipe: "${newRecipe.title}"`
              );
              res.status(201).redirect("/user/feeds");
            })
            .catch((err) => {
              return res.render("error", {
                error: err,
                description: err.message,
                status: 500,
              });
            });
        })
        .catch((err) => {
          return res.render("error", {
            error: err,
            description: err.message,
            status: 500,
          });
        });
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

async function testUserAccountDetails(req, res, next) {
  //
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

async function editProfile(req, res, next) {
  const userId = req.user._id;
  const updateData = {
    username: req.body.username,
    email: req.body.email,
    bio: req.body.bio,
    tag: req.body.tag,
  };

  // Upload profile image to Cloudinary if a new image was uploaded
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "blaze_spices/profile",
        resource_type: "image",
      });
      updateData.profileImage = result.secure_url;
    } catch (err) {
      //
      res.locals.error = "Failed to upload profile image";
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    }
  }

  User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).redirect("/error");
      }
      req.user = updatedUser;
      req.session.save((err) => {
        if (err) {
          //
          res.locals.error = err;
          res.locals.description = err.msg;
          return res.render("error", {
            error: err,
            description: err.message,
            status: 500,
          });
        }
        res.locals.message = "Profile updated successfully";
        return res.redirect("/user/dashboard");
      });
    })
    .catch((err) => {
      //
      res.locals.error = "Failed to update profile";
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      await logActivity(currentUserId, `Followed user: ${targetUser.username}`);
      return res.redirect(req.get("Referrer") || "/");
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
          message: `liked your post 👍`,
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
      //
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      return res.render("comments", { recipe: recipe, user: req.user });
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
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
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function markAsRead(req, res, next) {
  //
  User.findOneAndUpdate(
    { _id: req.user._id, "notifications._id": req.params.id },
    { $set: { "notifications.$.read": true } },
    { new: true }
  )
    .then(() => {
      //
      return res.status(200).json({
        status: "success",
      });
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
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
  //
  //
  //
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
    //
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
  //
  const query = req.query.q || ""; // Search query from user input
  const category = req.query.category || ""; // Category filter
  const area = req.query.area || ""; // Cuisine/Area filter

  try {
    let apiUrl;
    let meals = [];

    // Get categories for filter dropdown
    const categoriesResponse = await axios.get(
      "https://www.themealdb.com/api/json/v1/1/categories.php"
    );
    const categories = categoriesResponse.data.categories;

    if (query) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
        query
      )}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else if (category) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(
        category
      )}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else if (area) {
      apiUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(
        area
      )}`;
      const response = await axios.get(apiUrl);
      meals = response.data.meals || [];
    } else {
      // No search/filter: Show 10 random meals
      const randomMeals = await Promise.all(
        Array(10)
          .fill()
          .map(async () => {
            const response = await axios.get(
              "https://www.themealdb.com/api/json/v1/1/random.php"
            );
            return response.data.meals[0];
          })
      );
      meals = randomMeals;
    }

    return res.render("explore", {
      user: req.user,
      meals: meals,
      isAuthenticated: req.isAuthenticated(),
      categories: categories,
      currentPage: "explore",
      searchQuery: query,
      selectedCategory: category,
      selectedArea: area,
      isInitialLoad: !query && !category && !area,
    });
  } catch (err) {
    //
    return res.render("error", {
      error: err,
      description: "Network error",
      status: 500,
    });
  }
}

async function getExternalRecipe(req, res, next) {
  try {
    const mealId = req.params.id;
    // Fetch recipe details from TheMealDB
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
    );
    const meal = response.data.meals && response.data.meals[0];

    if (!meal) {
      return res.status(404).render("error", { message: "Recipe not found" });
    }

    return res.render("externalrecipes", {
      user: req.user,
      meal,
      isAuthenticated: req.isAuthenticated(),
      currentPage: "external-recipe",
    });
  } catch (err) {
    //
    return res.status(500).render("error", {
      description: "Failed to load recipe",
      error: err,
      status: 500,
    });
  }
}

async function getSavedRecipes(req, res, next) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).redirect("/error");
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
          //
          return null;
        }
      })
    );

    // Filter out any failed requests
    const validMeals = savedMeals.filter((meal) => meal !== null);

    return res.render("savedRecipes", {
      user: req.user,
      savedRecipes: validMeals,
      currentPage: "saved-recipes",
    });
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    return res.render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
}

async function saveRecipe(req, res) {
  try {
    const mealId = req.params.id;
    const userId = req.user._id;
    // Use a more reliable way to check if it's an external recipe
    // For example, you can use a route parameter or query, or check the URL pattern
    // Here, let's assume you use /user/save/external/:id for external and /user/save/:id for internal
    const isExternal = req.originalUrl.includes("/external/");
    const user = await User.findById(userId);
    //
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (isExternal) {
      const savedExternalRecipes = Array.isArray(user.savedExternalRecipes)
        ? user.savedExternalRecipes
        : [];
      const isSaved = savedExternalRecipes.includes(mealId);

      await User.findByIdAndUpdate(userId, {
        [isSaved ? "$pull" : "$addToSet"]: {
          savedExternalRecipes: mealId,
        },
      });
      return res.json({
        success: true,
        isSaved: !isSaved,
      });
    } else {
      const savedRecipes = Array.isArray(user.savedRecipes)
        ? user.savedRecipes
        : [];
      const isSaved = savedRecipes.includes(mealId);

      await User.findByIdAndUpdate(userId, {
        [isSaved ? "$pull" : "$addToSet"]: {
          savedRecipes: mealId,
        },
      });
      return res.json({
        success: true,
        isSaved: !isSaved,
      });
    }
  } catch (error) {
    //
    return res.status(500).json({
      success: false,
      error: "Failed to save recipe",
    });
  }
}

// **********************************************/
// *
//*  GROUPS
//*
// **********************************************/

async function getGroups(req, res, next) {
  try {
    // Fetch all groups, optionally populate members or owner if needed
    const groups = await Group.find().populate(
      "members",
      "username profileImage"
    );

    return res.render("groups", {
      user: req.user,
      groups: groups,
      currentPage: "groups",
    });
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    return res.render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
}

async function createGroup(req, res, next) {
  //
  try {
    const { group_name, group_description, group_type } = req.body;
    //
    // Validate required fields
    if (!group_name || !group_description || !group_type) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Handle group image upload (required)
    let group_image;
    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "blaze_spices/groups",
        resource_type: "image",
      });
      group_image = result.secure_url;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Group image is required" });
    }

    // Create the group
    const group = new Group({
      group_name,
      group_description,
      group_type,
      group_image,
      admin: req.user._id,
      members: [req.user._id],
      moderators: [],
      blocked_members: [],
      messages: [],
    });

    await group.save();
    // Add group to the user's groups array
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id },
    });
    // Optionally, send a notification to the user about group creation
    await logActivity(req.user._id, `Created group: "${group.group_name}"`);
    return res.status(201).json({
      ok: true,
    });
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    return res.render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
}

/**
 * Delete a group (only by owner)
 */
async function deleteGroup(req, res, next) {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).redirect("/error");
    }
    if (String(group.owner) !== String(userId)) {
      return res.status(403).redirect("/error");
    }

    await Group.findByIdAndDelete(groupId)
      // Optionally remove group from users' group lists if you track that
      .then(() => {
        logActivity(userId, `Deleted group: "${group.group_name}"`);
        User.updateMany({ groups: groupId }, { $pull: { groups: groupId } })
          .then((result) => {
            //
            return res.redirect("/user/groups");
          })
          .catch((err) => {
            //
          });
      });
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    return res.render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
}

/**
 * Update group description and privacy (only by owner)
 */
async function updateGroup(req, res, next) {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    const { description, privacy } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).redirect("/error");
    }
    if (String(group.owner) !== String(userId)) {
      return res.status(403).redirect("/error");
    }

    group.description = description || group.description;
    if (privacy === "public" || privacy === "private") {
      group.privacy = privacy;
    }
    await group.save();

    return res.redirect("/user/groups");
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    return res.render("error", {
      error: err,
      description: err.message,
      status: 500,
    });
  }
}

/**
 * Update member role (owner or moderator only can update)
 * body: { memberId, role } where role is "member" or "moderator"
 */
async function updateGroupRole(req, res, next) {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    const { memberId, role } = req.body;

    if (!["member", "moderator"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).redirect("/error");
    }

    // Only owner or moderator can update roles
    const isOwner = String(group.owner) === String(userId);
    const isModerator = group.moderators && group.moderators.includes(userId);

    if (!isOwner && !isModerator) {
      return res.status(403).redirect("/error");
    }

    // Remove from both arrays first
    group.moderators = group.moderators || [];
    group.members = group.members || [];

    group.moderators = group.moderators.filter(
      (id) => String(id) !== String(memberId)
    );
    group.members = group.members.filter(
      (id) => String(id) !== String(memberId)
    );

    if (role === "moderator") {
      group.moderators.push(memberId);
    } else {
      group.members.push(memberId);
    }

    await group.save();
    return res.json({ success: true });
  } catch (err) {
    //
    return res
      .status(500)
      .json({ success: false, message: "Failed to update role" });
  }
}

// In your getGroupChat controller
async function getGroupChat(req, res) {
  try {
    const group = await Group.findById(req.params.id)
      .populate({
        path: "messages",
        populate: { path: "sender", select: "username profileImage" },
        options: { sort: { createdAt: 1 } },
      })
      .populate("members", "username profileImage");

    if (!group) return res.status(404).redirect("/error");

    // Clear unread messages for this group
    await User.updateOne(
      { _id: req.user._id, "unreadMessages.group": group._id },
      { $set: { "unreadMessages.$.count": 0 } }
    );

    // Rest of your existing code...
    res.render("groupchat", {
      user: req.user,
      group,
      messages: group.messages,
      currentPage: "groups",
    });
  } catch (err) {
    //
    res.locals.error = err;
    res.locals.description = err.msg;
    res.status(500).redirect("/error");
  }
}

//**********************************************/
//
//*  REPORT SECTION
//
//**********************************************/

function report(req, res, next) {
  const { reportType, reportedItem, type, reason, itemType } = req.body;
  const userId = req.user._id;

  // Create a new report
  const newReport = new Report({
    reporter: userId,
    itemType: itemType,
    reportedItem: reportedItem,
    type: type,
    reason: reason,
    status: "pending",
    createdAt: new Date(),
  });

  newReport
    .save()
    .then(() => {
      res.locals.message = "Report submitted successfully";
      return res.redirect("/user/dashboard");
    })
    .catch((err) => {
      //
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

//*
function hi(req, res, next) {
  return res.render("hello", { bye: req.params.id });
}

module.exports = {
  testUserAccountDetails,
  deleteCloudinaryMedia,
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
  getExternalRecipe,
  saveRecipe,
  getSavedRecipes,
  getGroups,
  createGroup,
  deleteGroup,
  updateGroup,
  updateGroupRole,
  getGroupChat,
  logActivity,
  report,
  hi,
};
