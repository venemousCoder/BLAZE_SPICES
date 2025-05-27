const aiProcessor = require("../utils/aiProcessor");
const ai = require("../models/ai");
const usercontroller = require("./user.controller");
const { User } = require("../models/user");
const Recipe = require("../models/recipe");
const cloudinary = require("../utils/cloudinary");

function getAilab(req, res, next) {
  return res.render("ailab", {
    user: req.user,
    currentPage: "ai",
  });
}

function getAiLabs(req, res, next) {
  User.findById(req.user._id)
    .populate("aipretexts")
    .then((user) => {
      if (!user) {
        return res.status(404).redirect("/error");
      }
      // console.log("AI: ", user.aipretexts);
      return res.render("ailabs", {
        user: req.user,
        currentPage: "ai",
        ailabs: user.aipretexts,
      });
    })
    .catch((err) => {
      console.error("Error fetching user profile: ", err);
      res.locals.error = err;
      res.locals.description = err.msg;
      return res.render("error", {
        error: err,
        description: err.message,
        status: 500,
      });
    });
}

function getAilabsVideoUpload(req, res, next) {
  return res.render("ailabsvideoupload", {
    user: req.user,
    currentPage: "ai",
  });
}

const AI = require("../models/ai"); // Assuming you have an AI model

async function getAilabsEdit(req, res, next) {
  try {
    const recipeId = req.params.id;
    // Fetch the AI-generated recipe from the database
    const recipe = await AI.findById(recipeId);

    if (!recipe) {
      // Handle the case where the recipe is not found
      return res.status(404).send("Recipe not found");
    }

    return res.render("ailabsedit", {
      user: req.user,
      currentPage: "ai",
      recipe: recipe, // Pass the recipe data to the view
    });
  } catch (error) {
    console.error("Error fetching recipe for edit:", error);
    return res.status(500).send("Internal Server Error");
  }
}

async function generateRecipe(req, res, next) {
  try {
    console.log("IN TRY");
    const videoPath = req.file.path; // assuming multer handled the upload
    const structuredRecipe = await aiProcessor(videoPath);
    // In your geminiAgent.js or wherever you process the Gemini API response
    const result = structuredRecipe.data;
    // console.log("Result of ai controller:", structuredRecipe);
    if (result === undefined || result.length === 0) {
      console.error(
        "No result text in response:",
        JSON.stringify(structuredRecipe.data)
      );
      throw new Error("No structured recipe returned by Gemini API");
    }

    // Extract JSON using bracket positions
    let parsedResult;
    try {
      const firstBracketIndex = result.indexOf("{");
      const lastBracketIndex = result.lastIndexOf("}\n```");
      // If we can't find the closing pattern, try just the closing bracket
      const endIndex =
        lastBracketIndex !== -1
          ? lastBracketIndex + 1
          : result.lastIndexOf("}") + 1;

      if (firstBracketIndex !== -1 && endIndex > firstBracketIndex) {
        const cleanData = result.slice(firstBracketIndex, endIndex);
        parsedResult = JSON.parse(cleanData);
        console.log("Result successfully parsed as JSON");
      } else {
        throw new Error("Could not locate valid JSON in the response");
      }
    } catch (parseErr) {
      console.warn("Result is not valid JSON:", parseErr.message);
      console.warn("Raw result was:", result);
      // Return the text result if parsing fails
      parsedResult = { error: "Failed to parse JSON", text: result };
    }

    // Send the parsed object back to the parent process
    // process.send({ success: true, data: parsedResult });
    const newAiresponse = {
      user: req.user._id,
      ai_response: {
        title: parsedResult.title,
        description: parsedResult.description,
        ingredients: parsedResult.ingredients,
        instructions: parsedResult.instructions,
        owner: req.user._id,
        preparationTime: parsedResult.preparationTime,
        cookingTime: parsedResult.cookingTime,
        likes: 0,
        comments: [],
        cuisine: parsedResult.cuisine,
        category: parsedResult.category,
        difficulty: parsedResult.difficulty,
        servings: parsedResult.servings,
        likedBy: [],
        video: req.file.path,
      },
    };

    const airesponse = await ai.create(newAiresponse);
    if (!airesponse) {
      return res.render("error", {
        error: "Failed to create AI response",
        description: "Could not create AI response",
      });
    }

    const newNotification = {
      read: false,
      from: req.user._id,
      message: "🧪AI labs created a recipe!",
      createdAt: Date.now(),
      reference: airesponse._id,
      type: "ai",
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          aipretexts: airesponse._id,
          notifications: newNotification,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.render("error", {
        error: "Failed to update user",
        description: "Could not update user with new AI response",
      });
    }

    req.user = updatedUser;
    console.log("User updated successfully");
    return res.redirect("/user/ailabs");
  } catch (err) {
    console.error("Recipe processing failed:", err);
    return res.render("error", {
      error: "Failed to process recipe video",
      description: err,
      status: 500,
    });
  }
}

