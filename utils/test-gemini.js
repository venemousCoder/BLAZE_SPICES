const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

async function listAvailableModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Listing available models...");
    
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    
    console.log("Available models:");
    response.data.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
    
    return response.data.models;
  } catch (err) {
    console.error("Error listing models:", err.message);
    if (err.response) {
      console.error("Error details:", JSON.stringify(err.response.data, null, 2));
    }
    return [];
  }
}

async function runTest() {
  try {
    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERROR: Gemini API key is missing. Please check your .env file.");
      process.exit(1);
    }
    
    console.log(`Starting Gemini API test with key: ${apiKey.substring(0, 5)}...`);
    
    // List available models first
    const models = await listAvailableModels();
    
    // Sample transcript text (a simple cooking recipe for testing)
    const sampleTranscript = `
    Hello everyone! Today I'm going to show you how to make a simple pasta dish.
    You'll need: 200g of spaghetti, 2 cloves of garlic, 3 tablespoons of olive oil,
    salt, pepper, and some fresh basil.
    
    First, boil water in a large pot and add salt.
    Second, add the pasta and cook for about 8-10 minutes until al dente.
    Meanwhile, heat the olive oil in a pan and add minced garlic.
    Drain the pasta and add it to the pan, toss well.
    Season with salt and pepper, and garnish with fresh basil.
    Enjoy your simple but delicious pasta!
    `;
    
    // Create a child process for the Gemini agent
    const geminiProcess = fork(path.join(__dirname, 'geminiAgent.js'), {
      env: { ...process.env, GEMINI_API_KEY: apiKey }
    });
    
    // Create a promise to handle the response
    const geminiPromise = new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        geminiProcess.kill();
        reject(new Error('Gemini process timed out after 30 seconds'));
      }, 30000);
      
      geminiProcess.on('message', (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
      
      geminiProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      
      geminiProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Gemini process exited with code ${code}`));
        }
      });
    });
    
    // Send the sample transcript to the Gemini agent
    geminiProcess.send({ transcript: sampleTranscript });
    
    // Wait for the response
    const result = await geminiPromise;
    
    console.log('Test completed!');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('Structured recipe:');
      console.log(result.data);
      
      // Save the result to a file for inspection
      fs.writeFileSync('./gemini_test_output.json', result.data);
      console.log('Result saved to gemini_test_output.json');
    } else {
      console.error('Error:', result.error);
      if (result.details) {
        console.error('Error details:', JSON.stringify(result.details, null, 2));
      }
    }
  } catch (err) {
    console.error(`Test failed: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

runTest();
