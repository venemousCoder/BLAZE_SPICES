const mongoose = require("mongoose");
const PassportLocalMongoose = require("passport-local-mongoose");
const crypto = require("crypto");
const { type } = require("os");

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

const userSchema = new mongoose.Schema({
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
    },
  ],
  savedRecipes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
    },
  ],
  savedExternalRecipes: [{
    type: String, // Store TheMealDB idMeal
    default: []
  }],
  bio: {
    type: String,
    default: "I am a passionate cook",
  },
  profileImage: {
    type: String,
    default: "/uploads/profile/default-profile.png",
  },
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
  notifications: [
    {
      read: {
        type: Boolean,
        require: true,
        default: false,
      },
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      type: {
        type: String,
        required: true,
      },
      reference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
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
});

// FOLLOWERS
// FOLLOWING

// Add this function to update tag based on followers count
userSchema.methods.updateRankBasedOnFollowers = function () {
  const followersCount = this.followers.length;

  if (followersCount >= 1000) {
    this.tag = "World-Class Chef";
  } else if (followersCount >= 500) {
    this.tag = "Chef";
  } else if (followersCount >= 200) {
    this.tag = "Apprentice Chef";
  } else if (followersCount >= 100) {
    this.tag = "Modern Cook";
  } else if (followersCount >= 2) {
    this.tag = "Cooking Protoge";
  } else {
    this.tag = "Kitchen Helper";
  }
};

// Add pre-save middleware to automatically update rank
userSchema.pre("save", function (next) {
  if (this.isModified("followers")) {
    this.updateRankBasedOnFollowers();
  }
  next();
});
const User = Account.discriminator("User", userSchema);

module.exports = { Account, User, Admin };
