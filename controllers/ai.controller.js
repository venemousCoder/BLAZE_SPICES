const aiProcessor = require("../utils/aiProcessor");

function getAiLabs(req, res, next) {
  return res.render("ai", {
    user: req.user,
    currentPage: "ai",
  });
}

function getAilabsVideoUpload(req, res, next) {
  return res.render("ailabsvideoupload", {
    user: req.user,
    currentPage: "ai",
  });
}

async function generateRecipe(req, res, next) {
  try {
    console.log("IN TRY");
    const videoPath = req.file.path; // assuming multer handled the upload
    const structuredRecipe = await processRecipeVideo(videoPath);
    console.table(structuredRecipe);
    res.json(structuredRecipe);
  } catch (err) {
    console.error("Recipe processing failed:", err);
    res.status(500).json({ error: "Failed to process recipe video" });
  }
}

module.exports = {
  getAiLabs,
  getAilabsVideoUpload,
  generateRecipe,
};
