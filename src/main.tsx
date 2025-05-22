import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/App.css';
import 'tailwindcss/tailwind.css';
import App from './App';

// Check for environment variables
const checkEnvironment = () => {
  // Define environment variable keys to check
  const envKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  
  // Check each source for the variables
  const missingVars = envKeys.filter(key => {
    // Check both sources
    const fromWindow = window.ENV_CONFIG?.[key];
    const fromVite = import.meta.env[key];
    
    // Log source for debugging
    if (fromWindow) console.log(`${key} found in window.ENV_CONFIG`);
    else if (fromVite) console.log(`${key} found in import.meta.env`);
    
    // Return true if the variable is missing from both sources
    return !fromWindow && !fromVite;
  });
  
  if (missingVars.length > 0) {
    console.warn(
      `⚠️ Missing environment variables: ${missingVars.join(', ')}.\n` +
      `Please check that your environment is properly configured.`
    );
  } else {
    console.log('✅ Environment variables loaded successfully.');
  }
};

// Start application with environment checks
const startApp = () => {
  checkEnvironment();
  
  // Simple root rendering
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Initialize the app
startApp();
