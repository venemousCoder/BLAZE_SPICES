const multer = require("multer");
const path = require("path");
const { videoStorage } = require('./cloudinaryStorage');

const uploadVideo = multer({ storage: videoStorage });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/videos"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + path.extname(file.originalname).toLowerCase());
  }
});

const uploadVideoo = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /mp4|mov|avi|webm|ogg|mkv/;
    const mimetype = filetypes.test(file.mimetype.toLowerCase());
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    console.log("VIDEO MULTER")
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only video files are allowed!"));
  }
});

module.exports = uploadVideo;