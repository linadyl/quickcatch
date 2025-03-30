#!/bin/bash

# Make script exit on any error
set -e

# Output with colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NHL Highlights Analyzer ====${NC}"
echo -e "${BLUE}Starting server with environment checks${NC}"

# Check for critical files
if [ ! -f server.js ]; then
  echo -e "${RED}ERROR: server.js not found!${NC}"
  exit 1
fi

# Create and use virtual environment if not in one already
if [ -z "$VIRTUAL_ENV" ]; then
  echo -e "${BLUE}Setting up Python virtual environment${NC}"
  
  # Ensure venv module is available
  if ! python3 -m venv --help > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing Python venv module${NC}"
    apt-get update && apt-get install -y python3-venv
  fi
  
  # Create virtual environment
  if [ ! -d "venv" ]; then
    python3 -m venv venv
  fi
  
  # Activate virtual environment
  source venv/bin/activate
  echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
  echo -e "${GREEN}✓ Already in virtual environment: $VIRTUAL_ENV${NC}"
fi

# Verify youtube-dl/yt-dlp is available
if command -v yt-dlp >/dev/null 2>&1; then
  echo -e "${GREEN}✓ yt-dlp is installed${NC}"
  YT_VERSION=$(yt-dlp --version)
  echo -e "${GREEN}  Version: $YT_VERSION${NC}"
elif command -v youtube-dl >/dev/null 2>&1; then
  echo -e "${GREEN}✓ youtube-dl is installed${NC}"
  YT_VERSION=$(youtube-dl --version)
  echo -e "${GREEN}  Version: $YT_VERSION${NC}"
else
  echo -e "${YELLOW}⚠ youtube-dl/yt-dlp not found in PATH, attempting to install${NC}"
  
  # Create bin directory
  mkdir -p bin
  
  # Download yt-dlp
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
  chmod +x bin/yt-dlp
  
  # Create symbolic link as youtube-dl for compatibility
  ln -sf bin/yt-dlp bin/youtube-dl
  chmod +x bin/youtube-dl
  
  # Add to PATH
  export PATH="$(pwd)/bin:$PATH"
  
  # Verify installation
  if command -v yt-dlp >/dev/null 2>&1; then
    echo -e "${GREEN}✓ yt-dlp installed successfully${NC}"
  else
    echo -e "${RED}ERROR: Failed to install yt-dlp${NC}"
    exit 1
  fi
fi

# Verify ffmpeg
if command -v ffmpeg >/dev/null 2>&1; then
  echo -e "${GREEN}✓ ffmpeg is installed${NC}"
else
  echo -e "${RED}ERROR: ffmpeg not found, please install it${NC}"
  exit 1
fi

# Verify python installation
if command -v python3 >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Python 3 is installed${NC}"
  PY_VERSION=$(python3 --version)
  echo -e "${GREEN}  Version: $PY_VERSION${NC}"
else
  echo -e "${RED}ERROR: Python 3 not found, please install it${NC}"
  exit 1
fi

# Verify python dependencies
if [ ! -f "requirements.txt" ]; then
  echo -e "${YELLOW}⚠ requirements.txt not found, creating minimal version${NC}"
  echo -e "python-dotenv==0.21.1\nrequests==2.31.0\nPillow==9.5.0" > requirements.txt
fi

echo -e "${BLUE}Installing Python requirements...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Check for PERPLEXITY_API_KEY
if [ -z "$PERPLEXITY_API_KEY" ]; then
  echo -e "${RED}ERROR: PERPLEXITY_API_KEY environment variable is not set${NC}"
  echo -e "${YELLOW}Please set this variable in the Railway dashboard or .env file${NC}"
  exit 1
else
  echo -e "${GREEN}✓ PERPLEXITY_API_KEY is set${NC}"
fi

# Start the server
echo -e "${BLUE}Starting server...${NC}"
exec node server.js