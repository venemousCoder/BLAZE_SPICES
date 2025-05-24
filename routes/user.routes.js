const router = require("express").Router();
const usercontrollers = require("../controllers/user.controller");
const groupcontrollers = require("../controllers/group.controller");
const aicontrollers = require("../controllers/ai.controller");
const jwtauth = require("../utils/jwt");
const uploadd = require("../utils/multer");
const uploadVideo = require("../utils/multerVideo");
const upload = require("../utils/aimulter")

// **********************************************/
//*
//*  NO AUTH ROUTES
//*
// **********************************************/

router.post(
  "/tua",
  // uploadVideo.single("test"),
  usercontrollers.testUserAccountDetails
);

router.get("/explore", usercontrollers.explore);

router.get("/external/recipe/:id", usercontrollers.getExternalRecipe);

// **********************************************/
//*
//*  PROTECTED ROUTES
//*
// **********************************************/

router.use(jwtauth.userVerifyJwt);

router.get("/logout", usercontrollers.logout);

router.get("/feeds", usercontrollers.getFeeds);

router.get("/hi", usercontrollers.hi);

router.get("/dashboard", usercontrollers.getDahsboard);

router.get("/deactivate", usercontrollers.deactivateUserAccount);

router.get("/delete/account", usercontrollers.deleteUserAccountOnly);

router.get("/delete/everything", usercontrollers.deleteUserAndEverything);

router.put("/updatepass", usercontrollers.updatePassword);

router.get("/updatepass", usercontrollers.getUpdatePassword);

router.post(
  "/profile/update",
  uploadd.single("profileImage"),
  usercontrollers.editProfile
);

router.post(
  "/recipes",
  uploadd.single("recipeImage"),
  usercontrollers.createRecipe
);

router.post(
  "/recipes/vid",
  uploadVideo.single("recipeVideo"),
  usercontrollers.createRecipe // <-- Only this, not uploadRecipeVideo
);

router.get("/myprofile", usercontrollers.getMyProfile);

router.get("/profile/:id", usercontrollers.getProfile);

router.post("/follow/:id", usercontrollers.followUser);

router.post("/unfollow/:id", usercontrollers.unfollowUser);

router.get("/followers", usercontrollers.getFollowers);

router.get("/following", usercontrollers.getFollowing);

router.get("/followers/:id", usercontrollers.getUserFollowers);

router.get("/following/:id", usercontrollers.getUserFollowing);

//like and unlike
router.post("/like/:id", usercontrollers.likeRecipe);

router.get("/recipes", usercontrollers.getRecipes);

router.get("/recipes/:id/edit", usercontrollers.getUpdateRecipe);

router.post(
  "/recipes/:id/edit",
  uploadd.single("recipeImage"),
  usercontrollers.updateRecipe
);

router.post(
  "/recipes/:id/edit/vid",
  uploadVideo.single("recipeVideo"),
  usercontrollers.updateRecipe
);

router.delete("/recipes/:id/delete", usercontrollers.deleteRecipe);

router.get("/recipe/:id", usercontrollers.getRecipeById);

router.get("/liked-recipes", usercontrollers.getLikedRecipes);

router.get("/newrecipe", usercontrollers.getNewRecipePage);

router.get("/recipe/:id/comments", usercontrollers.getComments);

router.post("/recipe/:id/comments", usercontrollers.createComment);

router.post(
  "/recipe/:id/comments/:commentId/edit",
  usercontrollers.updateComment
);

router.post(
  "/recipe/:id/comments/:commentId/delete",
  usercontrollers.deleteComment
);

router.get("/notifications", usercontrollers.getNotifications);

router.post("/notifications/:id/read", usercontrollers.markAsRead);

router.post("/notifications/mark-all-read", usercontrollers.markAllAsRead);

router.post("/recipes/:id/save", usercontrollers.saveRecipe);

router.post("/external/recipe/:id/save", usercontrollers.saveRecipe);

router.get("/saved", usercontrollers.getSavedRecipes);

router.get("/groups", usercontrollers.getGroups);

router.post(
  "/groups",
  uploadd.single("group_image"),
  usercontrollers.createGroup
);

// Delete a group (owner only)
router.post("/groups/:id/delete", usercontrollers.deleteGroup);

// Update group description/privacy (owner only)
router.post("/groups/:id/update", usercontrollers.updateGroup);

// Update a member's role (owner or moderator only)
router.post("/groups/:id/role", usercontrollers.updateGroupRole);

// Join group (DB update)
router.post("/groups/:id/join", groupcontrollers.joinGroup);
// Leave group (DB update)
router.post("/groups/:id/leave", groupcontrollers.leaveGroup);

router.get(
  "/groups/:id/chat",
  groupcontrollers.checkGroupMembership,
  usercontrollers.getGroupChat
);

router.post("/groups/:id/promote", groupcontrollers.promoteToModerator);

router.post("/groups/:id/kick", groupcontrollers.kickMember);

router.post(
  "/groups/:id/settings",
  uploadd.single("group_image"),
  groupcontrollers.updateGroupSettings
);

router.post("/groups/:id/demote", groupcontrollers.demoteModerator);

router.delete("/groups/:id", groupcontrollers.deleteGroup);

router.post("/groups/:id/approve", groupcontrollers.approveJoinRequest);

router.post("/groups/:id/reject", groupcontrollers.rejectJoinRequest);

router.post("/groups/:id/block", groupcontrollers.blockMember);

router.post("/groups/:id/unblock", groupcontrollers.unblockMember);

router.post("/report", usercontrollers.report);

//******************************************** */
//
//  AI ROUTES
//
//******************************************** */

router.get("/ailabs", aicontrollers.getAiLabs);
router.get("/ailabs/upload", aicontrollers.getAilabsVideoUpload);
router.get("/ailabs/:id", aicontrollers.getAiLabs);
router.get("/ailabs/edit/:id", aicontrollers.getAilabsEdit);
router.post(
  "/ai/generate",
  upload.single("vid"),
  aicontrollers.generateRecipe
);

module.exports = router;
