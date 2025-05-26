const axios = require("axios");
const dotenv = require("dotenv");
const { extractAudioStream } = require("./extractAudio");
dotenv.config();

// Add this at the top of transcriptAgent.js after dotenv.config()
console.log("Environment variables loaded:", {
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLY_API_KEY
    ? "Set (not showing full key)"
    : "Not set",
});

const baseUrl = "https://api.assemblyai.com";

// Make sure the API key is properly loaded from environment variables
const apiKey = process.env.ASSEMBLY_API_KEY;

// Check if API key is available
if (!apiKey) {
  console.error(
    "ERROR: AssemblyAI API key is missing. Please check your .env file."
  );
  process.exit(1);
}

const headers = {
  authorization: apiKey,
  "content-type": "application/octet-stream",
};

/**
 * Transcribes audio from a video file without saving the audio locally
 * @param {string} videoFilePath - Path to the video file
 * @returns {Promise<string>} - The transcribed text
 */
async function transcribeAudioFromFile(videoFilePath) {
  console.log("Starting transcription...");
  console.log("Video file path:", videoFilePath);
  try {
    console.log("Processing video file:", videoFilePath);
    console.log(
      "Using API key:",
      apiKey ? "API key is set" : "API key is missing"
    );

    // Extract audio as a stream
    const audioStream = await extractAudioStream(videoFilePath);
    console.log("Audio stream created successfully");

    // Create a buffer to hold the audio data
    let audioBuffer = Buffer.alloc(0);

    // Set up event handlers for the stream
    return new Promise((resolve, reject) => {
      audioStream.on("data", (chunk) => {
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
        console.log(
          `Received chunk: ${chunk.length} bytes, total: ${audioBuffer.length} bytes`
        );
      });

      audioStream.on("end", async () => {
        console.log(
          `Audio extraction complete, total size: ${audioBuffer.length} bytes`
        );

        try {
          // Upload audio directly to AssemblyAI
          console.log("Uploading to AssemblyAI...");
          console.log(
            "Headers:",
            JSON.stringify({
              authorization: apiKey
                ? "API key is set (not showing full key)"
                : "API key is missing",
              "content-type": headers["content-type"],
            })
          );

          const uploadResponse = await axios.post(
            `${baseUrl}/v2/upload`,
            audioBuffer,
            {
              headers,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
            }
          );

          const audioUrl = uploadResponse.data.upload_url;
          console.log("Upload successful, URL:", audioUrl);

          // Request transcription
          console.log("Requesting transcription...");
          const transcriptReq = await axios.post(
            `${baseUrl}/v2/transcript`,
            {
              audio_url: audioUrl,
              speech_model: "universal",
            },
            { headers: { authorization: apiKey } }
          );

          const transcriptId = transcriptReq.data.id;
          console.log("Transcription requested, ID:", transcriptId);

          const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;
          let attempts = 0;
          const maxAttempts = 20;

          // Poll for transcription completion
          const pollInterval = setInterval(async () => {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              reject(new Error("Polling timed out. Try again later."));
              return;
            }

            attempts++;
            console.log(`Polling attempt ${attempts}/${maxAttempts}...`);

            try {
              const pollingResponse = await axios.get(pollingEndpoint, {
                headers: { authorization: apiKey },
              });

              const result = pollingResponse.data;
              console.log("Polling status:", result.status);

              if (result.status === "completed") {
                clearInterval(pollInterval);
                console.log("Transcription completed!");
                resolve(result.text);
              } else if (result.status === "error") {
                clearInterval(pollInterval);
                reject(new Error(`Transcription failed: ${result.error}`));
              }
            } catch (err) {
              console.error("Polling error:", err);
              clearInterval(pollInterval);
              reject(err);
            }
          }, 3000);
        } catch (err) {
          console.error("Processing error:", err);
          reject(err);
        }
      });

      audioStream.on("error", (err) => {
        console.error("Stream error:", err);
        reject(err);
      });
    });
  } catch (err) {
    console.error("Transcription error:", err);
    throw err;
  }
}

process.on("message", (message) => {
  console.log("Received message:", message);

  // Extract the videoPath from the message object
  const videoPath = message.videoPath || message;

  transcribeAudioFromFile(videoPath)
    .then((text) => {
      console.log("Transcription completed:", text);
      // Send the transcription result back to the parent process
      process.send({ success: true, text });
    })
    .catch((err) => {
      console.error("Transcription failed:", err);
      process.send({ success: false, error: err.message });
    });
});
