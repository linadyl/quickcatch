FROM node:18-slim

WORKDIR /app

# Install only essential dependencies incrementally to avoid memory issues
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip python3-venv && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Create bin directory for youtube-dl
RUN mkdir -p /app/bin

# Download and set up yt-dlp/youtube-dl (smaller than installing from apt)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && ln -sf /app/bin/yt-dlp /app/bin/youtube-dl \
    && chmod +x /app/bin/youtube-dl

# Add bin to PATH
ENV PATH="/app/bin:${PATH}"

# Create and activate Python virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:${PATH}"
ENV VIRTUAL_ENV="/app/venv"

# Copy package.json first for better caching
COPY package*.json ./
RUN npm install --no-optional --production

# Copy Python requirements and install (minimal version)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy only the necessary application files
COPY server.js start.sh analyze_highlight.py ./
COPY .env* ./

# Make start script executable
RUN chmod +x start.sh

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["bash", "start.sh"]