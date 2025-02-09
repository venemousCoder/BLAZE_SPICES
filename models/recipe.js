const mongoose = require("mongoose");

const recipeSchema = mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    likes: { type: Number },
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
