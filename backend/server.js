const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map();

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
  
  // Mark this team as having an ongoing request
  ongoingRequests.set(team, { startTime: Date.now() });

  // Set a timeout to automatically clean up if the request takes too long
  const requestTimeout = setTimeout(() => {
    cleanupRequest(team, outputPath);
    
    if (!res.headersSent) {
      res.status(504).json({
        error: "Analysis timed out",
        message: "The analysis took too long to complete. Try again with a different team."
      });
    }
  }, 3 * 60 * 1000); // 3 minutes timeout

  try {
    console.log(`🔍 Searching YouTube for: ${searchQuery}`);
    // Don't try to access getYtdlBinary as it doesn't exist in your version

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
    
    // Run the Python script to analyze the video with the correct path
    const pythonProcess = execFile("python3", ["analyze_highlight.py", outputPath], { cwd: __dirname }, 
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
        
        // Clean up the downloaded video
        cleanupVideo(outputPath);
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
      }
    }, 2 * 60 * 1000); // 2 minutes
    
  } catch (err) {
    clearTimeout(requestTimeout);
    console.error("❌ Error downloading or analyzing video:", err);
    
    // Remove from ongoing requests tracking
    ongoingRequests.delete(team);
    
    // Clean up downloaded files
    cleanupVideo(outputPath);
    
    if (!res.headersSent) {
      // Try to send a more useful error message
      let errorMessage = "An unexpected error occurred.";
      if (err.message.includes("No videos found")) {
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

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    requests: Array.from(ongoingRequests.keys())
  });
});

function cleanupVideo(videoPath) {
  if (fs.existsSync(videoPath)) {
    fs.unlink(videoPath, (err) => {
      if (err) console.warn("⚠️ Could not delete video:", err);
      else console.log("🧹 Deleted video file:", videoPath);
    });
  }
}

function cleanupRequest(team, videoPath) {
  console.log(`🧹 Cleaning up request for team: ${team}`);
  
  // Remove from ongoing requests tracking
  ongoingRequests.delete(team);
  
  // Delete video file if it exists
  cleanupVideo(videoPath);
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

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:5000`);
  console.log(`🔐 Make sure PERPLEXITY_API_KEY is set in your .env file`);
});