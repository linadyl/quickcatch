FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Setup youtube-dl/yt-dlp
RUN node setup-ytdl.js

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]