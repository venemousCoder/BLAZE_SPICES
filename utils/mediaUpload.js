const uploadImage = require("./multer");      // Your image multer instance
const uploadVideo = require("./multerVideo"); // Your video multer instance

function mediaUpload(req, res, next) {
  // Use field names from your form
  const hasImage = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data') && req.body && req.body.recipeImage;
  const hasVideo = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data') && req.body && req.body.recipeVideo;

  // But since req.body is not populated yet, check req.files after multer runs
  // Instead, check req.files after multer runs, but we need to decide before
  // So, check req.files after upload, or use two fields in multer.fields

  // Instead, check req.files after upload, or use two fields in multer.fields
  // So, use .fields and allow both, but only one will be present

  // Use both uploaders, but only one file will be present
  const imageUploader = uploadImage.single("recipeImage");
  const videoUploader = uploadVideo.single("recipeVideo");

  imageUploader(req, res, function (err) {
    if (err && err.field !== "recipeImage") return next(err);
    if (req.file) return next(); // Image uploaded

    // If no image, try video
    videoUploader(req, res, function (err2) {
      if (err2) return next(err2);
      return next();
    });
  });
}

module.exports = mediaUpload;