import { User, UserProfile, MoodMentorProfile } from '../../types/user';

export interface UserService {
  /**
   * Get user profile by user ID
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;

  /**
   * Get mood mentor profile by user ID
   */
  getMoodMentorProfile(userId: string): Promise<MoodMentorProfile | null>;

  /**
   * Get all mood mentors
   */
  getAllMoodMentors(limit?: number): Promise<MoodMentorProfile[]>;

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null>;

  /**
   * Update mood mentor profile
   */
  updateMoodMentorProfile(userId: string, data: Partial<MoodMentorProfile>): Promise<MoodMentorProfile | null>;
}

/**
 * Mock implementation of the user service
 */
class MockUserService implements UserService {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('Mock get user profile:', userId);
    // Return placeholder data
    return {
      id: 'mock-user-id',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '+1234567890',
      date_of_birth: '1990-01-01',
      country: 'US',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      pincode: '10001',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: new Date().toISOString(),
    };
  }

  async getMoodMentorProfile(userId: string): Promise<MoodMentorProfile | null> {
    console.log('Mock get mood mentor profile:', userId);
    // Return placeholder data
    return {
      id: 'mock-mentor-id',
      user_id: userId,
      full_name: 'Dr. Jane Smith',
      email: 'jane.smith@example.com',
      phone_number: '+1234567890',
      bio: 'Experienced mental health professional',
      specialty: 'Anxiety & Depression',
      hourly_rate: 100,
      availability_status: 'Available',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isFree: true,
      languages: ['English', 'Spanish'],
      education: 'PhD Psychology',
      experience: '10+ years',
      session_duration: '45 Min',
      rating: 4.9,
    };
  }

  async getAllMoodMentors(limit = 10): Promise<MoodMentorProfile[]> {
    console.log('Mock get all mood mentors, limit:', limit);
    // Return placeholder data
    return [
      {
        id: 'mock-mentor-1',
        user_id: 'mock-user-1',
        full_name: 'Dr. Jane Smith',
        email: 'jane.smith@example.com',
        phone_number: '+1234567890',
        bio: 'Experienced mental health professional',
        specialty: 'Anxiety & Depression',
        hourly_rate: 100,
        availability_status: 'Available',
        avatar_url: 'https://example.com/avatar1.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isFree: true,
        languages: ['English', 'Spanish'],
        education: 'PhD Psychology',
        experience: '10+ years',
        session_duration: '45 Min',
        rating: 4.9,
      },
      {
        id: 'mock-mentor-2',
        user_id: 'mock-user-2',
        full_name: 'Dr. John Williams',
        email: 'john.williams@example.com',
        phone_number: '+1234567890',
        bio: 'Specialized in trauma and PTSD',
        specialty: 'Trauma & PTSD',
        hourly_rate: 120,
        availability_status: 'Available',
        avatar_url: 'https://example.com/avatar2.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isFree: false,
        languages: ['English', 'French'],
        education: 'MD Psychiatry',
        experience: '15+ years',
        session_duration: '60 Min',
        rating: 4.8,
      },
    ];
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    console.log('Mock update user profile:', userId, data);
    // Return placeholder data with updated fields
    return {
      id: 'mock-user-id',
      first_name: data.first_name || 'John',
      last_name: data.last_name || 'Doe',
      email: data.email || 'john.doe@example.com',
      phone_number: data.phone_number || '+1234567890',
      date_of_birth: data.date_of_birth || '1990-01-01',
      country: data.country || 'US',
      address: data.address || '123 Main St',
      city: data.city || 'New York',
      state: data.state || 'NY',
      pincode: data.pincode || '10001',
      avatar_url: data.avatar_url || 'https://example.com/avatar.jpg',
      created_at: new Date().toISOString(),
    };
  }

  async updateMoodMentorProfile(userId: string, data: Partial<MoodMentorProfile>): Promise<MoodMentorProfile | null> {
    console.log('Mock update mood mentor profile:', userId, data);
    // Return placeholder data with updated fields
    return {
      id: 'mock-mentor-id',
      user_id: userId,
      full_name: data.full_name || 'Dr. Jane Smith',
      email: data.email || 'jane.smith@example.com',
      phone_number: data.phone_number || '+1234567890',
      bio: data.bio || 'Experienced mental health professional',
      specialty: data.specialty || 'Anxiety & Depression',
      hourly_rate: data.hourly_rate || 100,
      availability_status: data.availability_status || 'Available',
      avatar_url: data.avatar_url || 'https://example.com/avatar.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isFree: data.isFree !== undefined ? data.isFree : true,
      languages: data.languages || ['English', 'Spanish'],
      education: data.education || 'PhD Psychology',
      experience: data.experience || '10+ years',
      session_duration: data.session_duration || '45 Min',
      rating: data.rating || 4.9,
    };
  }
}

export const userService = new MockUserService(); 