const mongoose = require("mongoose");
const PassportLocalMongoose = require("passport-local-mongoose");
const crypto = require("crypto");

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
AccountScheme.methods.generateVerificationToken = function () {
  this.verificationToken = crypto.randomBytes(32).toString("hex");
};

const Account = mongoose.model("Account", AccountScheme);
const Admin = Account.discriminator("Admin", {});
const User = Account.discriminator(
  "User",
  new mongoose.Schema({
    groups: {
      id: [{ type: mongoose.Schema.Types.ObjectId, ref: "group" }],
      role: { type: String },
    },
    posts: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    tag: {
      type: String,
      required: true,
      enum: [
        "World-Class Chef",
        "Chef",
        "Apprentice Chef",
        "Modern Cook",
        "Cooking Protoge",
        "Kitchen Helper",
      ],
      default: "Kitchen Helper",
    },
    resetPasswordToken: {
      type: String,
      unique: true,
      default: null,
    },
    resetPasswordExpires: {
      type: Number,
      default: null,
    },
    verified: { type: Boolean, default: false }, // Default: not verified
    verificationToken: { type: String }, // Stores email verification token
  })
);

module.exports = { Account, User, Admin };
