import { IApiService, ApiResponse, ApiRequestOptions } from './api.interface';

/**
 * Mock API Service
 * Implements the ApiService interface with mock functionality
 */
export class MockApiService implements IApiService {
  private baseUrl: string = '';
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  private authToken: string | null = null;
  
  /**
   * Make a GET request to an external API
   */
  async get<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, null, options);
  }
  
  /**
   * Make a POST request to an external API
   */
  async post<T>(url: string, data: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }
  
  /**
   * Make a PUT request to an external API
   */
  async put<T>(url: string, data: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }
  
  /**
   * Make a DELETE request to an external API
   */
  async delete<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, null, options);
  }
  
  /**
   * Set the base URL for API requests
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
  
  /**
   * Set a default header to be sent with all requests
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }
  
  /**
   * Clear all default headers
   */
  clearDefaultHeaders(): void {
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Set a token for authentication
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.setDefaultHeader('Authorization', `Bearer ${token}`);
  }
  
  /**
   * Clear the authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    const { Authorization, ...headers } = this.defaultHeaders;
    this.defaultHeaders = headers;
  }
  
  /**
   * Internal method to handle requests
   */
  private async request<T>(
    method: string, 
    url: string, 
    data: any = null, 
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    // Simulate network delay (200-800ms)
    const delay = Math.floor(Math.random() * 600) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Construct the full URL
    const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url;
    
    // Log the request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MockApiService] ${method} ${fullUrl}`);
      if (data) console.log('[MockApiService] Request body:', data);
    }
    
    // Simulate API functionality with mock responses
    // In a real app, this would be replaced with actual fetch/axios calls
    if (url.includes('/api/health')) {
      return {
        data: { status: 'ok', version: '1.0.0' } as unknown as T,
        error: null,
        status: 200
      };
    }
    
    // For demo purposes, return different responses based on the URL
    // In a real implementation, this would be replaced with actual API calls
    if (Math.random() > 0.9) {
      // Simulate occasional network errors (10% chance)
      return {
        data: null,
        error: 'Network error',
        status: 503
      };
    }
    
    // Default successful response
    return {
      data: { success: true } as unknown as T,
      error: null,
      status: 200
    };
  }
}

// Export a singleton instance
export const apiService: IApiService = new MockApiService(); 