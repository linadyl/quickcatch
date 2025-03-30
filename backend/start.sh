#!/bin/bash

# Simple startup script for Railway with minimal memory usage
echo "Starting NHL Highlights Analyzer..."

# Ensure virtual environment is activated
if [ -z "$VIRTUAL_ENV" ] && [ -d "venv" ]; then
  source venv/bin/activate
  echo "Virtual environment activated"
fi

# Verify API key
if [ -z "$PERPLEXITY_API_KEY" ]; then
  echo "ERROR: PERPLEXITY_API_KEY environment variable is not set"
  exit 1
else
  echo "PERPLEXITY_API_KEY is set"
fi

# Add bin to PATH if it exists
if [ -d "bin" ]; then
  export PATH="$(pwd)/bin:${PATH}"
  echo "Added bin directory to PATH"
fi

# Start the server
exec node server.js