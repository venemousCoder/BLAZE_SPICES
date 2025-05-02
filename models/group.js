const mongoose = require("mongoose");

const groupScheme = mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  ],
  blocked_members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  ],
  moderators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
  ],
  group_name: {
    type: String,
    required: true,
  },
  group_description: {
    type: String,
    required: true,
  },
  group_image: {
    type: String,
    required: true,
  },
  group_type: {
    type: String,
    required: true,
    enum: ["public", "private"],
    default: "public",
  },
  messages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  ],
  locked: {
    type: Boolean,
    default: false,
  },
  rules: { type: String },
  requireApproval: {
    type: Boolean,
    default: false,
  },
  membersCanInvite: {
    type: Boolean,
    default: true,
  },
  allowModsToManageSettings: {
    type: Boolean,
    default: false,
  },
  joinRequests: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const group = mongoose.model("group", groupScheme);

module.exports = group;
