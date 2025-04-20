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

// router.get("/profile", usercontrollers.getProfile);

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

// router.get("/hi/:id", usercontrollers.hi)

module.exports = router;
