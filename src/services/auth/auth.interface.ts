/**
 * Authentication Service Interface
 * Defines the contract for authentication operations
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'patient' | 'admin' | 'mood_mentor';
  avatarUrl?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    country?: string;
    gender?: string;
    [key: string]: any;
  };
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
  session?: any;
}

export interface IAuthService {
  /**
   * Sign in a user with email and password
   */
  signIn(credentials: AuthCredentials): Promise<AuthResponse>;
  
  /**
   * Sign up a new user
   */
  signUp(credentials: AuthCredentials, userData?: Partial<User>): Promise<AuthResponse>;
  
  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;
  
  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<User | null>;
  
  /**
   * Reset a user's password
   */
  resetPassword(email: string): Promise<{ error: string | null }>;
  
  /**
   * Update a user's password with a reset token
   */
  updatePassword(password: string, token?: string): Promise<{ error: string | null }>;
  
  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void;

  /**
   * Update user data
   */
  updateUser(data: Partial<User>): Promise<{ user: User | null; error: string | null }>;
} 