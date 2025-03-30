const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map();

// Simple health check endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime()
  });
});

// Root endpoint with simple status page
app.get("/", (req, res) => {
  res.send(`
    <html><body>
      <h1>NHL Highlights API</h1>
      <p>Server is running</p>
      <p>Uptime: ${Math.floor(process.uptime() / 60)} minutes</p>
    </body></html>
  `);
});

app.get("/api/analyze", async (req, res) => {
  const team = req.query.team;

  if (!team) {
    return res.status(400).json({ error: "Missing team name" });
  }

  // Check if there's already an analysis in progress for this team
  if (ongoingRequests.has(team)) {
    return res.status(429).json({ 
      error: "Analysis for this team is already in progress"
    });
  }

  // The search query for YouTube
  const searchQuery = `ytsearch:${team} NHL highlights 2024`;
  const outputPath = path.resolve(__dirname, `highlight_${Date.now()}.mp4`);
  const videoInfoPath = path.resolve(__dirname, `video_info_${Date.now()}.json`);
  
  // Mark this team as having an ongoing request
  ongoingRequests.set(team, { startTime: Date.now() });

  try {
    console.log(`Searching YouTube for: ${searchQuery}`);

    // Get search results using youtube-dl
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
    
    console.log(`Found video: ${videoUrl}`);
    
    // Save video metadata to pass to Python script
    const videoInfo = {
      title: firstVideo.title || "",
      description: firstVideo.description || "",
      upload_date: firstVideo.upload_date || "",
      uploader: firstVideo.uploader || "",
      duration: firstVideo.duration || 0,
      view_count: firstVideo.view_count || 0,
      team_query: team
    };
    
    // Write video info to a file
    fs.writeFileSync(videoInfoPath, JSON.stringify(videoInfo, null, 2));
    
    // Send an initial response with just the video URL
    res.json({
      summary: `Loading analysis for ${team}...`,
      teamPerformance: "Team analysis loading...",
      playerPerformance: "Player analysis loading...",
      videoUrl: embedUrl,
      analysisStatus: "pending"
    });
    
    // Download the video in the background
    console.log("Downloading video...");
    await youtubedl(videoUrl, {
      output: outputPath,
      format: 'best[ext=mp4]/best',
      noPlaylist: true,
      maxFilesize: "50m",
      retries: 3
    });
    
    // Check if the file exists or if it's still a .part file
    const partFilePath = `${outputPath}.part`;
    let finalVideoPath = outputPath;
    
    if (fs.existsSync(partFilePath) && !fs.existsSync(outputPath)) {
      finalVideoPath = partFilePath;
    }
    
    if (!fs.existsSync(finalVideoPath)) {
      throw new Error(`Video file not found`);
    }
    
    console.log("Video downloaded, running AI analysis...");
    
    // Run the Python script to analyze the video
    execFile("python3", ["analyze_highlight.py", finalVideoPath, videoInfoPath], { cwd: __dirname }, 
      (error, stdout, stderr) => {
        if (error) {
          console.error("Python error:", error.message);
          
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
            console.log("Analysis complete!");
            const result = JSON.parse(stdout);
            
            // Store the analysis result
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
          } catch (parseErr) {
            console.error("Failed to parse Python output");
            
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
        
        // Clean up files
        try {
          if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);
          if (fs.existsSync(videoInfoPath)) fs.unlinkSync(videoInfoPath);
        } catch (e) {
          console.error("Error cleaning up files:", e.message);
        }
      }
    );
    
  } catch (err) {
    console.error("Error:", err.message);
    
    // Remove from ongoing requests tracking
    ongoingRequests.delete(team);
    
    // Clean up downloaded files
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(outputPath + '.part')) fs.unlinkSync(outputPath + '.part');
      if (fs.existsSync(videoInfoPath)) fs.unlinkSync(videoInfoPath);
    } catch (e) {
      console.error("Error cleaning up files:", e.message);
    }
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Video download or analysis failed.",
        message: err.message
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

// Clean up cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [team, data] of ongoingRequests.entries()) {
    // Remove entries older than 1 hour
    if (now - data.startTime > 3600000) {
      ongoingRequests.delete(team);
    }
  }
}, 15 * 60 * 1000); // Check every 15 minutes

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API key available: ${process.env.PERPLEXITY_API_KEY ? 'Yes' : 'No'}`);
});