import os
import sys
import time
import json
from dotenv import load_dotenv
import subprocess
import tempfile
import traceback
import requests

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
    frames_dir = os.path.join(tempfile.gettempdir(), "frames")
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
    import base64
    
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_sections(text):
    """Break AI output into 3 clean parts based on headings."""
    sections = {
        "summary": "",
        "teamPerformance": "",
        "playerPerformance": ""
    }
    current = None
    
    for line in text.splitlines():
        line_lower = line.strip().lower()
        if "summary" in line_lower:
            current = "summary"
            continue
        elif "team performance" in line_lower:
            current = "teamPerformance"
            continue
        elif "player performance" in line_lower or "player analysis" in line_lower:
            current = "playerPerformance"
            continue
        elif current and line.strip():
            sections[current] += line.strip() + " "
    
    # If any section is empty, provide a fallback
    for key in sections:
        if not sections[key]:
            sections[key] = f"No {key.replace('P', ' p')} was provided in the analysis."
    
    return {k: v.strip() for k, v in sections.items()}

def analyze_video_with_perplexity(video_path):
    """Analyze video using Perplexity AI API by extracting frames."""
    # First compress the video to reduce size
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
    
    # Convert frames to base64
    base64_images = [encode_image_to_base64(frame) for frame in frame_paths]
    
    # Prepare the prompt for Perplexity
    prompt = """
This is an NHL hockey highlight video. Based on the frames shown, please analyze the game and provide your insights in exactly these three sections:

### Summary
Write a concise summary of what's happening in the hockey highlight.

### Team Performance
Analyze how the team(s) performed based on what you can see in the frames.

### Player Performance
Highlight any notable player performances or standout moments visible in the frames.

Only respond with these three sections. Do not include any other text.
"""
    
    # Prepare API request to Perplexity
    api_url = "https://api.perplexity.ai/chat/completions"
    
    # Create messages with the frames as images
    messages = [
        {
            "role": "system",
            "content": "You are a skilled sports analyst specializing in NHL hockey. Your task is to analyze hockey highlight frames and provide insightful commentary."
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
        "model": "llama-3-sonar-large-32k-online",  # Using a model that can process images
        "messages": messages,
        "max_tokens": 1000
    }
    
    print("🧠 Sending request to Perplexity AI...", file=sys.stderr)
    try:
        response = requests.post(api_url, headers=headers, json=data)
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
        raise

def analyze_video(video_path):
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
        # Use Perplexity AI to analyze the video frames
        return analyze_video_with_perplexity(video_path)
    
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
        # Check if a video path was provided
        if len(sys.argv) < 2:
            raise ValueError("Missing video path. Usage: python analyze_highlight.py VIDEO_PATH")
        
        video_path = os.path.abspath(sys.argv[1])
        analysis = analyze_video(video_path)
        print(json.dumps(analysis))
    
    except Exception as e:
        print(f"Error in main: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        
        # Return a mock analysis on error so the app can still function
        fallback = generate_mock_analysis()
        fallback["playerPerformance"] += f" Error details: {str(e)}"
        print(json.dumps(fallback))