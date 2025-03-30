const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Improved error handling and startup logging
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variable check
console.log('🔐 Environment check:');
console.log(`PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`PERPLEXITY_API_KEY: ${process.env.PERPLEXITY_API_KEY ? '✅ Set' : '❌ Not Set'}`);

// Check external dependencies
console.log('\n📋 Checking external dependencies...');

// Check if ffmpeg is available
try {
  const ffmpegCheck = spawnSync('ffmpeg', ['-version']);
  if (ffmpegCheck.error) {
    console.error('❌ ffmpeg not found:', ffmpegCheck.error.message);
  } else {
    const version = ffmpegCheck.stdout.toString().split('\n')[0];
    console.log(`✅ ffmpeg detected: ${version}`);
  }
} catch (err) {
  console.error('❌ Error checking ffmpeg:', err.message);
}

// Check if python is available
try {
  const pythonCheck = spawnSync('python3', ['--version']);
  if (pythonCheck.error) {
    console.error('❌ Python3 not found:', pythonCheck.error.message);
  } else {
    const version = pythonCheck.stdout.toString().trim();
    console.log(`✅ Python detected: ${version}`);
  }
} catch (err) {
  console.error('❌ Error checking Python:', err.message);
}

// Check if youtube-dl binary is accessible
try {
  let binary = '';
  if (typeof youtubedl.getYtdlBinary === 'function') {
    binary = youtubedl.getYtdlBinary();
    console.log(`✅ YouTube-DL binary detected: ${binary}`);
  } else {
    console.log('⚠️ getYtdlBinary function not available, attempting fallback check');
    // Try to verify the binary using a simple version check
    const ytdlCheck = youtubedl('--version', {});
    ytdlCheck.then((output) => {
      console.log(`✅ YouTube-DL working: version ${output.trim()}`);
    }).catch((err) => {
      console.error('❌ YouTube-DL check failed:', err.message);
    });
  }
} catch (err) {
  console.error('❌ Error checking YouTube-DL:', err.message);
}

// Check if analyze_highlight.py exists
try {
  const scriptPath = path.join(__dirname, 'analyze_highlight.py');
  if (fs.existsSync(scriptPath)) {
    console.log(`✅ analyze_highlight.py found at: ${scriptPath}`);
  } else {
    console.error(`❌ analyze_highlight.py not found at: ${scriptPath}`);
  }
} catch (err) {
  console.error('❌ Error checking analyze_highlight.py:', err.message);
}

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map();

// Simplified health check endpoint that doesn't depend on other components
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: Array.from(ongoingRequests.keys())
  });
});

app.get("/api/analyze", async (req, res) => {
  const team = req.query.team;

  if (!team) {
    return res.status(400).json({ error: "Missing team name" });
  }

  // Check if there's already an analysis in progress for this team
  if (ongoingRequests.has(team)) {
    return res.status(429).json({ 
      error: "Analysis for this team is already in progress",
      message: "Please wait for the current analysis to complete or try a different team."
    });
  }

  // The search query for YouTube - IMPORTANT: prefix with "ytsearch:" for search
  const searchQuery = `ytsearch:${team} NHL highlights 2024`;
  const outputPath = path.resolve(__dirname, `highlight_${Date.now()}.mp4`);
  const videoInfoPath = path.resolve(__dirname, `video_info_${Date.now()}.json`);
  
  // Mark this team as having an ongoing request
  ongoingRequests.set(team, { startTime: Date.now() });

  // Set a timeout to automatically clean up if the request takes too long
  const requestTimeout = setTimeout(() => {
    cleanupRequest(team, outputPath, videoInfoPath);
    
    if (!res.headersSent) {
      res.status(504).json({
        error: "Analysis timed out",
        message: "The analysis took too long to complete. Try again with a different team."
      });
    }
  }, 3 * 60 * 1000); // 3 minutes timeout

  try {
    console.log(`🔍 Searching YouTube for: ${searchQuery}`);

    // Step 1: First, get the search results using youtube-dl's search feature
    // This will return info about the top video for our search query
    const searchResults = await youtubedl(searchQuery, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
    });

    // Check if we got a valid search result
    if (!searchResults || !searchResults.entries || searchResults.entries.length === 0) {
      throw new Error("No videos found for this team");
    }

    // Get the first video from the search results
    const firstVideo = searchResults.entries[0];
    const videoId = firstVideo.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    console.log(`🎥 Found video: ${videoUrl}`);
    console.log(`📊 Video title: ${firstVideo.title}`);
    
    // Save video metadata to pass to Python script
    const videoInfo = {
      title: firstVideo.title || "",
      description: firstVideo.description || "",
      upload_date: firstVideo.upload_date || "",
      uploader: firstVideo.uploader || "",
      duration: firstVideo.duration || 0,
      view_count: firstVideo.view_count || 0,
      team_query: team // Pass the original team query
    };
    
    // Write video info to a file for the Python script
    fs.writeFileSync(videoInfoPath, JSON.stringify(videoInfo, null, 2));
    console.log(`✅ Saved video metadata to ${videoInfoPath}`);
    
    // Send an initial response with just the video URL so the user can start watching
    if (!res.headersSent) {
      res.json({
        summary: `Loading analysis for ${team}...`,
        teamPerformance: "Team analysis loading...",
        playerPerformance: "Player analysis loading...",
        videoUrl: embedUrl,
        analysisStatus: "pending"
      });
    }
    
    // Now download and analyze the video in the background
    console.log("📥 Downloading video...");

    // Step 2: Download the specific video we found
    await youtubedl(videoUrl, {
      output: outputPath,
      format: 'best[ext=mp4]/best',
      noPlaylist: true,
      maxFilesize: "50m",
      retries: 3          // Retry download up to 3 times
    });
    
    // Check if the file exists or if it's still a .part file
    const partFilePath = `${outputPath}.part`;
    let finalVideoPath = outputPath;
    
    if (fs.existsSync(partFilePath) && !fs.existsSync(outputPath)) {
      console.log("⚠️ Found .part file instead of complete download");
      finalVideoPath = partFilePath;
    }
    
    if (!fs.existsSync(finalVideoPath)) {
      throw new Error(`Video file not found at ${finalVideoPath}`);
    }
    
    console.log("✅ Video downloaded successfully");
    console.log("🧠 Running AI analysis with Perplexity...");
    
    // Run the Python script to analyze the video with the correct path and video info
    const pythonProcess = execFile("python3", ["analyze_highlight.py", finalVideoPath, videoInfoPath], { cwd: __dirname }, 
      (error, stdout, stderr) => {
        clearTimeout(requestTimeout);
        
        if (error) {
          console.error("❌ Python error:", error);
          console.error("stderr:", stderr);
          
          // Store a generic result on error
          ongoingRequests.set(team, {
            startTime: Date.now(),
            result: {
              summary: `Highlights for ${team}. We couldn't analyze this video in detail.`,
              teamPerformance: `${team} has had a mix of performances this season.`,
              playerPerformance: "Watch the video to see player highlights.",
              videoUrl: embedUrl,
              analysisStatus: "complete"
            }
          });
        } else {
          try {
            console.log("✅ Analysis complete!");
            const result = JSON.parse(stdout);
            
            // Store the analysis result for future requests
            ongoingRequests.set(team, {
              startTime: Date.now(),
              result: {
                summary: result.summary,
                teamPerformance: result.teamPerformance,
                playerPerformance: result.playerPerformance,
                videoUrl: embedUrl,
                analysisStatus: "complete"
              }
            });
            
            console.log(`✅ Analysis cached for ${team}`);
          } catch (parseErr) {
            console.error("❌ Failed to parse Python output:", parseErr);
            console.error("stdout:", stdout);
            
            // Store a generic result on parse error
            ongoingRequests.set(team, {
              startTime: Date.now(),
              result: {
                summary: `Highlights for ${team}. Analysis completed but results were not properly formatted.`,
                teamPerformance: `${team}'s recent games have shown their strengths and weaknesses.`,
                playerPerformance: "Several key players contributed to recent games.",
                videoUrl: embedUrl,
                analysisStatus: "complete"
              }
            });
          }
        }
        
        // Clean up the downloaded video and info file
        cleanupVideo(outputPath);
        cleanupInfoFile(videoInfoPath);
      }
    );
    
    // Set a separate timeout for the Python process
    setTimeout(() => {
      if (pythonProcess && !pythonProcess.killed) {
        console.log("⏱️ Python process taking too long, killing it");
        pythonProcess.kill();
        
        // Store a timeout result
        ongoingRequests.set(team, {
          startTime: Date.now(),
          result: {
            summary: `Highlights for ${team}. Analysis took too long to complete.`,
            teamPerformance: `${team} has been active in the NHL this season.`,
            playerPerformance: "Watch the video to see player highlights.",
            videoUrl: embedUrl,
            analysisStatus: "complete"
          }
        });
        
        // Clean up
        cleanupVideo(outputPath);
        cleanupInfoFile(videoInfoPath);
      }
    }, 2 * 60 * 1000); // 2 minutes
    
  } catch (err) {
    clearTimeout(requestTimeout);
    console.error("❌ Error downloading or analyzing video:", err);
    
    // Remove from ongoing requests tracking
    ongoingRequests.delete(team);
    
    // Clean up downloaded files
    cleanupVideo(outputPath);
    cleanupInfoFile(videoInfoPath);
    
    if (!res.headersSent) {
      // Try to send a more useful error message
      let errorMessage = "An unexpected error occurred.";
      if (err.message && err.message.includes("No videos found")) {
        errorMessage = `No highlight videos found for ${team}.`;
      } else if (err.stderr && err.stderr.includes("ERROR:")) {
        // Extract the actual error from youtube-dl's output
        const errorMatch = err.stderr.match(/ERROR:\s*(.*)/);
        if (errorMatch && errorMatch[1]) {
          errorMessage = errorMatch[1];
        }
      }
      
      res.status(500).json({ 
        error: "Video download or analysis failed.",
        message: errorMessage,
        details: err.message
      });
    }
  }
});

