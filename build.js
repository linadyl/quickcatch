const fs = require('fs');
const path = require('path');

// Paths
const clientBuildDir = path.resolve(__dirname, 'client/dist');
const serverPublicDir = path.resolve(__dirname, 'server/public');

// Recursive copy function using native fs
function copyFolderSync(from, to) {
  // Create the destination folder if it doesn't exist
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  // Read all items in the source folder
  const items = fs.readdirSync(from, { withFileTypes: true });

  // Copy each item to the destination
  for (const item of items) {
    const srcPath = path.join(from, item.name);
    const destPath = path.join(to, item.name);

    if (item.isDirectory()) {
      // Recursively copy subdirectories
      copyFolderSync(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Ensure the client is built
console.log('🔨 Building client application...');
try {
  // Check if client/dist exists
  if (!fs.existsSync(clientBuildDir)) {
    console.error('❌ Client build directory not found. Please run: cd client && npm run build');
    process.exit(1);
  }

  // Ensure server/public directory exists
  if (!fs.existsSync(serverPublicDir)) {
    console.log('📁 Creating server/public directory...');
    fs.mkdirSync(serverPublicDir, { recursive: true });
  }

  // Copy client build to server public directory
  console.log('📦 Copying client build to server/public...');
  copyFolderSync(clientBuildDir, serverPublicDir);
  
  console.log('✅ Build process completed successfully!');
} catch (err) {
  console.error('❌ Error during build process:', err);
  process.exit(1);
}