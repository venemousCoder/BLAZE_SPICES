const multer = require("multer");
const path = require("path");
const { imageStorage } = require('./cloudinaryStorage');

const uploadImage = multer({ storage: imageStorage });

// Configure multer for profile image uploads

// Update the route to use multer

module.exports = uploadImage;
// In your route file, you can use this upload middleware
// const upload = require("../utils/multer");