const multer = require("multer");
const path = require("path");
const { videoStorage } = require('./cloudinaryStorage');

const uploadVideo = multer({ storage: videoStorage });



module.exports = uploadVideo;