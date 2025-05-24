// File: utils/aiProcessor.js
const { fork } = require("child_process");
const path = require("path");

function processRecipeVideo(videoPath) {
  return new Promise((resolve, reject) => {
    // console.log("Environment variables loaded FOR AI PROCESSOR:", {
    //   ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY
    //     ? "Set (not showing full key)"
    //     : "Not set",
    //   GEMINI_API_KEY: process.env.GEMINI_API_KEY
    //     ? "Set (not showing full key)"
    //     : "Not set",
    // });

    // Create a copy of the current process.env and add/override specific variables
    const env = {
      ...process.env,
      ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
    };

    console.log("Forking transcriptAgent.js");

    const transcription = fork(path.join(__dirname, "transcriptAgent.js"), {
      env: env,
    });

    transcription.send({ videoPath });

    transcription.on("message", (response) => {
      if (response.success === false) {
        console.error(
          "Transcription failed:",
          response.error,
          response.error.message
        );
        return reject(new Error(response.error));
      }

      const transcript = response.text || response;
      console.log("Transcription completed successfully");

      // Verify Gemini API key is available
      if (!process.env.GEMINI_API_KEY) {
        console.error("Gemini API key is missing");
        return reject(new Error("Gemini API key is missing"));
      }

      console.log("Forking geminiAgent.js");

      const parser = fork(path.join(__dirname, "geminiAgent.js"), {
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        },
      });

      parser.send({ transcript });

      parser.on("message", (parsedData) => {
        if (parsedData.success === false) {
          console.error("Gemini processing failed:", parsedData.error);
          return reject(new Error(parsedData.error));
        }
        resolve(parsedData);
      });

      parser.on("error", (err) => {
        console.error("Gemini process error:", err);
        reject(err);
      });

      parser.on("exit", (code) => {
        if (code !== 0) {
          console.warn(`[geminiAgent] exited with code ${code}`);
          reject(new Error(`Gemini process exited with code ${code}`));
        }
      });
    });

    transcription.on("exit", (code) => {
      if (code !== 0) {
        console.warn(`[transcribeAgent] exited with code ${code}`);
        reject(new Error(`Transcription process exited with code ${code}`));
      }
    });

    transcription.on("error", (err) => {
      console.error("Transcription process error:", err);
      reject(err);
    });
  });
}

module.exports = processRecipeVideo;