// Endpoint to check if analysis is complete
app.get("/api/analysis-status", (req, res) => {
  const team = req.query.team;
  
  if (!team) {
    return res.status(400).json({ error: "Missing team name" });
  }
  
  if (ongoingRequests.has(team)) {
    const request = ongoingRequests.get(team);
    
    // If we have a result, the analysis is complete
    if (request.result) {
      return res.json({
        ready: true,
        data: request.result
      });
    }
  }
  
  // Not ready yet
  res.json({
    ready: false
  });
});

function cleanupVideo(videoPath) {
  if (fs.existsSync(videoPath)) {
    fs.unlink(videoPath, (err) => {
      if (err) console.warn("⚠️ Could not delete video:", err);
      else console.log("🧹 Deleted video file:", videoPath);
    });
  }
  
  // Also try to remove .part file if it exists
  const partPath = `${videoPath}.part`;
  if (fs.existsSync(partPath)) {
    fs.unlink(partPath, (err) => {
      if (err) console.warn("⚠️ Could not delete .part file:", err);
      else console.log("🧹 Deleted .part file:", partPath);
    });
  }
}

function cleanupInfoFile(infoPath) {
  if (fs.existsSync(infoPath)) {
    fs.unlink(infoPath, (err) => {
      if (err) console.warn("⚠️ Could not delete info file:", err);
      else console.log("🧹 Deleted info file:", infoPath);
    });
  }
}

