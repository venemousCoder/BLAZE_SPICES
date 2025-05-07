const router = require("express").Router();
const admincontrollers = require("../controllers/admin.controller");
const jwtauth = require("../utils/jwt");

router.use(jwtauth.verifyToken);
router.get("/dashboard", admincontrollers.getDashboard);
router.get("/report/:id", admincontrollers.getReport);
router.post("/report/:id/update", admincontrollers.updateReport);
router.post("/report/:id/delete", admincontrollers.deleteReport);
module.exports = router;
