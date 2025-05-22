import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ESM standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the temp-env.txt file
const tempEnvPath = path.join(__dirname, '../temp-env.txt');

// Function to parse the temp-env.txt file and extract environment variables
function parseEnvFile() {
  try {
    // Read the temp-env.txt file
    const envContent = fs.readFileSync(tempEnvPath, 'utf8');
    
    // Parse the file content to extract environment variables
    const envVars = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
      }
      
      // Extract key-value pairs
      const match = line.match(/^(?:export\s+)?([\w.-]+)[\s=]+"?([^"]*)"?$/);
      if (match) {
        const [, key, value] = match;
        envVars[key] = value;
        
        // Set the environment variable
        process.env[key] = value;
        console.log(`Set environment variable: ${key}`);
      }
    }
    
    return envVars;
  } catch (error) {
    console.error('Error parsing temp-env.txt:', error);
    return {};
  }
}

// If this script is run directly, execute the parseEnvFile function
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Setting up environment variables from temp-env.txt...');
  const envVars = parseEnvFile();
  console.log(`Set ${Object.keys(envVars).length} environment variables`);
}

// Export the function for use in other modules
export { parseEnvFile }; 