#!/bin/bash

# Script to prepare files for Railway deployment

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Preparing for Railway Deployment ====${NC}"

# Ensure required files exist
for file in server.js analyze_highlight.py requirements.txt; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}ERROR: Required file $file not found!${NC}"
    exit 1
  else
    echo -e "${GREEN}✓ Found $file${NC}"
  fi
done

# Ensure Python file has correct permissions
chmod +x analyze_highlight.py
echo -e "${GREEN}✓ Made analyze_highlight.py executable${NC}"

# Ensure the Python file has the right shebang
if ! head -n 1 analyze_highlight.py | grep -q "#!/usr/bin/env python3"; then
  echo -e "${YELLOW}⚠ Adding proper shebang to analyze_highlight.py${NC}"
  echo '#!/usr/bin/env python3' > analyze_highlight.py.new
  cat analyze_highlight.py >> analyze_highlight.py.new
  mv analyze_highlight.py.new analyze_highlight.py
  chmod +x analyze_highlight.py
else
  echo -e "${GREEN}✓ analyze_highlight.py has correct shebang${NC}"
fi

# Make the start script executable
chmod +x start.sh
echo -e "${GREEN}✓ Made start.sh executable${NC}"

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo -e "${RED}ERROR: package.json not found!${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Found package.json${NC}"
fi

# Reminder about environment variables
echo -e "${YELLOW}"
echo -e "REMINDER: Make sure to set these environment variables in Railway:"
echo -e "- PERPLEXITY_API_KEY"
echo -e "${NC}"

echo -e "${GREEN}✓ All checks passed!${NC}"
echo -e "${BLUE}Ready for deployment to Railway!${NC}"