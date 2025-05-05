/**
 * API Service Interface
 * Defines the contract for external API calls
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  cache?: boolean;
}

export interface IApiService {
  /**
   * Make a GET request to an external API
   */
  get<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  
  /**
   * Make a POST request to an external API
   */
  post<T>(url: string, data: any, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  
  /**
   * Make a PUT request to an external API
   */
  put<T>(url: string, data: any, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  
  /**
   * Make a DELETE request to an external API
   */
  delete<T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  
  /**
   * Set the base URL for API requests
   */
  setBaseUrl(url: string): void;
  
  /**
   * Set a default header to be sent with all requests
   */
  setDefaultHeader(key: string, value: string): void;
  
  /**
   * Clear all default headers
   */
  clearDefaultHeaders(): void;
  
  /**
   * Set a token for authentication
   */
  setAuthToken(token: string): void;
  
  /**
   * Clear the authentication token
   */
  clearAuthToken(): void;
} 