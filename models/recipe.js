const { content } = require("googleapis/build/src/apis/content");
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

     likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: [
        "Appetizer",
        "Main Course",
        "Dessert",
        "Salad",
        "Soup",
        "Beverage",
        "Snack",
        "Side Dish",
      ],
      required: true,
    },
    cuisine: {
      type: String,
      enum: [
        "African",
        "Asian",
        "European",
        "American",
        "Middle Eastern",
        "Latin American",
        "Caribbean",
        "Oceania",
        "Fusion",
        "Other",
      ],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    servings: {
      type: Number,
      required: true,
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
        content: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
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
