const aiProcessor = require("../utils/aiProcessor");

function getAilab(req, res, next) {
  return res.render("ailab", {
    user: req.user,
    currentPage: "ai",
  });
}

function getAiLabs(req, res, next) {
  return res.render("ailabs", {
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

function getAilabsEdit(req, res, next) {
  return res.render("ailabsedit", {
    user: req.user,
    currentPage: "ai",
  });
}

async function generateRecipe(req, res, next) {
  try {
    console.log("IN TRY");
    const videoPath = req.file.path; // assuming multer handled the upload
    const structuredRecipe = await aiProcessor(videoPath);
    // In your geminiAgent.js or wherever you process the Gemini API response
    const result =
      structuredRecipe.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      console.error(
        "No result text in response:",
        JSON.stringify(response.data)
      );
      throw new Error("No structured recipe returned by Gemini API");
    }

    // Clean the result by removing Markdown formatting
    let cleanedResult = result;

    // Remove Markdown code block formatting if present
    if (result.startsWith("```") && result.endsWith("```")) {
      // Extract content between the backticks
      cleanedResult = result
        .substring(result.indexOf("\n") + 1, result.lastIndexOf("```"))
        .trim();
    } else if (result.includes("```json")) {
      // Handle case where it's in the middle of text
      const startIndex = result.indexOf("```json") + 7;
      const endIndex = result.indexOf("```", startIndex);
      if (endIndex !== -1) {
        cleanedResult = result.substring(startIndex, endIndex).trim();
      }
    }

    // Parse the cleaned JSON string into a JavaScript object
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedResult);
      console.log("Result successfully parsed as JSON");
    } catch (parseErr) {
      console.warn("Result is not valid JSON:", parseErr.message);
      console.warn("Cleaned result was:", cleanedResult);
      // Return the cleaned text result if parsing fails
      parsedResult = { error: "Failed to parse JSON", text: cleanedResult };
    }

    // Send the parsed object back to the parent process
    process.send({ success: true, data: parsedResult });
  } catch (err) {
    console.error("Recipe processing failed:", err);
    res.status(500).json({ error: "Failed to process recipe video" });
  }
}

module.exports = {
  getAilab,
  getAiLabs,
  getAilabsVideoUpload,
  getAilabsEdit,
  generateRecipe,
};
