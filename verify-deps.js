#!/usr/bin/env node

/**
 * Dependency verification script
 * This script will check that all required dependencies are installed 
 * and available on the PATH before starting the server.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define required dependencies
const dependencies = [
  {
    name: 'Node.js',
    command: 'node --version',
    required: true
  },
  {
    name: 'Python 3',
    command: 'python3 --version',
    required: true
  },
  {
    name: 'FFmpeg',
    command: 'ffmpeg -version',
    required: true
  },
  {
    name: 'youtube-dl or yt-dlp',
    command: 'yt-dlp --version || youtube-dl --version',
    required: true
  }
];

// Define required environment variables
const requiredEnvVars = [
  'PERPLEXITY_API_KEY'
];

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}=== Dependency Verification ====${colors.reset}\n`);

// Check environment variables
console.log(`${colors.cyan}Checking environment variables:${colors.reset}`);
let envMissing = false;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.log(`${colors.red}✘ ${envVar} is not set${colors.reset}`);
    envMissing = true;
  } else {
    const value = envVar.includes('KEY') || envVar.includes('SECRET') 
      ? `${process.env[envVar].substring(0, 3)}...` 
      : process.env[envVar];
    console.log(`${colors.green}✓ ${envVar} = ${value}${colors.reset}`);
  }
}

// Check PATH
console.log(`\n${colors.cyan}Current PATH:${colors.reset}`);
console.log(process.env.PATH.split(':').join('\n'));

// Check command line dependencies
console.log(`\n${colors.cyan}Checking dependencies:${colors.reset}`);
let dependenciesMissing = false;

for (const dep of dependencies) {
  try {
    const output = execSync(dep.command).toString().trim();
    console.log(`${colors.green}✓ ${dep.name}: ${output.split('\n')[0]}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✘ ${dep.name} not found${colors.reset}`);
    if (dep.required) {
      dependenciesMissing = true;
    }
  }
}

// Check Python packages
console.log(`\n${colors.cyan}Checking Python packages:${colors.reset}`);
try {
  const pipList = execSync('pip3 list').toString();
  const packages = {
    'python-dotenv': pipList.includes('python-dotenv'),
    'requests': pipList.includes('requests'),
    'Pillow': pipList.includes('Pillow')
  };
  
  for (const [pkg, installed] of Object.entries(packages)) {
    if (installed) {
      console.log(`${colors.green}✓ ${pkg}${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ ${pkg} not found${colors.reset}`);
      dependenciesMissing = true;
    }
  }
} catch (error) {
  console.log(`${colors.red}Failed to check Python packages: ${error.message}${colors.reset}`);
}

// Check file existence
console.log(`\n${colors.cyan}Checking files:${colors.reset}`);
const requiredFiles = [
  'server.js',
  'analyze_highlight.py',
  'requirements.txt'
];

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`${colors.green}✓ ${file}${colors.reset}`);
  } else {
    console.log(`${colors.red}✘ ${file} not found${colors.reset}`);
    dependenciesMissing = true;
  }
}

// Summary
console.log(`\n${colors.blue}=== Verification Summary ====${colors.reset}`);
if (dependenciesMissing || envMissing) {
  console.log(`${colors.red}Some required dependencies or environment variables are missing!${colors.reset}`);
  console.log(`${colors.yellow}Fix these issues before starting the server.${colors.reset}`);
  
  // Exit with error code if any required dependencies are missing
  process.exit(1);
} else {
  console.log(`${colors.green}All required dependencies found!${colors.reset}`);
  console.log(`${colors.green}System ready to run the NHL highlights analyzer.${colors.reset}`);
}