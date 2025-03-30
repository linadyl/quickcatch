FROM node:16

# Install Python and required system dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg

# Install yt-dlp instead of youtube-dl (more reliable)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    ln -s /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Set up app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway will set the PORT environment variable
ENV PORT=5000

# Expose the port
EXPOSE $PORT

# Command to run the app
CMD ["node", "server.js"]