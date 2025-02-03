const router = require("express").Router();
const adminRouter = require("./admin.routes");
const userRouter = require("./user.routes");
const homeRouter = require("./home.routes");
const errorRouter = require("./error.routes");

router.use("/", homeRouter);
router.use("/admin", adminRouter);
router.use("/user", userRouter);
router.use("*", errorRouter);

module.exports = router;
