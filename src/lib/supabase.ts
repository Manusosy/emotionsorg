import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Supabase client for interacting with the Supabase database
 * Uses environment variables for configuration
 */

// Declare window with ENV_CONFIG type for TypeScript
declare global {
  interface Window {
    ENV_CONFIG?: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_SUPABASE_SERVICE_KEY: string;
    }
  }
}

// Try to get credentials from multiple sources for better reliability
const getEnvValue = (key: string, silent: boolean = false): string => {
  // Try window.ENV_CONFIG first (runtime config)
  if (window.ENV_CONFIG?.[key]) {
    console.log(`Using ${key} from window.ENV_CONFIG`);
    return window.ENV_CONFIG[key];
  }
  
  // Then try import.meta.env (build-time config)
  if (import.meta.env[key]) {
    console.log(`Using ${key} from import.meta.env`);
    return import.meta.env[key];
  }
  
  if (!silent) {
    console.error(`${key} not found in any config source`);
  }
  return '';
};

// Get Supabase URL and key from environment variables
const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are not set properly');
}

// We'll track activity to keep sessions alive
const SESSION_TIMEOUT_MINUTES = 60; // User is considered inactive after this time
const SESSION_REFRESH_MINUTES = 30; // Refresh token if active within this window
let lastActivity = new Date();

// Set up activity tracking
function setupActivityTracking() {
  // Update lastActivity on user interactions
  const updateActivity = () => {
    lastActivity = new Date();
    const storedSession = localStorage.getItem('app_session_last_active');
    if (storedSession) {
      localStorage.setItem('app_session_last_active', lastActivity.toISOString());
    }
  };

  // Track user activity
  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('click', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('touchstart', updateActivity);
  window.addEventListener('focus', updateActivity);

  // Check session periodically
  setInterval(() => {
    const activeSessionStr = localStorage.getItem('app_session_active');
    const activeSession = activeSessionStr ? JSON.parse(activeSessionStr) : null;
    
    if (activeSession && activeSession.refreshToken) {
      const lastActiveStr = localStorage.getItem('app_session_last_active');
      if (lastActiveStr) {
        const lastActiveTime = new Date(lastActiveStr);
        const currentTime = new Date();
        const minutesSinceLastActivity = (currentTime.getTime() - lastActiveTime.getTime()) / (1000 * 60);
        
        // If user is still active but approaching refresh time, refresh the token
        if (minutesSinceLastActivity < SESSION_TIMEOUT_MINUTES && 
            minutesSinceLastActivity > SESSION_REFRESH_MINUTES) {
          console.log('Proactively refreshing session token due to continued activity');
          supabase.auth.refreshSession();
        }
      }
    }
  }, 60000); // Check every minute
}

// Initialize activity tracking once the DOM is loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupActivityTracking);
  } else {
    setupActivityTracking();
  }
}

// Create and export the Supabase client
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            // Use a unified approach to get session data
            const value = localStorage.getItem(key);
            if (value) {
              try {
                // Keep track of fetch for debugging and refresh logic
                if (key.includes('supabase.auth.token')) {
                  console.log('Retrieved auth token from storage');
                  
                  // Check if we have our custom app session tracking
                  const appSession = localStorage.getItem('app_session_active');
                  if (!appSession) {
                    // Initialize our session tracking
                    localStorage.setItem('app_session_active', JSON.stringify({
                      active: true,
                      created: new Date().toISOString(),
                      refreshToken: true
                    }));
                    localStorage.setItem('app_session_last_active', new Date().toISOString());
                  }
                }
                return JSON.parse(value);
              } catch (parseError) {
                console.error('Error parsing localStorage value:', parseError);
                // Don't remove on parse error, might be temporary
                return null;
              }
            }
            return null;
          } catch (error) {
            console.error('Error retrieving auth session:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            const valueStr = JSON.stringify(value);
            localStorage.setItem(key, valueStr);
            
            // Set session metadata
            if (key.includes('supabase.auth.token')) {
              console.log('Storing new auth token');
              localStorage.setItem('app_session_active', JSON.stringify({
                active: true,
                created: new Date().toISOString(),
                refreshToken: true
              }));
              localStorage.setItem('app_session_last_active', new Date().toISOString());
            }
          } catch (error) {
            console.error('Error storing auth session:', error);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
            
            // Clean up our custom session tracking
            if (key.includes('supabase.auth.token')) {
              console.log('Removing auth session data');
              localStorage.removeItem('app_session_active');
              localStorage.removeItem('app_session_last_active');
            }
          } catch (error) {
            console.error('Error removing auth session:', error);
          }
        }
      },
      flowType: 'implicit',
      debug: import.meta.env.DEV
    },
    global: {
      headers: {
        'X-Client-Info': 'emotions-app'
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

/**
 * Helper function to check if Supabase is properly configured
 * This can be used to detect if we should use mock services or Supabase
 */
export function isSupabaseConfigured(): boolean {
  // Check if credentials are available from any source
  return Boolean(
    (window.ENV_CONFIG?.VITE_SUPABASE_URL && window.ENV_CONFIG?.VITE_SUPABASE_ANON_KEY) ||
    (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
}

/**
 * Helper for working with Supabase tables
 * This provides better typing since Supabase expects string schema names
 */
export const tables = {
  profiles: 'profiles',
  mood_entries: 'mood_entries',
  journal_entries: 'journal_entries',
  stress_assessments: 'stress_assessments',
  resources: 'resources',
  notifications: 'notifications',
  appointments: 'appointments',
  messages: 'messages',
  help_groups: 'help_groups',
  favorites: 'favorites',
}; 