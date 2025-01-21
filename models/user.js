const mongoose = require("mongoose");
const PassportLocalMongoose = require("passport-local-mongoose");
const AccountScheme = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: [true, "Email already exist"],
    },
    username: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      default: "user",
    },
    groups: {
      type: [],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

AccountScheme.plugin(PassportLocalMongoose, {
  usernameField: "email",
});

const Account = mongoose.model("Account", AccountScheme);
const Admin = Account.discriminator("Admin", {});
const User = Account.discriminator(
  "User",
  new mongoose.Schema({
    groups: {
      type: [{ id: mongoose.Schema.Types.ObjectId, ref: "Group" }],
      role: { type: String },
    },
  })
);

module.exports = { Account };
