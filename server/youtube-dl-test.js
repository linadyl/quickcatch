const youtubedl = require("youtube-dl-exec");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("YouTube-DL Diagnostic Tool");
console.log("=========================");

// Check if getYtdlBinary exists
let binary = "";
if (typeof youtubedl.getYtdlBinary === 'function') {
  binary = youtubedl.getYtdlBinary();
  console.log(`YouTube-DL Binary (from API): ${binary}`);
} else {
  // Try to find the binary in the common locations
  console.log("getYtdlBinary function not available in your youtube-dl-exec version");
  
  // Common locations for the binary
  const possibleLocations = [
    path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'youtube-dl'),
    path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp'),
    path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin', 'youtube-dl'),
    path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp')
  ];
  
  for (const loc of possibleLocations) {
    if (fs.existsSync(loc)) {
      binary = loc;
      console.log(`Found binary at: ${binary}`);
      break;
    }
  }
  
  if (!binary) {
    binary = 'yt-dlp'; // Default to system-installed yt-dlp
    console.log(`Using system binary: ${binary}`);
  }
}

// Check if the binary exists
if (fs.existsSync(binary)) {
  console.log(`✅ Binary file exists`);
} else {
  console.log(`❌ Binary file not found at ${binary}`);
}

// Check version
exec(`${binary} --version`, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error getting version: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`❌ stderr: ${stderr}`);
    return;
  }
  console.log(`✅ Version: ${stdout.trim()}`);
  
  // Check if we're using youtube-dl or yt-dlp
  const isYtDlp = stdout.trim().startsWith("2023") || 
                 stdout.trim().startsWith("2024") || 
                 binary.includes("yt-dlp");
  
  console.log(`Detected: ${isYtDlp ? "yt-dlp" : "youtube-dl"}`);
  
  // Test a basic download command
  console.log("\nTesting basic functionality...");
  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  
  // Build command based on detected tool
  let testOpts = {
    dumpJson: true,
    noPlaylist: true,
    noWarnings: true,
    skipDownload: true // Don't actually download the video
  };
  
  console.log(`Running test with ${Object.keys(testOpts).join(", ")}...`);
  
  youtubedl(testUrl, testOpts)
    .then(output => {
      console.log("✅ Basic functionality test successful!");
      console.log(`Video title: ${JSON.parse(output).title}`);
      
      // List supported options
      console.log("\nRecommended options for your config:");
      if (isYtDlp) {
        console.log(`
// For yt-dlp:
await youtubedl(videoUrl, {
  output: outputPath,
  format: 'best[ext=mp4]/best',
  noPlaylist: true,
  maxFilesize: "50m",
  retries: 3
});`);
      } else {
        console.log(`
// For youtube-dl:
await youtubedl(videoUrl, {
  output: outputPath,
  format: 'best[ext=mp4]/best',
  noPlaylist: true,
  maxFilesize: "50m",
  retries: 3
});`);
      }
    })
    .catch(err => {
      console.error("❌ Basic functionality test failed:");
      console.error(err);
    });
});