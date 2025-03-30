FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create bin directory for youtube-dl
RUN mkdir -p /app/bin

# Download and set up yt-dlp/youtube-dl
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

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application files
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Verify youtube-dl is working
RUN youtube-dl --version || yt-dlp --version

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["bash", "start.sh"]