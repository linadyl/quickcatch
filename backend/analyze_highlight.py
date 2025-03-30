import os
import sys
import time
import json
import re
import base64
import requests
import tempfile
import traceback
import subprocess
from dotenv import load_dotenv

# Import PIL for fallback image creation
try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL not available for fallback image creation", file=sys.stderr)

# Load environment variables
try:
    load_dotenv()
    PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

    if not PERPLEXITY_API_KEY:
        print(json.dumps({
            "summary": "Missing Perplexity API key. Check your .env file.",
            "teamPerformance": "Set PERPLEXITY_API_KEY in your environment variables.",
            "playerPerformance": "Error: No API key found"
        }))
        sys.exit(1)
except Exception as e:
    print(json.dumps({
        "summary": f"Error setting up environment: {str(e)}",
        "teamPerformance": "Check your .env file and environment setup.",
        "playerPerformance": f"Error details: {traceback.format_exc()}"
    }))
    sys.exit(1)

def compress_video(input_path):
    """Compress the video using ffmpeg and return new file path."""
    output_path = os.path.join(tempfile.gettempdir(), "compressed_video.mp4")
    
    # Check input file size
    if os.path.exists(input_path):
        file_size_mb = os.path.getsize(input_path) / (1024 * 1024)
        print(f"Input video file size: {file_size_mb:.2f} MB", file=sys.stderr)
    else:
        print(f"Warning: Input path doesn't exist: {input_path}", file=sys.stderr)
        
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",  # Overwrite output if exists
        "-i", input_path,
        "-vcodec", "libx264",
        "-acodec", "aac",
        "-crf", "28",  # Adjust for quality vs size
        "-t", "60",    # Limit to first 60 seconds to reduce file size
        "-loglevel", "warning",  # Show only warnings or errors
        output_path
    ]
    
    try:
        print("🗜️ Compressing video with ffmpeg...", file=sys.stderr)
        # Capture stderr instead of suppressing it for better error reporting
        process = subprocess.run(ffmpeg_cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        if process.returncode != 0:
            error_output = process.stderr.decode('utf-8', errors='replace')
            print(f"FFmpeg error output: {error_output}", file=sys.stderr)
            raise RuntimeError(f"FFmpeg compression failed with code {process.returncode}")
            
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            print("FFmpeg produced an empty output file", file=sys.stderr)
            # If compression fails, try to use the original file
            print("Falling back to original video file", file=sys.stderr)
            return input_path
            
        output_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"✅ Compression complete: {output_path} ({output_size_mb:.2f} MB)", file=sys.stderr)
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {str(e)}", file=sys.stderr)
        print("Falling back to original video file", file=sys.stderr)
        return input_path
    except Exception as e:
        print(f"Unexpected error during compression: {str(e)}", file=sys.stderr)
        print("Falling back to original video file", file=sys.stderr)
        return input_path

