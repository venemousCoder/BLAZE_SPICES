const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  usersToNotify: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  notificationType: {
    type: String,
    enum: ["like", "comment", "follow", "mention"],
    required: true,
  },
  notificationText: {
    type: String,
    required: true,
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Recipe",
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
  replyId: { type: mongoose.Schema.Types.ObjectId, ref: "Reply" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
