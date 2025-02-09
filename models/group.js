const mongoose = require("mongoose");

const groupScheme = mongoose.Schema({
  Admin: {
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
});

const group = mongoose.model("group", groupScheme);

module.exports = group;