def extract_frames(video_path, num_frames=5):
    """Extract frames from video for analysis."""
    frames_dir = os.path.join('/tmp', "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Calculate frame intervals to extract evenly distributed frames
    ffprobe_cmd = [
        "ffprobe", 
        "-v", "error", 
        "-select_streams", "v:0", 
        "-show_entries", "stream=duration", 
        "-of", "default=noprint_wrappers=1:nokey=1", 
        video_path
    ]
    
    try:
        duration = float(subprocess.check_output(ffprobe_cmd).decode('utf-8').strip())
        interval = duration / (num_frames + 1)
    except Exception as e:
        print(f"Error getting video duration: {str(e)}", file=sys.stderr)
        duration = 60  # Assume 60 seconds if we can't get duration
        interval = duration / (num_frames + 1)
    
    frame_paths = []
    for i in range(1, num_frames + 1):
        timestamp = interval * i
        output_path = os.path.join(frames_dir, f"frame_{i}.jpg")
        
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]
        
        try:
            process = subprocess.run(ffmpeg_cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if process.returncode != 0:
                error_output = process.stderr.decode('utf-8', errors='replace')
                print(f"Warning: FFmpeg frame extraction issue: {error_output}", file=sys.stderr)
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                frame_paths.append(output_path)
            else:
                print(f"Failed to extract frame {i}: Output file empty or missing", file=sys.stderr)
        except Exception as e:
            print(f"Error extracting frame {i}: {str(e)}", file=sys.stderr)
    
    return frame_paths

def extract_frames_simple(video_path, num_frames=3):
    """A simpler method to extract frames that's more likely to succeed."""
    frames_dir = os.path.join(tempfile.gettempdir(), "frames_simple")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Extract frames at fixed positions (beginning, middle, end)
    positions = ["00:00:05", "00:00:15", "00:00:30"]
    
    frame_paths = []
    for i, pos in enumerate(positions[:num_frames]):
        output_path = os.path.join(frames_dir, f"simple_frame_{i}.jpg")
        
        try:
            # Use simpler ffmpeg command with explicit position
            cmd = [
                "ffmpeg",
                "-y",
                "-ss", pos,
                "-i", video_path,
                "-frames:v", "1",
                "-q:v", "5",  # Lower quality for better reliability
                "-loglevel", "warning",
                output_path
            ]
            
            print(f"Extracting simple frame at position {pos}...", file=sys.stderr)
            subprocess.run(cmd, check=False, timeout=30)
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                frame_paths.append(output_path)
                print(f"✅ Successfully extracted frame at {pos}", file=sys.stderr)
            else:
                print(f"❌ Failed to extract frame at {pos}", file=sys.stderr)
                
        except Exception as e:
            print(f"Error in simple frame extraction at {pos}: {str(e)}", file=sys.stderr)
    
    if not frame_paths:
        # Last resort - create a text image with the team name
        try:
            if not PIL_AVAILABLE:
                print("Cannot create fallback image - PIL not available", file=sys.stderr)
                raise ImportError("PIL not available")
                
            # Extract team name from video filename
            filename = os.path.basename(video_path)
            team_name = filename.split('_')[0].replace('highlight', '').strip()
            if not team_name:
                team_name = "NHL Highlights"
                
            img = Image.new('RGB', (800, 600), color=(53, 59, 72))
            d = ImageDraw.Draw(img)
            
            # Use default font
            try:
                font = ImageFont.truetype("Arial", 40)
            except:
                font = ImageFont.load_default()
                
            # Position text in center
            text = f"{team_name}\nHighlights"
            d.text((400, 300), text, fill=(255, 255, 255), font=font, anchor="mm" if hasattr(d, "textbbox") else None)
            
            fallback_path = os.path.join(frames_dir, "fallback.jpg")
            img.save(fallback_path)
            frame_paths = [fallback_path]
            print("✅ Created fallback image", file=sys.stderr)
        except Exception as e:
            print(f"Error creating fallback image: {str(e)}", file=sys.stderr)
    
    return frame_paths

def encode_image_to_base64(image_path):
    """Convert image to base64 for API submission."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_subtitles(video_path):
    """Extract subtitles or generate transcript from video audio."""
    transcript_path = os.path.join(tempfile.gettempdir(), "transcript.txt")
    
    # Method 1: Try to extract embedded subtitles
    try:
        print("Attempting to extract embedded subtitles...", file=sys.stderr)
        subtitle_cmd = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-map", "0:s:0",  # First subtitle stream
            transcript_path
        ]
        
        process = subprocess.run(subtitle_cmd, check=False, stderr=subprocess.PIPE)
        
        if os.path.exists(transcript_path) and os.path.getsize(transcript_path) > 0:
            with open(transcript_path, 'r', errors='replace') as f:
                return f.read()
    except Exception as e:
        print(f"Error extracting subtitles: {str(e)}", file=sys.stderr)
    
    # Method 2: Generate speech-to-text transcript (requires whisper package)
    try:
        import whisper
        print("Generating transcript with Whisper...", file=sys.stderr)
        model = whisper.load_model("tiny")
        result = model.transcribe(video_path)
        return result["text"]
    except ImportError:
        print("Whisper package not available for transcription", file=sys.stderr)
    except Exception as e:
        print(f"Error generating transcript: {str(e)}", file=sys.stderr)
    
    # Method 3: Extract audio then attempt speech recognition
    audio_path = os.path.join(tempfile.gettempdir(), "audio.wav")
    try:
        print("Extracting audio for transcript generation...", file=sys.stderr)
        audio_cmd = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            audio_path
        ]
        
        subprocess.run(audio_cmd, check=False, stderr=subprocess.DEVNULL)
        
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            try:
                import speech_recognition as sr
                recognizer = sr.Recognizer()
                with sr.AudioFile(audio_path) as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data)
                    return text
            except ImportError:
                print("SpeechRecognition package not available", file=sys.stderr)
            except Exception as e:
                print(f"Error in speech recognition: {str(e)}", file=sys.stderr)
    except Exception as e:
        print(f"Error extracting audio: {str(e)}", file=sys.stderr)
    
    return None

def parse_video_metadata(video_info_file):
    """Parse video metadata from the JSON info file passed from server.js"""
    try:
        if os.path.exists(video_info_file):
            with open(video_info_file, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error parsing video metadata: {str(e)}", file=sys.stderr)
        return {}

def extract_team_names(title):
    """Extract NHL team names from the video title."""
    nhl_teams = [
        "Anaheim Ducks", "Arizona Coyotes", "Boston Bruins", "Buffalo Sabres", 
        "Calgary Flames", "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche", 
        "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers", 
        "Florida Panthers", "Los Angeles Kings", "Minnesota Wild", "Montreal Canadiens", 
        "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers", 
        "Ottawa Senators", "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", 
        "Seattle Kraken", "St. Louis Blues", "Tampa Bay Lightning", "Toronto Maple Leafs", 
        "Utah Hockey Club", "Vancouver Canucks", "Vegas Golden Knights", "Washington Capitals", 
        "Winnipeg Jets"
    ]
    
    # Also include shortened versions and nicknames
    team_nicknames = {
        "Ducks": "Anaheim Ducks", "Coyotes": "Arizona Coyotes", "Bruins": "Boston Bruins", 
        "Sabres": "Buffalo Sabres", "Flames": "Calgary Flames", "Hurricanes": "Carolina Hurricanes", 
        "Canes": "Carolina Hurricanes", "Blackhawks": "Chicago Blackhawks", "Hawks": "Chicago Blackhawks", 
        "Avalanche": "Colorado Avalanche", "Avs": "Colorado Avalanche", "Blue Jackets": "Columbus Blue Jackets", 
        "CBJ": "Columbus Blue Jackets", "Stars": "Dallas Stars", "Red Wings": "Detroit Red Wings", 
        "Wings": "Detroit Red Wings", "Oilers": "Edmonton Oilers", "Panthers": "Florida Panthers", 
        "Kings": "Los Angeles Kings", "Wild": "Minnesota Wild", "Canadiens": "Montreal Canadiens", 
        "Habs": "Montreal Canadiens", "Predators": "Nashville Predators", "Preds": "Nashville Predators", 
        "Devils": "New Jersey Devils", "Islanders": "New York Islanders", "Isles": "New York Islanders", 
        "Rangers": "New York Rangers", "Senators": "Ottawa Senators", "Sens": "Ottawa Senators", 
        "Flyers": "Philadelphia Flyers", "Penguins": "Pittsburgh Penguins", "Pens": "Pittsburgh Penguins", 
        "Sharks": "San Jose Sharks", "Kraken": "Seattle Kraken", "Blues": "St. Louis Blues", 
        "Lightning": "Tampa Bay Lightning", "Bolts": "Tampa Bay Lightning", "Maple Leafs": "Toronto Maple Leafs", 
        "Leafs": "Toronto Maple Leafs", "Canucks": "Vancouver Canucks", "Golden Knights": "Vegas Golden Knights", 
        "Knights": "Vegas Golden Knights", "VGK": "Vegas Golden Knights", "Capitals": "Washington Capitals", 
        "Caps": "Washington Capitals", "Jets": "Winnipeg Jets"
    }
    
    found_teams = []
    
    # First check for full team names
    for team in nhl_teams:
        if team in title:
            found_teams.append(team)
    
    # If we don't have two teams yet, check for nicknames and abbreviations
    if len(found_teams) < 2:
        words = title.split()
        for word in words:
            # Clean up the word
            clean_word = word.strip(",.@:;()-_").replace("'s", "")
            if clean_word in team_nicknames and team_nicknames[clean_word] not in found_teams:
                found_teams.append(team_nicknames[clean_word])
    
    # Common patterns like "Team1 vs Team2" or "Team1 @ Team2"
    vs_pattern = re.search(r'(\w+)\s+(?:vs\.?|@|against|versus)\s+(\w+)', title, re.IGNORECASE)
    if vs_pattern:
        team1, team2 = vs_pattern.groups()
        if team1 in team_nicknames and team_nicknames[team1] not in found_teams:
            found_teams.append(team_nicknames[team1])
        if team2 in team_nicknames and team_nicknames[team2] not in found_teams:
            found_teams.append(team_nicknames[team2])
    
    # Return only unique team names
    return list(set(found_teams))

def extract_sections(text):
    """Break AI output into 3 clean parts based on headings while removing thinking process."""
    sections = {
        "summary": "",
        "teamPerformance": "",
        "playerPerformance": ""
    }
    
    # Remove thinking process (often appears before the actual response or between </think> tags)
    if "</think>" in text:
        # If there are explicit thinking tags, remove everything before the last </think>
        text = text.split("</think>")[-1].strip()
    
    # Also check for other thinking patterns
    if "First, I need to" in text:
        thinking_start = text.find("First, I need to")
        summary_start = text.lower().find("### summary", thinking_start)
        if summary_start > -1:
            text = text[summary_start:].strip()
    
    # Process the actual response sections
    current = None
    lines = text.splitlines()
    
    for i, line in enumerate(lines):
        line_lower = line.strip().lower()
        
        # Check for section headers
        if "summary" in line_lower and ("###" in line_lower or line_lower.startswith("summary")):
            current = "summary"
            continue
        elif ("team performance" in line_lower or "team analysis" in line_lower) and (
                "###" in line_lower or line_lower.startswith("team")):
            current = "teamPerformance"
            continue
        elif ("player performance" in line_lower or "player analysis" in line_lower) and (
                "###" in line_lower or line_lower.startswith("player")):
            current = "playerPerformance"
            continue
        # Check for section dividers like "---" that might indicate section breaks
        elif "---" in line and current is not None:
            # If we see a divider, check if next line has a new section header
            if i + 1 < len(lines) and any(header in lines[i+1].lower() for header in ["summary", "team", "player"]):
                continue
                
        # Add line to current section if we're in a section
        elif current and line.strip():
            # Remove citation patterns like [1][2][3] that may appear in the response
            clean_line = re.sub(r'\[\d+\]', '', line)
            sections[current] += clean_line.strip() + " "
    
    # Post-process to remove any remaining thinking artifacts
    for key in sections:
        # Remove phrases that suggest thinking
        thinking_phrases = [
            "I need to", "I should", "First,", "Next,", "Finally,", "Let me", 
            "Let's", "Checking", "Verifying", "Making sure", "Ensuring",
            "Note:", "Note that", "Remember to", "Don't forget"
        ]
        
        for phrase in thinking_phrases:
            if sections[key].startswith(phrase):
                # Find the first sentence end after the thinking phrase
                first_period = sections[key].find('. ', len(phrase))
                if first_period > -1:
                    sections[key] = sections[key][first_period + 2:]
        
        # If any section is empty, provide a fallback
        if not sections[key] or sections[key].isspace():
            sections[key] = f"No {key.replace('P', ' p')} was provided in the analysis."
    
    return {k: v.strip() for k, v in sections.items()}

def analyze_video_with_perplexity(video_path, video_info_file=None):
    """Analyze video using Perplexity AI API with enhanced context."""
    video_metadata = {}
    if video_info_file:
        video_metadata = parse_video_metadata(video_info_file)
    
    video_title = video_metadata.get('title', 'NHL Highlights')
    video_description = video_metadata.get('description', '')
    upload_date = video_metadata.get('upload_date', '')
    uploader = video_metadata.get('uploader', '')
    team_query = video_metadata.get('team_query', '')
    
    print(f"Video title: {video_title}", file=sys.stderr)
    print(f"Uploader: {uploader}", file=sys.stderr)
    print(f"Upload date: {upload_date}", file=sys.stderr)
    print(f"Team query: {team_query}", file=sys.stderr)
    
    # Extract team names from title
    teams = extract_team_names(video_title)
    team_info = f"Teams identified: {', '.join(teams)}" if teams else "No specific teams identified"
    print(f"{team_info}", file=sys.stderr)
    
    # Try to compress the video to reduce size
    try:
        compressed_path = compress_video(video_path)
        print(f"Using video file: {compressed_path}", file=sys.stderr)
        
        # Extract frames from the video for analysis
        print("🖼️ Extracting frames from video...", file=sys.stderr)
        frame_paths = extract_frames(compressed_path)
        
        if not frame_paths:
            print("⚠️ Frame extraction failed, trying alternate method...", file=sys.stderr)
            # Fallback: Try a simpler approach for frame extraction
            frame_paths = extract_frames_simple(compressed_path)
    except Exception as e:
        print(f"⚠️ Error in video processing: {str(e)}", file=sys.stderr)
        print("⚠️ Attempting fallback method for analysis...", file=sys.stderr)
        # Fallback to simple frame extraction from original file
        frame_paths = extract_frames_simple(video_path)
    
    if not frame_paths:
        raise ValueError("Failed to extract any frames from video")
    
    # Extract subtitles or generate transcript if possible
    transcript = extract_subtitles(video_path)
    if transcript:
        print(f"✅ Got transcript ({len(transcript)} chars)", file=sys.stderr)
        # Limit transcript length to avoid token limits
        transcript = transcript[:2000] + "..." if len(transcript) > 2000 else transcript
    else:
        transcript = "No transcript available."
        print("❌ No transcript available", file=sys.stderr)
    
    # Convert frames to base64
    base64_images = [encode_image_to_base64(frame) for frame in frame_paths]
    
    # Prepare a rich context for Perplexity
    teams_str = f"Teams: {', '.join(teams)}" if teams else ""
    
    # Prepare the prompt for Perplexity
    prompt = f"""
This is an NHL hockey highlight video titled: "{video_title}"
{teams_str}

Video description: {video_description[:300]}

The user is specifically interested in analysis for: {team_query}

Based on the frames shown from this highlight video, please analyze the game with a focus on {team_query} and provide insights in exactly these three sections:

### Summary
Write a concise summary of what's happening in this NHL highlight video, focusing on {team_query}'s role in the game. Include the key moments shown and the overall narrative of the highlights from {team_query}'s perspective.

### Team Performance
Analyze how {team_query} performed based on what you can see in the video frames. Discuss their offensive and defensive strategies, special teams play, and overall team dynamics visible in the highlights. Focus exclusively on {team_query}, not their opponents.

### Player Performance
Highlight specific {team_query} players visible in the frames and their contributions. Mention any standout performances, key plays, goals, assists, or defensive stops you can identify from {team_query} players only.

IMPORTANT: Do not include any internal thinking or drafting process. Provide only the final sections. Do not use citations like [1], [2], etc. Write in a polished, professional style as if this is the final published analysis. Focus exclusively on {team_query}, not their opponents.
"""

    # Create messages with the frames as images
    messages = [
        {
            "role": "system",
            "content": "You are a skilled sports analyst specializing in NHL hockey. Your task is to analyze hockey highlight frames and provide insightful commentary. Be specific about what you see in the frames rather than making general statements about the teams. Provide only your final analysis without sharing your thinking process or drafts."
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ]
    
    # Add the images to the user message content
    for image in base64_images:
        messages[1]["content"].append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image}"
            }
        })
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "sonar-reasoning-pro",  # Using the specified sonar-reasoning-pro model
        "messages": messages,
        "max_tokens": 1000,
        "temperature": 0.3  # Lower temperature to reduce likelihood of thinking outputs
    }
    
    # Define the API URL here
    api_url = "https://api.perplexity.ai/chat/completions"
    
    print("🧠 Sending request to Perplexity AI...", file=sys.stderr)
    try:
        response = requests.post(api_url, headers=headers, json=data)
        
        print(f"Response status code: {response.status_code}", file=sys.stderr)
        
        response.raise_for_status()
        
        result = response.json()
        print("✅ Received response from Perplexity AI", file=sys.stderr)
        
        # Extract the response text
        if "choices" in result and len(result["choices"]) > 0:
            analysis_text = result["choices"][0]["message"]["content"]
            return extract_sections(analysis_text)
        else:
            raise ValueError("Unexpected API response format")
    
    except Exception as e:
        print(f"Error in Perplexity API request: {str(e)}", file=sys.stderr)
        print(f"Response status code: {response.status_code if 'response' in locals() else 'N/A'}", file=sys.stderr)
        try:
            print(f"Response body: {response.text if 'response' in locals() else 'N/A'}", file=sys.stderr)
        except:
            print("Could not print response body", file=sys.stderr)
        raise

def analyze_video(video_path, video_info_file=None):
    """Main function to analyze a video file."""
    # Check if the file exists
    if not os.path.exists(video_path):
        # Try with .part extension if regular file not found
        part_path = f"{video_path}.part"
        if os.path.exists(part_path):
            print(f"Using partial download file: {part_path}", file=sys.stderr)
            video_path = part_path
        else:
            raise FileNotFoundError(f"Video file not found: {video_path} (also checked {part_path})")

    print(f"Processing video: {video_path}", file=sys.stderr)
    
    try:
        # Use Perplexity AI to analyze the video frames with enhanced context
        return analyze_video_with_perplexity(video_path, video_info_file)
    
    except Exception as e:
        print(f"Error in analyze_video: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        raise

def generate_mock_analysis():
    """Generate mock analysis as a fallback."""
    return {
        "summary": "This highlight video showcases exciting NHL action from recent games. Watch to see great goals, saves, and plays.",
        "teamPerformance": "The team demonstrated strong offensive capabilities throughout the game, creating numerous scoring opportunities. Their defensive strategy effectively neutralized the opposition's attack, though there were some moments when they needed to rely on solid goaltending.",
        "playerPerformance": "Several players stood out with exceptional performances. The goaltender made crucial saves at key moments, while the top line forwards displayed excellent chemistry, resulting in multiple scoring chances and goals."
    }

if __name__ == "__main__":
    try:
        # Check if video path was provided
        if len(sys.argv) < 2:
            raise ValueError("Missing video path. Usage: python analyze_highlight.py VIDEO_PATH [VIDEO_INFO_FILE]")
        
        video_path = os.path.abspath(sys.argv[1])
        
        # Check if video info file was provided as second argument
        video_info_file = None
        if len(sys.argv) > 2:
            video_info_file = os.path.abspath(sys.argv[2])
            print(f"Using video metadata from: {video_info_file}", file=sys.stderr)
        
        analysis = analyze_video(video_path, video_info_file)
        print(json.dumps(analysis))
    
    except Exception as e:
        print(f"Error in main: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        
        # Return a mock analysis on error so the app can still function
        fallback = generate_mock_analysis()
        fallback["playerPerformance"] += f" Error details: {str(e)}"
        print(json.dumps(fallback))