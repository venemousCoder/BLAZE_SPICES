// File: utils/aiProcessor.js
// This utility will handle the IPC logic to run transcription + GPT pipeline using child_process

const { fork } = require('child_process');
const path = require('path');

function processRecipeVideo(videoPath, callback) {
  // Fork the transcription process
  const transcription = fork(path.join(__dirname, 'transcribeAgent.js'));

  transcription.send({ videoPath });

  transcription.on('message', (transcript) => {
    // Transcript received, now fork GPT process
    const parser = fork(path.join(__dirname, 'gptAgent.js'));
    parser.send({ transcript });

    parser.on('message', (parsedData) => {
      callback(null, parsedData); // All done!
    });

    parser.on('error', (err) => callback(err));
  });

  transcription.on('error', (err) => callback(err));
}

module.exports = processRecipeVideo;
