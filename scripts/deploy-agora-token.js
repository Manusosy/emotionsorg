/**
 * Script to deploy the Agora token function to Supabase
 * 
 * Usage:
 * node scripts/deploy-agora-token.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log with colors
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Execute command and return output
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    log(`Error executing command: ${command}`, colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  try {
    exec('supabase --version');
    log('✅ Supabase CLI is installed', colors.green);
  } catch (error) {
    log('❌ Supabase CLI is not installed. Please install it first:', colors.red);
    log('npm install -g supabase', colors.yellow);
    process.exit(1);
  }
}

// Deploy the function
function deployFunction() {
  log('📤 Deploying Agora token function to Supabase...', colors.cyan);
  
  try {
    // Deploy the function
    const output = exec('supabase functions deploy agora-token');
    log(output);
    log('✅ Function deployed successfully!', colors.green);
    
    // Check if environment variables are set
    log('🔍 Checking for environment variables...', colors.cyan);
    const secrets = exec('supabase secrets list');
    
    if (!secrets.includes('AGORA_APP_ID') || !secrets.includes('AGORA_APP_CERTIFICATE')) {
      log('⚠️  Agora environment variables not found. Setting them up...', colors.yellow);
      
      // Get values from config.toml
      const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
      if (fs.existsSync(configPath)) {
        const config = fs.readFileSync(configPath, 'utf8');
        
        // Extract values using regex
        const appIdMatch = config.match(/AGORA_APP_ID\s*=\s*"([^"]+)"/);
        const appCertMatch = config.match(/AGORA_APP_CERTIFICATE\s*=\s*"([^"]+)"/);
        
        if (appIdMatch && appCertMatch) {
          const appId = appIdMatch[1];
          const appCert = appCertMatch[1];
          
          // Set secrets
          exec(`supabase secrets set AGORA_APP_ID=${appId} AGORA_APP_CERTIFICATE=${appCert}`);
          log('✅ Environment variables set successfully!', colors.green);
        } else {
          log('❌ Could not extract Agora credentials from config.toml', colors.red);
          log('Please set them manually:', colors.yellow);
          log('supabase secrets set AGORA_APP_ID=your_app_id AGORA_APP_CERTIFICATE=your_app_certificate', colors.yellow);
        }
      } else {
        log('❌ config.toml not found', colors.red);
        log('Please set environment variables manually:', colors.yellow);
        log('supabase secrets set AGORA_APP_ID=your_app_id AGORA_APP_CERTIFICATE=your_app_certificate', colors.yellow);
      }
    } else {
      log('✅ Environment variables already set', colors.green);
    }
    
    log('\n🎉 Agora token function is ready to use!', colors.green);
    log('You can test it with:', colors.cyan);
    log('curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/agora-token" -H "Content-Type: application/json" -d \'{"channelName":"test","uid":"123456"}\'', colors.yellow);
  } catch (error) {
    log(`❌ Error deploying function: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Main function
function main() {
  log('🚀 Deploying Agora token function...', colors.magenta);
  checkSupabaseCLI();
  deployFunction();
}

// Run the script
main(); 