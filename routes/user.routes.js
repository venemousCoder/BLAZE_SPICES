const router = require('express').Router();
const userControllers = require('../controllers/user.controller')

router.get('logout', userControllers.logout)

module.exports = router;