import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get a value from environment variables with fallback
 * @param key - Environment variable key
 * @param fallback - Fallback value if not found
 * @returns The environment variable value or fallback
 */
export function getEnvValue(key: string, fallback: string = ''): string {
  // Try window.ENV_CONFIG first (runtime config)
  if (window.ENV_CONFIG?.[key]) {
    return window.ENV_CONFIG[key];
  }
  
  // Then try import.meta.env (build-time config)
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Return fallback if not found
  return fallback;
}

/**
 * Format a date string into a human-readable format
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Format options
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', options);
}
