const router = require('express').Router();
const homeControllers = require('../controllers/home.controller');

router.get('/', homeControllers.getHome);

module.exports = router;