function cleanupRequest(team, videoPath, infoPath) {
  console.log(`🧹 Cleaning up request for team: ${team}`);
  
  // Remove from ongoing requests tracking
  ongoingRequests.delete(team);
  
  // Delete files if they exist
  cleanupVideo(videoPath);
  cleanupInfoFile(infoPath);
}

// Clean up cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [team, data] of ongoingRequests.entries()) {
    // Remove entries older than 1 hour
    if (now - data.startTime > 3600000) {
      console.log(`🧹 Removing stale cache for ${team}`);
      ongoingRequests.delete(team);
    }
  }
}, 15 * 60 * 1000); // Check every 15 minutes

// Create a basic HTML status page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NHL Highlights API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #0056b3; }
        .status { padding: 15px; background-color: #f0f8ff; border-radius: 5px; margin: 10px 0; }
        code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>NHL Highlights Analysis API</h1>
      <div class="status">
        <p>✅ Server is running</p>
        <p>🕒 Uptime: ${(process.uptime() / 60).toFixed(2)} minutes</p>
        <p>🔄 Active analyses: ${ongoingRequests.size}</p>
      </div>
      <h2>API Endpoints:</h2>
      <ul>
        <li><code>GET /api/status</code> - Check server status</li>
        <li><code>GET /api/analyze?team=TEAM_NAME</code> - Request team highlight analysis</li>
        <li><code>GET /api/analysis-status?team=TEAM_NAME</code> - Check analysis status</li>
      </ul>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔐 Make sure PERPLEXITY_API_KEY is set in your .env file`);
});