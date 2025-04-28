const uploadImage = require("./multer");
const uploadVideo = require("./multerVideo");
const multer = require("multer");
const {uploadRecipeVideo} = require("../controllers/user.controller")

// Accept both fields, but only one will be present (or none)
const mediaUpload = multer().fields([
  { name: "recipeImage", maxCount: 1 },
  { name: "recipeVideo", maxCount: 1 },
]);

function handleMediaUpload(req, res, next) {
  mediaUpload(req, res, function (err) {
    if (err) return next(err);

    // If an image is present, process it
    if (req.files && req.files.recipeImage) {
      return uploadImage.single("recipeImage")(req, res, next);
    }
    // If a video is present, process it
    if (req.files && req.files.recipeVideo) {
      uploadRecipeVideo(req, res, function (err) {
        if (err) return next(err);
      });
      return uploadVideo.single("recipeVideo")(req, res, next);
    }
    // If neither is present, just continue
    return next();
  });
}

module.exports = handleMediaUpload;