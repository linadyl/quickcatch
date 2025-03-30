const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📥 Setting up youtube-dl/yt-dlp...');

// Create bin directory if it doesn't exist
const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
  console.log(`✅ Created bin directory at ${binDir}`);
}

// Function to download yt-dlp
function downloadYtDlp() {
  const ytdlpPath = path.join(binDir, 'yt-dlp');
  
  try {
    console.log('📥 Downloading yt-dlp...');
    
    // Check if we're on Windows
    const isWindows = process.platform === 'win32';
    const downloadUrl = isWindows
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    
    const downloadCommand = isWindows
      ? `curl -L ${downloadUrl} -o "${ytdlpPath}.exe"`
      : `curl -L ${downloadUrl} -o "${ytdlpPath}" && chmod +x "${ytdlpPath}"`;
    
    execSync(downloadCommand, { stdio: 'inherit' });
    
    // Verify it's working
    const ytdlpVersion = execSync(`"${ytdlpPath}" --version`).toString().trim();
    console.log(`✅ yt-dlp installed successfully! Version: ${ytdlpVersion}`);
    
    // Create a symbolic link as youtube-dl for compatibility
    const youtubeDlPath = path.join(binDir, 'youtube-dl');
    
    if (isWindows) {
      if (!fs.existsSync(`${youtubeDlPath}.exe`)) {
        fs.copyFileSync(`${ytdlpPath}.exe`, `${youtubeDlPath}.exe`);
      }
    } else {
      execSync(`ln -sf "${ytdlpPath}" "${youtubeDlPath}"`);
    }
    
    console.log(`✅ Linked yt-dlp as youtube-dl for compatibility`);
    return true;
  } catch (error) {
    console.error(`❌ Error installing yt-dlp: ${error.message}`);
    return false;
  }
}

// Function to set environment variable pointing to our bin directory
function updatePathEnvironment() {
  // For runtime environment
  process.env.PATH = `${binDir}:${process.env.PATH}`;
  console.log(`✅ Added ${binDir} to PATH for this process`);
  
  // Try to update package.json for npm scripts
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Make sure we have scripts section
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      // Update start script to include PATH
      const currentStart = packageJson.scripts.start || 'node server.js';
      packageJson.scripts.start = `PATH="${binDir}:$PATH" ${currentStart}`;
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Updated package.json start script to include PATH');
    }
  } catch (err) {
    console.warn(`⚠️ Could not update package.json: ${err.message}`);
  }
}

// Main execution
(async function main() {
  try {
    // First check if youtube-dl or yt-dlp is already installed system-wide
    try {
      const systemYtdl = execSync('which youtube-dl || which yt-dlp').toString().trim();
      if (systemYtdl) {
        const version = execSync(`${systemYtdl} --version`).toString().trim();
        console.log(`✅ Found system-wide installation: ${systemYtdl} (${version})`);
        return;
      }
    } catch (err) {
      console.log('⚠️ No system-wide youtube-dl/yt-dlp detected, installing locally...');
    }
    
    const success = downloadYtDlp();
    
    if (success) {
      updatePathEnvironment();
      console.log('✅ Setup completed successfully!');
    } else {
      console.error('❌ Setup failed. Please install youtube-dl or yt-dlp manually.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();