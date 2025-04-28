const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// Image storage
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blaze_spices/recipes/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
  },
});

// Video storage
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blaze_spices/recipes/videos',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm', 'ogg', 'mkv'],
    resource_type: 'video',
    transformation: [{ width: 800, crop: 'limit' }],
  },
});

module.exports = { imageStorage, videoStorage };