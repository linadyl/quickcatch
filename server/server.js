const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");
const { execFile } = require("child_process"); 
const fs = require("fs");
const path = require("path");
const emailService = require("./emailService"); // Import our email service
const { getTeamAnalysis } = require("../team-analysis"); // Import our dummy data

// Check if we're in production mode (using dummy data)
const USE_DUMMY_DATA = process.env.USE_DUMMY_DATA === 'true';
console.log(`🔧 Running in ${USE_DUMMY_DATA ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map();

// Register email service routes
app.use("/api/email", emailService);

// Hardcoded fallback video IDs for each team in case of YouTube search failure
const fallbackVideos = {
  // Metropolitan Division
  "Carolina Hurricanes": "9AJUQjMiFu0",
  "Columbus Blue Jackets": "9y0-zrzhYN0",
  "New Jersey Devils": "DlV5JGnP2Jk",
  "New York Islanders": "C-iRKnfBPZU",
  "New York Rangers": "KQXbzBF9v0E",
  "Philadelphia Flyers": "xSjSHr9YuT0",
  "Pittsburgh Penguins": "uqgGdQ_5Rxg",
  "Washington Capitals": "h5Y3sor9Eec",
  
  // Atlantic Division
  "Boston Bruins": "3gASn77gj8A",
  "Buffalo Sabres": "5uJdE0G5LGg",
  "Detroit Red Wings": "5WoFQFKfQIY",
  "Florida Panthers": "PJvZgK1pBvk",
  "Montreal Canadiens": "c9HOGpZK_9o",
  "Ottawa Senators": "RHqBkxrY3q4",
  "Tampa Bay Lightning": "j5sTX74Yumw",
  "Toronto Maple Leafs": "w8w9NgCK7cI",
  
  // Central Division
  "Chicago Blackhawks": "mXCsp_2dqQk",
  "Colorado Avalanche": "Z0-xtTwKLNc",
  "Dallas Stars": "z6qBmAdSt8k",
  "Minnesota Wild": "1Oy36g-mIwg",
  "Nashville Predators": "3Fy_XiJLXZ0",
  "St. Louis Blues": "8iHfvpJ7TGc",
  "Utah Hockey Club": "PYKlUMrR6aw", // New team - generic hockey highlight
  "Winnipeg Jets": "qnZdRwwAn7I",
  
  // Pacific Division
  "Anaheim Ducks": "eU-6JD0rZ5g",
  "Calgary Flames": "oexQXVuHG08",
  "Edmonton Oilers": "yZzDNMkWi4o",
  "Los Angeles Kings": "bVwWsKSojHE",
  "San Jose Sharks": "JlOx9abbYjU",
  "Seattle Kraken": "vRUQ-HPZgV0",
  "Vancouver Canucks": "q-D99_uMc60",
  "Vegas Golden Knights": "vYD8ZQoGf-w",
  
  // Generic fallback for any other team
  "default": "fTjJ1IpCfCM" // Generic NHL highlights
};

// Helper to check if Python is available (async)
async function isPythonAvailable() {
  return new Promise(resolve => {
    const pythonProcess = execFile("python3", ["--version"], error => {
      if (error) {
        console.log("⚠️ Python3 not available, using fallback mechanisms");
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    // Set a short timeout in case process hangs
    setTimeout(() => {
      pythonProcess.kill();
      resolve(false);
    }, 2000);
  });
}

// Get a YouTube video ID for a team (with fallback mechanisms)
async function getVideoIdForTeam(team) {
  try {
    // The search query for YouTube - IMPORTANT: prefix with "ytsearch:" for search
    const searchQuery = `ytsearch:${team} NHL highlights 2024`;
    console.log(`🔍 Searching YouTube for: ${searchQuery}`);
    
    // Try to get search results using youtube-dl-exec
    const searchResults = await youtubedl(searchQuery, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      timeout: 30, // 30 second timeout
    });

    // Check if we got a valid search result
    if (searchResults && searchResults.entries && searchResults.entries.length > 0) {
      const firstVideo = searchResults.entries[0];
      const videoId = firstVideo.id;
      console.log(`✅ Found YouTube video: ${firstVideo.title} (${videoId})`);
      return {
        videoId,
        videoTitle: firstVideo.title,
        videoDescription: firstVideo.description || "",
        uploader: firstVideo.uploader || "",
        uploadDate: firstVideo.upload_date || ""
      };
    }
    
    throw new Error("No videos found in search results");
  } catch (err) {
    console.warn(`⚠️ YouTube search failed for ${team}: ${err.message}`);
    console.log(`🔄 Using fallback video for ${team}`);
    
    // Use fallback video ID from our hardcoded mapping
    const videoId = fallbackVideos[team] || fallbackVideos.default;
    return {
      videoId,
      videoTitle: `${team} NHL Highlights`,
      videoDescription: "NHL hockey highlights",
      uploader: "NHL",
      uploadDate: new Date().toISOString().slice(0, 10).replace(/-/g, "")
    };
  }
}

app.get("/api/analyze", async (req, res) => {
  const team = req.query.team;

  if (!team) {
    return res.status(400).json({ error: "Missing team name" });
  }

  // Check if there's already an analysis in progress for this team
  if (ongoingRequests.has(team)) {
    // If we have a cached result, return it immediately
    const cachedRequest = ongoingRequests.get(team);
    if (cachedRequest.result) {
      return res.json(cachedRequest.result);
    }
    
    return res.status(429).json({ 
      error: "Analysis for this team is already in progress",
      message: "Please wait for the current analysis to complete or try a different team."
    });
  }

  // Mark this team as having an ongoing request
  ongoingRequests.set(team, { startTime: Date.now() });

  try {
    // Get video ID with fallback mechanism
    const videoData = await getVideoIdForTeam(team);
    const videoId = videoData.videoId;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    // If using dummy data (production mode), return the analysis immediately
    if (USE_DUMMY_DATA) {
      console.log(`🧪 Using dummy data for ${team}`);
      const dummyAnalysis = getTeamAnalysis(team);
      
      const result = {
        summary: dummyAnalysis.summary,
        teamPerformance: dummyAnalysis.teamPerformance,
        playerPerformance: dummyAnalysis.playerPerformance,
        videoUrl: embedUrl,
        analysisStatus: "complete"
      };
      
      // Store the result for future requests
      ongoingRequests.set(team, {
        startTime: Date.now(),
        result: result
      });
      
      return res.json(result);
    }
    
    // Check if Python is available before proceeding with advanced analysis
    const pythonAvailable = await isPythonAvailable();
    
    // Setup paths for files (if needed)
    const outputPath = path.resolve(__dirname, `highlight_${Date.now()}.mp4`);
    const videoInfoPath = path.resolve(__dirname, `video_info_${Date.now()}.json`);
    
    // Set a timeout for the full analysis
    const requestTimeout = setTimeout(() => {
      cleanupRequest(team, outputPath, videoInfoPath);
      
      // Create a generic result for timeout cases
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
      
      if (!res.headersSent) {
        res.status(504).json({
          error: "Analysis timed out",
          message: "The analysis took too long to complete. Try again with a different team."
        });
      }
    }, 3 * 60 * 1000); // 3 minutes timeout
    
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
    
    // If Python isn't available, skip the advanced analysis
    if (!pythonAvailable) {
      clearTimeout(requestTimeout);
      
      // Use fallback mechanism - similar to dummyAnalysis but with a note
      const fallbackAnalysis = getTeamAnalysis(team);
      
      // Store a simplified result
      ongoingRequests.set(team, {
        startTime: Date.now(),
        result: {
          summary: fallbackAnalysis.summary,
          teamPerformance: fallbackAnalysis.teamPerformance,
          playerPerformance: fallbackAnalysis.playerPerformance, 
          videoUrl: embedUrl,
          analysisStatus: "complete"
        }
      });
      
      console.log(`✅ Fallback analysis stored for ${team}`);
      return;
    }
    
    // Save video metadata to pass to Python script
    const videoMetadata = {
      title: videoData.videoTitle || "",
      description: videoData.videoDescription || "",
      upload_date: videoData.uploadDate || "",
      uploader: videoData.uploader || "",
      team_query: team // Pass the original team query
    };
    
    // Write video info to a file for the Python script
    fs.writeFileSync(videoInfoPath, JSON.stringify(videoMetadata, null, 2));
    console.log(`✅ Saved video metadata to ${videoInfoPath}`);
    
    try {
      // Try to download the video - but handle failures gracefully
      console.log("📥 Downloading video...");
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      await youtubedl(videoUrl, {
        output: outputPath,
        format: 'best[ext=mp4]/best',
        noPlaylist: true,
        maxFilesize: "50m",
        retries: 3,          // Retry download up to 3 times
        timeout: 60          // 60 second timeout
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
      console.log("🧠 Running AI analysis...");
      
      // Try to run the Python script with proper error handling
      try {
        const pythonProcess = execFile("python3", ["analyze_highlight.py", finalVideoPath, videoInfoPath], 
          { cwd: __dirname, timeout: 120000 }, // 2 minute timeout 
          (error, stdout, stderr) => {
            clearTimeout(requestTimeout);
            
            if (error) {
              console.error("❌ Python error:", error);
              if (stderr) console.error("stderr:", stderr);
              
              // Use fallback analysis on error
              fallbackAnalysisResult(team, videoId);
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
                
                // Use fallback on parse error
                fallbackAnalysisResult(team, videoId);
              }
            }
            
            // Clean up downloaded files
            cleanupVideo(outputPath);
            cleanupInfoFile(videoInfoPath);
          }
        );
      } catch (pythonError) {
        console.error("❌ Failed to start Python process:", pythonError);
        fallbackAnalysisResult(team, videoId);
        cleanupVideo(outputPath);
        cleanupInfoFile(videoInfoPath);
      }
    } catch (downloadError) {
      console.error("❌ Video download failed:", downloadError.message);
      fallbackAnalysisResult(team, videoId);
      cleanupVideo(outputPath);
      cleanupInfoFile(videoInfoPath);
    }
  } catch (err) {
    console.error("❌ Error in main process:", err);
    
    // Use a generic embed URL if we couldn't even get a video ID
    const genericEmbedUrl = `https://www.youtube.com/embed/${fallbackVideos.default}`;
    
    // Create a fallback result
    const fallbackAnalysis = getTeamAnalysis(team);
    ongoingRequests.set(team, {
      startTime: Date.now(),
      result: {
        summary: fallbackAnalysis.summary,
        teamPerformance: fallbackAnalysis.teamPerformance,
        playerPerformance: fallbackAnalysis.playerPerformance,
        videoUrl: genericEmbedUrl,
        analysisStatus: "complete"
      }
    });
    
    // Only send response if headers aren't sent yet
    if (!res.headersSent) {
      // Try to send a more useful error message
      res.status(500).json({ 
        error: "Video search failed.",
        message: `Couldn't find highlights for ${team}. Please try again later.`,
        details: err.message
      });
    }
  }
  
  // Helper function for fallback analysis when Python fails
  function fallbackAnalysisResult(team, videoId) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const fallbackAnalysis = getTeamAnalysis(team);
    
    ongoingRequests.set(team, {
      startTime: Date.now(),
      result: {
        summary: fallbackAnalysis.summary,
        teamPerformance: fallbackAnalysis.teamPerformance,
        playerPerformance: fallbackAnalysis.playerPerformance,
        videoUrl: embedUrl,
        analysisStatus: "complete"
      }
    });
    
    console.log(`✅ Fallback analysis stored for ${team}`);
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
    mode: USE_DUMMY_DATA ? "production" : "development",
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
  
  // Delete files if they exist and we're not using dummy data
  if (!USE_DUMMY_DATA) {
    if (videoPath && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    if (infoPath && fs.existsSync(infoPath)) {
      fs.unlinkSync(infoPath);
    }
  }
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

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Try multiple possible static folder locations
  const possiblePaths = [
    path.resolve(__dirname, 'public'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(__dirname, '../client/build'),
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../build')
  ];
  
  // Find the first path that exists
  let clientBuildPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      clientBuildPath = testPath;
      break;
    }
  }
  
  if (clientBuildPath) {
    console.log(`📁 Serving static files from: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));
    
    // Serve the index.html file for any request that doesn't match an API route
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(clientBuildPath, 'index.html'));
    });
  } else {
    console.error('⚠️ No static build folder found. The app might not serve frontend files correctly.');
  }
}

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!USE_DUMMY_DATA) {
    console.log(`🔐 Make sure PERPLEXITY_API_KEY is set in your .env file`);
  }
  console.log(`📧 Email service available at /api/email/send`);
});