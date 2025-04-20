const mongoose = require("mongoose");

const recipeSchema = mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
     },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ingredients: {
      type: [String],
      required: true,
    },
    preparationTime: {
      type: String,
      required: true,
    },
    cookingTime: {
      type: String,
      required: true,
    },
    steps: {
      type: [String],
      required: true,
    },
    image: { type: String }, // Add this field to store the image path
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Recipe = mongoose.model("Recipe", recipeSchema);
module.exports = Recipe;
// Compare this snippet from models/user.js:
// const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");
//
// const userSchema = mongoose.Schema(
//   {
//     username: {
//       type: String,
//       required: true,
//     },
//     email: {
//       type: String,
//       required: true,
//     },
//     role: {
//       type: String,
//       default: "user",
//     },
//   },
//   { timestamps: true }
// );
//