async function updateGeneratedRecipe(req, res, next) {
  const recipeId = req.params.id;
  const updatedRecipeData = req.body;
  // console.log("UPDATEDATA: ", updatedRecipeData);
  const aiRecipe = await AI.findById(recipeId);
  if (!aiRecipe) {
    return res.status(404).send("Recipe not found");
  }
  console.log("AI RECIPE: ", aiRecipe);
  // Optionally delete the old image or video file
  if (req.file) {
    // Delete old image if new image uploaded
    if (req.file.mimetype.startsWith("image/") && aiRecipe.image) {
      if (aiRecipe.image.startsWith("/uploads/recipes/")) {
        // Local file
        const oldPath = path.join(__dirname, "../public", aiRecipe.image);
        fs.unlink(oldPath, (err) => {
          if (err) console.warn("Could not delete old image:", err);
        });
      } else if (aiRecipe.image.startsWith("http")) {
        // Cloudinary
        usercontroller.deleteCloudinaryMedia(aiRecipe.image);
      }
    }
    if (req.file.mimetype.startsWith("video/") && aiRecipe.video) {
      if (aiRecipe.video.startsWith("/uploads/videos/")) {
        // Local file
        const oldPath = path.join(__dirname, "../public", aiRecipe.video);
        fs.unlink(oldPath, (err) => {
          if (err) console.warn("Could not delete old video:", err);
        });
      } else if (aiRecipe.video.startsWith("http")) {
        // Cloudinary
        deleteCloudinaryMedia(aiRecipe.video);
      }
    }
  }
  req.body.image = req.file ? req.file.path : aiRecipe.image;
  req.body.video = req.file ? req.file.path : aiRecipe.video;
  AI.findByIdAndUpdate(
    recipeId,
    { ai_response: updatedRecipeData },
    { new: true }
  )
    .then((updatedRecipe) => {
      if (!updatedRecipe) {
        return res.status(404).send("Recipe not found");
      }
      // console.log(updatedRecipe);
      return res.redirect("/user/ailabs");
    })
    .catch((err) => {
      console.error("Error updating recipe:", err);
      return res
        .status(500)
        .send("Internal Server Error: could not update recipe");
    });
}

function deleteGeneratedRecipe(req, res, next) {
  const recipeId = req.params.id;
  AI.findByIdAndDelete(recipeId)
    .then((deletedRecipe) => {
      if (!deletedRecipe) {
        return res.status(404).send("Recipe not found");
      }
      return res.json({ success: true });
    })
    .catch((err) => {
      console.error(" Error deleting recipe:", err);
      return res
        .status(500)
        .send("Internal Server Error: could not delete recipe");
    });
}

function aiLabsPublish(req, res, next) {
  const recipeId = req.params.id;
  AI.findById(recipeId)
    .then(async (recipe) => {
      if (!recipe) {
        return res.status(404).send("Recipe not found");
      }
      console.log("Recipe found:", recipe);
      if (
        recipe.ai_response.image &&
        recipe.ai_response.image.startsWith("/")
      ) {
        console.log("LOCAL img");
        try {
          const result = await cloudinary.uploader.upload(
            recipe.ai_response.image,
            {
              folder: "blaze_spices/profile",
              resource_type: "image",
            }
          );
          recipe.ai_response.image = result.secure_url; // Assign but don't return
        } catch (err) {
          res.locals.error = "Failed to upload profile image";
          res.locals.description = err.message;
          return res.json({
            error: err,
            description: err.message,
            status: "fail",
          });
        }
      } else if (
        recipe.ai_response.video &&
        recipe.ai_response.video.startsWith("http")
      ) {
        try {
          const result = await cloudinary.uploader.upload(
            recipe.ai_response.video,
            {
              folder: "blaze_spices/profile",
              resource_type: "video",
            }
          );
          recipe.ai_response.video = result.secure_url; // Assign but don't return
        } catch (err) {
          res.locals.error = "Failed to upload profile video";
          res.locals.description = err.message;
          return res.json({
            error: err,
            description: err.message,
            status: "fail",
          });
        }
      }

      if (!recipe.ai_response.image && !recipe.ai_response.video) {
        recipe.ai_response.image = "/public/assets/place-holder.png";
      }

      const ingredients = recipe.ai_response.ingredients.map(
        (ingredient) => ingredient.item + " " + ingredient.quantity
      );
      console.log("INGREDIENTS: ", ingredients);
      Recipe.create({
        title: recipe.ai_response.title,
        description: recipe.ai_response.description,
        ingredients: ingredients ? ingredients : ["water"],
        steps: recipe.ai_response.steps ? recipe.ai_response.steps : ["cook"],
        owner: recipe.ai_response.owner
          ? recipe.ai_response.owner
          : req.user._id,
        preparationTime: recipe.ai_response.preparationTime
          ? recipe.ai_response.preparationTime
          : 1,
        cookingTime: recipe.ai_response.cookingTime
          ? recipe.ai_response.cookingTime
          : 1,
        likes: recipe.ai_response.likes ? recipe.ai_response.likes : 0,
        comments: recipe.ai_response.comments
          ? recipe.ai_response.comments
          : [],
        cuisine: recipe.ai_response.cuisine
          ? recipe.ai_response.cuisine
          : "Other",
        category: recipe.ai_response.category
          ? recipe.ai_response.category
          : "Other",
        difficulty: recipe.ai_response.difficulty
          ? recipe.ai_response.difficulty
          : "Easy",
        servings: recipe.ai_response.servings ? recipe.ai_response.servings : 1,
        likedBy: recipe.ai_response.likedBy ? recipe.ai_response.likedBy : [],
        video: recipe.ai_response.video,
        image: recipe.ai_response.image,
      })
        .then((createdRecipe) => {
          if (!createdRecipe) {
            return res.json({
              error: "Could not create recipe",
              // description: err.message,
              status: "fail",
            });
          }
          console.log("CREATED RECIPE: ", createdRecipe);
          return res.json({
            status: "ok",
          });
        })
        .catch((err) => {
          return res.json({
            error: err,
            description: err.message,
            status: "fail",
          });
        });
    })
    .catch((err) => {
      console.error("Error fetching recipe:", err);
      return res.json({
        error: err,
        description: err.message,
        status: "fail",
      });
    });
}

module.exports = {
  getAilab,
  getAiLabs,
  getAilabsVideoUpload,
  getAilabsEdit,
  generateRecipe,
  updateGeneratedRecipe,
  deleteGeneratedRecipe,
  aiLabsPublish,
};
