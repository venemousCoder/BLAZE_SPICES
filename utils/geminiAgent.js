const readline = require("readline");
const axios = require("axios");
const { Readable } = require("stream");
require("dotenv").config();

// Check if API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: Gemini API key is missing. Please check your .env file.");
  process.exit(1);
}

console.log("Gemini API key loaded:", apiKey ? "API key is set (not showing full key)" : "Not set");

process.on("message", async (data) => {
  console.log("GEMINI AGENT RECEIVED DATA:", data);

  console.log("STARTING GEMINI AGENT");
  console.log("READING LINES");

  // Get the transcript text from the data object
  const transcriptText = data.text || data.transcript;
  
  if (!transcriptText) {
    console.error("No transcript text provided");
    process.send({ success: false, error: "No transcript text provided" });
    return;
  }
  
  // Create a readable stream from the transcript text
  const transcriptStream = Readable.from([transcriptText]);

  const rl = readline.createInterface({
    input: transcriptStream,
    terminal: false,
  });

  console.log("READ LINE INTERFACE SUCCESSFULLY CREATED");

  let transcript = "";

  rl.on("line", (line) => (transcript += line + "\n"));

  rl.on("close", async () => {
    try {
      console.log("Transcript processed, length:", transcript.length);
      console.log("FINISHED READING LINES");
      console.log("INITIALIZING PROMPT");
      
      // For debugging purposes, let's check if the transcript is a GIMP tutorial
      if (transcript.includes("gimp") || transcript.includes("animation")) {
        console.log("WARNING: This appears to be a GIMP tutorial, not a cooking recipe");
        // We'll still try to process it, but it might not give good results
      }
      
      const prompt = `Extract and structure a cooking recipe from this transcript:
"""
${transcript}
"""
Return a JSON object with: title, description, difficulty, ingredients[], steps[]`;
      
      console.log("PROMPT INITIALIZED");
      console.log("STARTING GEMINI AGENT CALL...");
      
      // For debugging, let's log the API endpoint and key format
      console.log("API Endpoint:", `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.substring(0, 5)}...`);
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("GEMINI AGENT CALL COMPLETED");
      console.log("Response status:", response.status);
      
      // Log more details about the response structure
      console.log("Response structure:", JSON.stringify({
        hasData: !!response.data,
        hasCandidates: !!(response.data && response.data.candidates),
        candidatesLength: response.data && response.data.candidates ? response.data.candidates.length : 0
      }));
      
      const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!result) {
        console.error("No result text in response:", JSON.stringify(response.data));
        throw new Error("No structured recipe returned by Gemini API");
      }
      
      console.log("RESULT:", result);
      
      // Try to parse the result as JSON to verify it's valid
      try {
        const parsedResult = JSON.parse(result);
        console.log("Result successfully parsed as JSON");
      } catch (parseErr) {
        console.warn("Result is not valid JSON:", parseErr.message);
        // We'll still return the text result
      }
      
      // Send the result back to the parent process
      process.send({ success: true, data: result });
    } catch (err) {
      console.error("GEMINI AGENT ERROR:", err);
      
      // Log more details about the error
      if (err.response) {
        console.error("Error response data:", JSON.stringify(err.response.data));
        console.error("Error response status:", err.response.status);
        console.error("Error response headers:", JSON.stringify(err.response.headers));
      }
      
      process.send({ 
        success: false, 
        error: err.message,
        details: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : undefined
      });
    }
  });
});
