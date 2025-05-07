import { IAuthService, User, AuthCredentials, AuthResponse } from './auth.interface';

/**
 * Mock Auth Service
 * Implements the AuthService interface with mock functionality
 */
export class MockAuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  
  // Mock users for testing
  private mockUsers: Record<string, User & { password: string }> = {
    'user@example.com': {
      id: '1',
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'patient',
      avatarUrl: 'https://ui-avatars.com/api/?name=Test+User'
    },
    'mentor@example.com': {
      id: '2',
      email: 'mentor@example.com',
      password: 'password123',
      name: 'Test Mentor',
      role: 'mood_mentor',
      avatarUrl: 'https://ui-avatars.com/api/?name=Test+Mentor'
    }
  };

  constructor() {
    // Check if there's a stored user in localStorage
    const storedUser = localStorage.getItem('mockAuthUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.notifyListeners();
      } catch (e) {
        localStorage.removeItem('mockAuthUser');
      }
    }
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.mockUsers[credentials.email];
    
    if (!user || user.password !== credentials.password) {
      return { user: null, error: 'Invalid credentials' };
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    this.currentUser = userWithoutPassword;
    
    // Store user in localStorage for persistence
    localStorage.setItem('mockAuthUser', JSON.stringify(userWithoutPassword));
    
    // Notify listeners of auth change
    this.notifyListeners();
    
    return { user: userWithoutPassword, error: null, session: { token: 'mock-jwt-token' } };
  }
  
  async signUp(credentials: AuthCredentials, userData?: Partial<User>): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    if (this.mockUsers[credentials.email]) {
      return { user: null, error: 'User already exists' };
    }
    
    const newUser: User & { password: string } = {
      id: Math.random().toString(36).substring(2, 15),
      email: credentials.email,
      password: credentials.password,
      name: userData?.name || credentials.email.split('@')[0],
      role: userData?.role || 'patient',
      avatarUrl: userData?.avatarUrl || `https://ui-avatars.com/api/?name=${credentials.email.split('@')[0]}`
    };
    
    // Add to mock users
    this.mockUsers[credentials.email] = newUser;
    
    // Set as current user
    const { password, ...userWithoutPassword } = newUser;
    this.currentUser = userWithoutPassword;
    
    // Store in localStorage
    localStorage.setItem('mockAuthUser', JSON.stringify(userWithoutPassword));
    
    // Notify listeners
    this.notifyListeners();
    
    return { user: userWithoutPassword, error: null, session: { token: 'mock-jwt-token' } };
  }
  
  async signOut(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    this.currentUser = null;
    localStorage.removeItem('mockAuthUser');
    
    // Notify listeners
    this.notifyListeners();
  }
  
  async getCurrentUser(): Promise<User | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.currentUser;
  }
  
  async resetPassword(email: string): Promise<{ error: string | null }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!this.mockUsers[email]) {
      return { error: 'User not found' };
    }
    
    console.log(`Password reset requested for ${email}`);
    return { error: null };
  }
  
  async updatePassword(password: string, token?: string): Promise<{ error: string | null }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!this.currentUser) {
      return { error: 'No authenticated user' };
    }
    
    // Update password in mock users
    const userEmail = this.currentUser.email;
    if (this.mockUsers[userEmail]) {
      this.mockUsers[userEmail].password = password;
      return { error: null };
    }
    
    return { error: 'User not found' };
  }
  
  async updateUser(data: Partial<User>): Promise<{ user: User | null; error: string | null }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!this.currentUser) {
      return { user: null, error: 'No authenticated user' };
    }
    
    // Update user data
    const updatedUser = { ...this.currentUser, ...data };
    this.currentUser = updatedUser;
    
    // Update in mock users if it exists
    const userEmail = updatedUser.email;
    if (this.mockUsers[userEmail]) {
      const { password } = this.mockUsers[userEmail];
      this.mockUsers[userEmail] = { ...updatedUser, password };
    }
    
    // Store updated user in localStorage
    localStorage.setItem('mockAuthUser', JSON.stringify(updatedUser));
    
    // Notify listeners
    this.notifyListeners();
    
    return { user: updatedUser, error: null };
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Call immediately with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }
}

// Export a singleton instance
export const authService: IAuthService = new MockAuthService(); 