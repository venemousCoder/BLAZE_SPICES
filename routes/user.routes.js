const router = require("express").Router();
const homecontrollers = require("../controllers/home.controller");
const usercontrollers = require("../controllers/user.controller");
const jwtauth = require("../utils/jwt");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,"/"));
    console.log("hello multer");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
    console.log("hello multer2");
  },
});
const upload = multer({ storage: storage });

// In your route
router.get("/tua", usercontrollers.testUserAccountDetails);
router.use(jwtauth.userVerifyJwt);


router.get("/logout", usercontrollers.logout);

router.get("/feeds", usercontrollers.getFeeds);

// router.get("/profile", usercontrollers.getProfile);

router.get("/dashboard", usercontrollers.getDahsboard);

router.get("/deactivate", usercontrollers.deleteUser);

router.put("/updateacc", usercontrollers.updateUserProfile);

router.post(
  "/recipes",
  upload.single("recipeImage"),
  usercontrollers.createRecipe
);

module.exports = router;
