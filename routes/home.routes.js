const router = require("express").Router();
const homeControllers = require("../controllers/home.controller");
const userControllers = require('../controllers/user.controller')

router.get("/", homeControllers.getHome);
router.get("/signup", homeControllers.getSignUp);
router.get("/login", homeControllers.getLogin);
router.post('/signup', userControllers.createUser);
router.post('/login', userControllers.userLogin);

module.exports = router;
