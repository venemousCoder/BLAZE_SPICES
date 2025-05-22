const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set the path to the FFmpeg executable
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Downloads a file from a URL to a local temporary file
 * @param {string} url - The URL to download
 * @returns {Promise<string>} - Path to the downloaded file
 */
async function downloadFile(url) {
  const tempDir = "./utils"
  // path.join(os.tmpdir(), 'blaze_spices');
  
  // Create temp directory if it doesn't exist
  // if (!fs.existsSync(tempDir)) {
  //   fs.mkdirSync(tempDir, { recursive: true });
  // }
  
  const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);
  
  console.log(`Downloading ${url} to ${tempFilePath}...`);
  
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });
  
  const writer = fs.createWriteStream(tempFilePath);
  
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    
    writer.on('finish', () => {
      console.log(`Download complete: ${tempFilePath}`);
      resolve(tempFilePath);
    });
    
    writer.on('error', (err) => {
      console.error(`Download error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Extracts audio from a video file and saves it to the specified output path
 * @param {string} videoPath - Path or URL of the video file
 * @param {string} outputPath - Path where the audio file will be saved
 * @returns {Promise<string>} - Path to the extracted audio file
 */
async function extractAudio(videoPath, outputPath) {
  let localVideoPath = videoPath;
  let needsCleanup = false;
  
  try {
    // If videoPath is a URL, download it first
    if (videoPath.startsWith('http')) {
      localVideoPath = await downloadFile(videoPath);
      needsCleanup = true;
    }
    
    return new Promise((resolve, reject) => {
      ffmpeg(localVideoPath)
        .noVideo()
        .audioCodec("pcm_s16le") // good for .wav
        .format("wav")
        .outputOptions([
          '-ac 2',           // Set to stereo
          '-ar 44100',       // Set sample rate to 44.1kHz
          '-loglevel info'   // Increase logging level
        ])
        .on("start", (commandLine) => {
          console.log("FFmpeg process started:", commandLine);
        })
        .on("stderr", (stderrLine) => {
          console.log("FFmpeg stderr:", stderrLine);
        })
        .on("end", (data) => {
          console.log("Audio extraction completed:", data);
          resolve(outputPath);
        })
        .on("error", (err, stdout, stderr) => {
          console.error("FFmpeg error:", err.message);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .save(outputPath);
    });
  } catch (err) {
    // Clean up the downloaded file if needed
    console.err("ErrorCaught:", err);
  }
  //  finally {
  //   // Clean up the downloaded file if needed
  //   if (needsCleanup && fs.existsSync(localVideoPath)) {
  //     try {
  //       fs.unlinkSync(localVideoPath);
  //       console.log(`Temporary file deleted: ${localVideoPath}`);
  //     } catch (err) {
  //       console.warn(`Failed to delete temporary file: ${err.message}`);
  //     }
  //   }
  // }
}

/**
 * Extracts audio from a video file and returns it as a stream
 * @param {string} videoPath - Path or URL of the video file
 * @returns {Promise<stream.Readable>} - A readable stream of the extracted audio
 */
async function extractAudioStream(videoPath) {
  let localVideoPath = videoPath;
  let needsCleanup = false;
  
  try {
    // If videoPath is a URL, download it first
    if (videoPath.startsWith('http')) {
      localVideoPath = await downloadFile(videoPath);
      needsCleanup = true;
    }
    
    return new Promise((resolve, reject) => {
      const audioStream = new PassThrough();
      
      const command = ffmpeg(localVideoPath)
        .noVideo()
        .audioCodec('pcm_s16le')
        .format('wav')
        .outputOptions([
          '-ac 2',           // Set to stereo
          '-ar 44100',       // Set sample rate to 44.1kHz
          '-loglevel info'   // Increase logging level
        ])
        .on("start", (commandLine) => {
          console.log("FFmpeg stream process started:", commandLine);
        })
        .on("stderr", (stderrLine) => {
          console.log("FFmpeg stream stderr:", stderrLine);
        })
        .on('error', (err, stdout, stderr) => {
          console.error("FFmpeg stream error:", err.message);
          console.error("FFmpeg stream stderr:", stderr);
          
          // Clean up the downloaded file if needed
          if (needsCleanup && fs.existsSync(localVideoPath)) {
            try {
              fs.unlinkSync(localVideoPath);
              console.log(`Temporary file deleted: ${localVideoPath}`);
            } catch (cleanupErr) {
              console.warn(`Failed to delete temporary file: ${cleanupErr.message}`);
            }
          }
          
          reject(err);
        })
        .on('end', () => {
          console.log("FFmpeg stream processing completed");
          
          // Clean up the downloaded file if needed
          if (needsCleanup && fs.existsSync(localVideoPath)) {
            try {
              fs.unlinkSync(localVideoPath);
              console.log(`Temporary file deleted: ${localVideoPath}`);
            } catch (cleanupErr) {
              console.warn(`Failed to delete temporary file: ${cleanupErr.message}`);
            }
          }
        });
      
      // Pipe to stream
      command.pipe(audioStream);
      
      // Give ffmpeg a moment to start processing
      setTimeout(() => resolve(audioStream), 500);
    });
  } catch (err) {
    // Clean up the downloaded file if needed
    if (needsCleanup && fs.existsSync(localVideoPath)) {
      try {
        fs.unlinkSync(localVideoPath);
        console.log(`Temporary file deleted: ${localVideoPath}`);
      } catch (cleanupErr) {
        console.warn(`Failed to delete temporary file: ${cleanupErr.message}`);
      }
    }
    
    throw err;
  }
}

// Test function for direct execution
async function test() {
  try {
    const videoUrl = "https://res.cloudinary.com/dn70yqn7a/video/upload/v1747838495/blaze_spices/recipes/videos/ellpvgfvkzfdk2jwj5zm.mp4";
    const outputPath = path.join(os.tmpdir(), 'blaze_spices', `output_${Date.now()}.wav`);
    
    console.log(`Testing audio extraction from ${videoUrl} to ${outputPath}`);
    
    const result = await extractAudio(videoUrl, outputPath);
    console.log(`Test successful! Audio saved to: ${result}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`Output file size: ${stats.size} bytes`);
    
    // Clean up
    fs.unlinkSync(outputPath);
    console.log(`Test file deleted: ${outputPath}`);
  } catch (err) {
    console.error(`Test failed: ${err.message}`);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  test();
}

module.exports = { extractAudio, extractAudioStream };
