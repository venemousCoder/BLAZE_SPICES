const router = require("express").Router();
const homecontrollers = require("../controllers/home.controller");
const usercontrollers = require("../controllers/user.controller");
const jwtauth = require("../utils/jwt");
const multer = require("multer");
const path = require("path");
const uploadd = require("../utils/multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/recipes"));
    console.log(
      "Destination: ",
      path.join(__dirname, "../public/uploads/recipes")
    );
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/profile/update",
  uploadd.single("profileImage"),
  usercontrollers.editProfile
);
router.get("/tua", usercontrollers.testUserAccountDetails);
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
  "/recipes",
  upload.single("recipeImage"),
  usercontrollers.createRecipe
);

router.get("/myprofile", usercontrollers.getMyProfile);

router.get("/profile/:id", usercontrollers.getProfile);

router.post('/follow/:id', usercontrollers.followUser);

router.post('/unfollow/:id', usercontrollers.unfollowUser);

router.get('/followers', usercontrollers.getFollowers);

router.get('/following', usercontrollers.getFollowing);

//like and unlike
router.post('/like/:id', usercontrollers.likeRecipe);

router.get('/recipe/:id', usercontrollers.getRecipe)

router.get('/recipe/:id/comments', usercontrollers.getComments);

router.post('/recipe/:id/comments', usercontrollers.createComment);

router.post('/recipe/:id/comments/:commentId/edit', usercontrollers.updateComment);

router.post('/recipe/:id/comments/:commentId/delete', usercontrollers.deleteComment);

router.get("/notifications", usercontrollers.getNotifications)

router.post("/notifications/:id/read", usercontrollers.markAsRead)

router.post("/notifications/mark-all-read", usercontrollers.markAllAsRead)

module.exports = router;
