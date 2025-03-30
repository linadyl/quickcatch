#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== QuickCatch Deployment Package Creator =====${NC}"
echo -e "${YELLOW}This script creates a clean deployment package for Railway${NC}"

# Create a temporary deployment directory
DEPLOY_DIR="quickcatch-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Step 1: Build the React app
echo -e "\n${GREEN}Step 1: Building React client...${NC}"
cd client

echo "Installing client dependencies..."
npm install || { echo -e "${RED}Failed to install client dependencies${NC}"; exit 1; }

# Make sure react-router-dom is installed
echo "Ensuring react-router-dom is installed..."
npm install react-router-dom --save || { echo -e "${RED}Failed to install react-router-dom${NC}"; exit 1; }

echo "Building React application..."
npm run build || { echo -e "${RED}Failed to build React application${NC}"; exit 1; }
echo -e "${GREEN}✓ React build completed successfully${NC}"

# Step 2: Prepare the deployment package
echo -e "\n${GREEN}Step 2: Creating deployment package...${NC}"
cd ..

# Create public directory in the deployment package
mkdir -p $DEPLOY_DIR/public

# Copy server files
echo "Copying server files..."
cp server/*.js $DEPLOY_DIR/
cp -r server/emailService.js $DEPLOY_DIR/
cp team-analysis.js $DEPLOY_DIR/

# Copy React build to public directory
echo "Copying client build to public directory..."
cp -r client/dist/* $DEPLOY_DIR/public/

# Create package.json for deployment
echo "Creating deployment package.json..."
cat > $DEPLOY_DIR/package.json << EOF
{
  "name": "quickcatch-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "NODE_ENV=production USE_DUMMY_DATA=true node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "nodemailer": "^6.9.1",
    "youtube-dl-exec": "^2.4.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

# Create a README file with deployment instructions
cat > $DEPLOY_DIR/README.md << EOF
# QuickCatch Server Deployment

This is a deployment package for the QuickCatch server with pre-built React app.

## Deployment Instructions

1. Deploy to Railway:
   - Create a new project on Railway
   - Connect this repository or upload these files
   - Set environment variables:
     - NODE_ENV=production
     - USE_DUMMY_DATA=true

2. The server will automatically serve the React app from the 'public' directory.
EOF

echo -e "\n${GREEN}Deployment package created successfully in ./${DEPLOY_DIR}/${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Go to the deployment directory: cd ${DEPLOY_DIR}"
echo -e "2. Initialize a Git repository: git init"
echo -e "3. Add all files: git add ."
echo -e "4. Commit: git commit -m \"Initial deployment\""
echo -e "5. Connect with a new GitHub repository and push"
echo -e "6. Deploy to Railway from that repository"
echo -e "7. Set environment variables on Railway: NODE_ENV=production, USE_DUMMY_DATA=true"