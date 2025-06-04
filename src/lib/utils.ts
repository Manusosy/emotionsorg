import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
