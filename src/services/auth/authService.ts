import { User } from '../../types/user';

/**
 * Authentication service for handling user authentication
 */
export interface AuthService {
  /**
   * Sign up a new user
   */
  signUp(data: SignUpData): Promise<AuthResponse>;

  /**
   * Sign in a user with email and password
   */
  signIn(data: SignInData): Promise<AuthResponse>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Get the current user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Reset password
   */
  resetPassword(email: string): Promise<void>;

  /**
   * Update password
   */
  updatePassword(password: string): Promise<void>;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  country: string;
  gender?: string | null;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session?: any;
  error?: Error;
}

export type UserRole = 'patient' | 'mood_mentor' | 'admin';

/**
 * Placeholder authentication service implementation
 * This will be replaced with a real implementation later
 */
class MockAuthService implements AuthService {
  async signUp(data: SignUpData): Promise<AuthResponse> {
    console.log('Mock sign up:', data);
    // This is a placeholder that will be implemented later
    return {
      user: null,
      error: new Error('Not implemented')
    };
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    console.log('Mock sign in:', data);
    // This is a placeholder that will be implemented later
    return {
      user: null,
      error: new Error('Not implemented')
    };
  }

  async signOut(): Promise<void> {
    console.log('Mock sign out');
    // This is a placeholder that will be implemented later
  }

  async getCurrentUser(): Promise<User | null> {
    console.log('Mock get current user');
    // This is a placeholder that will be implemented later
    return null;
  }

  async resetPassword(email: string): Promise<void> {
    console.log('Mock reset password:', email);
    // This is a placeholder that will be implemented later
  }

  async updatePassword(password: string): Promise<void> {
    console.log('Mock update password');
    // This is a placeholder that will be implemented later
  }
}

export const authService = new MockAuthService(); 