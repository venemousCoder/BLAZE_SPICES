const { extractAudio } = require('./extractAudio');
const path = require('path');
const os = require('os');

async function runTest() {
  try {
    const videoUrl = "https://res.cloudinary.com/dn70yqn7a/video/upload/v1747838495/blaze_spices/recipes/videos/ellpvgfvkzfdk2jwj5zm.mp4";
    const outputPath = "./test_output.wav";
    // path.join(os.tmpdir(), `test_output_${Date.now()}.wav`);
    
    console.log(`Starting test with video: ${videoUrl}`);
    console.log(`Output will be saved to: ${outputPath}`);
    
    const result = await extractAudio(videoUrl, outputPath);
    console.log(`Test completed successfully! Audio saved to: ${result}`);
  } catch (err) {
    console.error(`Test failed: ${err}`);
  }
}

runTest();