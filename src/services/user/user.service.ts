import { IUserService, UserProfile } from './user.interface';

/**
 * Mock User Service
 * Implements the UserService interface with mock functionality
 */
export class MockUserService implements IUserService {
  // Mock user profiles for testing
  private mockProfiles: Record<string, UserProfile> = {
    '1': {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
      avatarUrl: 'https://ui-avatars.com/api/?name=Test+User',
      bio: 'Regular user for testing',
      location: 'Test City',
      createdAt: new Date(Date.now() - 3000000000).toISOString(),
      updatedAt: new Date(Date.now() - 1000000000).toISOString()
    },
    '2': {
      id: '2',
      email: 'mentor@example.com',
      name: 'Test Mentor',
      role: 'mood_mentor',
      avatarUrl: 'https://ui-avatars.com/api/?name=Test+Mentor',
      bio: 'Experienced mood mentor with a background in psychology',
      location: 'Mentor City',
      createdAt: new Date(Date.now() - 5000000000).toISOString(),
      updatedAt: new Date(Date.now() - 2000000000).toISOString()
    }
  };

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.mockProfiles[userId] || null;
  }
  
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const profile = this.mockProfiles[userId];
    
    if (!profile) {
      return null;
    }
    
    // Update profile
    this.mockProfiles[userId] = {
      ...profile,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return this.mockProfiles[userId];
  }
  
  async getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return userIds
      .map(id => this.mockProfiles[id])
      .filter(profile => profile !== undefined) as UserProfile[];
  }
  
  async searchUsers(
    query: string, 
    options?: { limit?: number, role?: string }
  ): Promise<UserProfile[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const limit = options?.limit || 10;
    
    // Filter profiles by search query and role
    const profiles = Object.values(this.mockProfiles)
      .filter(profile => {
        const matchesQuery = query === '' || 
          profile.name.toLowerCase().includes(query.toLowerCase()) ||
          profile.email.toLowerCase().includes(query.toLowerCase());
        
        const matchesRole = !options?.role || profile.role === options.role;
        
        return matchesQuery && matchesRole;
      })
      .slice(0, limit);
    
    return profiles;
  }
  
  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean, error: string | null }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Update the user profile with the new avatar URL
      if (this.mockProfiles[userId]) {
        this.mockProfiles[userId] = {
          ...this.mockProfiles[userId],
          avatarUrl: avatarUrl
        };
      }
      
      return {
        success: true,
        error: null
      };
    } catch (error) {
      console.error("Error updating avatar:", error);
      return {
        success: false,
        error: 'Failed to update avatar'
      };
    }
  }
  
  async deleteUser(userId: string): Promise<{ success: boolean, error: string | null }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    if (!this.mockProfiles[userId]) {
      return { success: false, error: 'User not found' };
    }
    
    delete this.mockProfiles[userId];
    
    return { success: true, error: null };
  }
}

// Export a singleton instance
export const userService: IUserService = new MockUserService(); 