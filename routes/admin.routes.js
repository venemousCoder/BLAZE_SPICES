const router = require("express").Router();
const admincontrollers = require("../controllers/admin.controller");
const jwtauth = require("../utils/jwt");

router.use(jwtauth.verifyToken);
router.get("/dashboard", admincontrollers.getDashboard);
module.exports = router;
