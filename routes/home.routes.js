const router = require("express").Router();
const homeControllers = require("../controllers/home.controller");
const userControllers = require("../controllers/user.controller")

router.get("/", homeControllers.getHome);
router.get("/signup", homeControllers.getSignUp);
router.get("/login", homeControllers.getLogin);
router.get("/contact", homeControllers.getContact);
router.get("/about", homeControllers.getAbout);
router.get("/terms", homeControllers.getTerms);

router.get("/explore", userControllers.explore);
router.get("/external/recipe/:id", userControllers.getExternalRecipe)

module.exports = router;
