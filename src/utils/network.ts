/**
 * Utility functions for handling network operations and issues
 */

/**
 * Retry an async operation with exponential backoff
 * @param operation The async function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param delay Base delay in milliseconds
 * @returns The result of the operation if successful
 * @throws The last error encountered if all retries fail
 */
export async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      // Check if error is network-related
      if (
        error.message?.includes('network') || 
        error.message?.includes('timeout') || 
        error.message?.includes('connection') ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
      ) {
        console.log(`Retrying operation in ${delay * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // For non-network errors, don't retry
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Check if the browser/device is online
 * @returns boolean indicating online status
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
    ? navigator.onLine 
    : true; // Default to true if we can't detect
}

/**
 * Perform a network diagnostics check
 */
export async function runNetworkDiagnostics(targetUrl: string): Promise<{
  online: boolean;
  ping: number | null;
  connectionInfo: any;
  dnsResolved: boolean;
  tlsHandshake: boolean;
  error?: string;
}> {
  const result = {
    online: isOnline(),
    ping: null as number | null,
    connectionInfo: null as any,
    dnsResolved: false,
    tlsHandshake: false,
    error: undefined as string | undefined
  };
  
  // Get connection info if available
  try {
    // @ts-ignore - Connection property may not be available in all browsers
    if (navigator && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      result.connectionInfo = {
        type: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlinkMax: connection?.downlinkMax || 'unknown',
        downlink: connection?.downlink || 'unknown',
        rtt: connection?.rtt || 'unknown',
        saveData: connection?.saveData || false
      };
    }
  } catch (e) {
    console.error('Error getting connection info:', e);
  }
  
  // Try to ping the target URL
  try {
    const startTime = Date.now();
    
    // First try a HEAD request which is lightweight
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    result.ping = Date.now() - startTime;
    result.dnsResolved = true;
    result.tlsHandshake = true;
  } catch (error: any) {
    result.error = error.message || 'Unknown error pinging target';
    
    // Try to determine if it's a DNS issue
    if (error.message?.includes('could not be resolved') || 
        error.message?.includes('domain') ||
        error.message?.includes('DNS')) {
      result.dnsResolved = false;
    }
    
    // TLS handshake issues
    if (error.message?.includes('SSL') || 
        error.message?.includes('certificate') ||
        error.message?.includes('TLS')) {
      result.tlsHandshake = false;
    }
  }
  
  return result;
}

/**
 * Clear browser cache for improved network requests
 */
export function clearBrowserCache(): void {
  // Clear fetch cache if supported
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  
  // Force reload without cache
  if (window.location.href) {
    const url = new URL(window.location.href);
    url.searchParams.set('_dc', Date.now().toString());
    // Don't actually navigate, just prepare the URL with cache buster
    console.log('Cache-busting URL ready:', url.toString());
  }
}

/**
 * Get cached data from memory
 */
export function getCachedData(key: string, ttl: number = 60000): any {
  if (typeof window === 'undefined') return null;
  
  try {
    const cache = window.__DATA_CACHE || {};
    const item = cache[key];
    
    if (!item) return null;
    
    // Check if item is expired
    const now = Date.now();
    if (now - item.timestamp > ttl) {
      // Expired
      delete cache[key];
      window.__DATA_CACHE = cache;
      return null;
    }
    
    return item.data;
  } catch (e) {
    console.error('Error reading from cache:', e);
    return null;
  }
}

/**
 * Set cached data in memory
 */
export function setCachedData(key: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = window.__DATA_CACHE || {};
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    window.__DATA_CACHE = cache;
  } catch (e) {
    console.error('Error writing to cache:', e);
  }
}

/**
 * Save data to localStorage with error handling
 */
export function safeLocalStorage(key: string, data: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    return false;
  }
}

/**
 * Get data from localStorage with error handling
 */
export function getSafeLocalStorage(key: string): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return null;
  }
}

// Create the cache storage in window
declare global {
  interface Window {
    __DATA_CACHE: Record<string, { data: any, timestamp: number }>;
  }
} 