import { 
  IMoodMentorService, 
  MoodMentor, 
  MoodMentorReview, 
  MoodMentorSettings,
  MoodMentorStats,
  AvailabilitySlot
} from './mood-mentor.interface';

/**
 * Mock Mood Mentor Service
 * Implements the MoodMentorService interface with mock functionality
 */
export class MockMoodMentorService implements IMoodMentorService {
  // Mock data
  private moodMentors: Record<string, MoodMentor> = {};
  private reviews: Record<string, MoodMentorReview[]> = {};
  private settings: Record<string, MoodMentorSettings> = {};
  
  constructor() {
    // Initialize with some example data for testing
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Create some mock mentors
    const mockMentors: Partial<MoodMentor>[] = [
      {
        userId: '2',
        name: 'Dr. Sarah Johnson',
        title: 'Clinical Psychologist',
        specialties: ['anxiety', 'depression', 'stress management'],
        bio: 'Dr. Johnson has over 15 years of experience helping patients overcome anxiety and depression. She specializes in cognitive-behavioral therapy and mindfulness techniques.',
        experience: 15,
        rating: 4.9,
        reviewCount: 128,
        hourlyRate: 150,
        avatarUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability()
      },
      {
        userId: '3',
        name: 'Michael Chen, LMFT',
        title: 'Licensed Marriage and Family Therapist',
        specialties: ['relationships', 'trauma', 'grief'],
        bio: 'Michael specializes in helping couples and individuals navigate relationship challenges, trauma recovery, and grief. His approach combines narrative therapy with evidence-based techniques.',
        experience: 8,
        rating: 4.7,
        reviewCount: 84,
        hourlyRate: 120,
        avatarUrl: 'https://images.unsplash.com/photo-1542190643-37b5ef8dcef7?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability()
      },
      {
        userId: '4',
        name: 'Dr. Amara Patel',
        title: 'Psychiatrist',
        specialties: ['anxiety', 'depression', 'medication management'],
        bio: 'Dr. Patel combines medication management with holistic approaches to mental health. She focuses on treating anxiety and depression with an emphasis on overall wellbeing.',
        experience: 12,
        rating: 4.8,
        reviewCount: 96,
        hourlyRate: 180,
        avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability()
      },
      {
        userId: '5',
        name: 'Robert Williams, LPC',
        title: 'Licensed Professional Counselor',
        specialties: ['addiction', 'stress management', 'depression'],
        bio: 'Robert specializes in helping clients overcome addiction and manage stress. He uses a combination of motivational interviewing and cognitive behavioral techniques.',
        experience: 6,
        rating: 4.6,
        reviewCount: 62,
        hourlyRate: 110,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability()
      }
    ];
    
    for (const mentor of mockMentors) {
      const id = mentor.userId || `mentor-${Math.random().toString(36).substring(2, 15)}`;
      this.moodMentors[id] = {
        id,
        userId: mentor.userId || id,
        name: mentor.name || 'Unknown Mentor',
        title: mentor.title || 'Therapist',
        specialties: mentor.specialties || [],
        bio: mentor.bio || '',
        experience: mentor.experience || 0,
        rating: mentor.rating || 0,
        reviewCount: mentor.reviewCount || 0,
        hourlyRate: mentor.hourlyRate || 0,
        availability: mentor.availability || [],
        avatarUrl: mentor.avatarUrl,
        profileCompleted: mentor.profileCompleted || false
      };
      
      // Create mock reviews for each mentor
      this.generateMockReviews(id, mentor.reviewCount || 0);
      
      // Create mock settings for each mentor
      this.settings[id] = {
        id: `settings-${id}`,
        mentorId: id,
        notifications: {
          email: true,
          app: true,
          sms: false
        },
        availability: {
          autoConfirm: true,
          bufferTime: 15
        },
        payment: {
          hourlyRate: mentor.hourlyRate || 100,
          acceptsInsurance: Math.random() > 0.5,
          insuranceProviders: ['Aetna', 'BlueCross', 'United Healthcare']
        },
        preferences: {
          sessionReminders: true,
          videoQuality: 'high',
          theme: 'light'
        }
      };
    }
  }
  
  private generateAvailability(): AvailabilitySlot[] {
    const days: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = 
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const availability: AvailabilitySlot[] = [];
    
    // Generate random availability for each day
    for (const day of days) {
      // 70% chance of being available on this day
      if (Math.random() < 0.7) {
        // Random morning slot
        if (Math.random() < 0.6) {
          availability.push({
            day,
            startTime: '09:00',
            endTime: '12:00'
          });
        }
        
        // Random afternoon slot
        if (Math.random() < 0.6) {
          availability.push({
            day,
            startTime: '13:00',
            endTime: '17:00'
          });
        }
        
        // Random evening slot (less common)
        if (Math.random() < 0.3) {
          availability.push({
            day,
            startTime: '18:00',
            endTime: '20:00'
          });
        }
      }
    }
    
    return availability;
  }
  
  private generateMockReviews(mentorId: string, count: number) {
    const reviews: MoodMentorReview[] = [];
    
    const reviewComments = [
      'Very helpful and understanding. Highly recommend!',
      'Listens well and provides practical advice for managing anxiety.',
      'Helped me understand my depression and develop coping strategies.',
      'Professional, empathetic, and insightful.',
      'Great techniques for stress management. I\'ve seen real improvement.',
      'Very knowledgeable about trauma recovery.',
      'Excellent therapist who helped me through a difficult time.',
      'Patient and supportive. Creates a safe space for discussion.',
      'Helped me understand patterns in my relationships.',
      'Practical advice that I could apply immediately.',
      'Truly cares about helping clients improve.',
      'Explains concepts clearly and provides useful resources.',
      'I\'ve made significant progress since starting sessions.'
    ];
    
    const userNames = [
      'Anonymous Client',
      'J.D.',
      'M.K.',
      'Client2023',
      'HappyClient',
      'GratefulPatient',
      'NewStart',
      'HealingJourney',
      'TherapyWorks',
      'BetterNow',
      'C.T.',
      'R.M.',
      'A.J.'
    ];
    
    for (let i = 0; i < count; i++) {
      // Generate a random date within the last year
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      
      const review: MoodMentorReview = {
        id: `review-${mentorId}-${i}`,
        mentorId,
        userId: `user-${Math.random().toString(36).substring(2, 15)}`,
        userName: userNames[Math.floor(Math.random() * userNames.length)],
        rating: 3 + Math.random() * 2, // 3-5 stars
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        createdAt: date.toISOString()
      };
      
      reviews.push(review);
    }
    
    // Sort reviews by date (newest first)
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    this.reviews[mentorId] = reviews;
  }
  
  async getMoodMentors(options?: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    limit?: number;
    offset?: number;
  }): Promise<MoodMentor[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    let mentors = Object.values(this.moodMentors)
      .filter(mentor => {
        // Filter by specialties if specified
        if (options?.specialties && options.specialties.length > 0) {
          if (!mentor.specialties.some(specialty => options.specialties?.includes(specialty))) {
            return false;
          }
        }
        
        // Filter by minimum rating if specified
        if (options?.minRating !== undefined && mentor.rating < options.minRating) {
          return false;
        }
        
        // Filter by maximum hourly rate if specified
        if (options?.maxHourlyRate !== undefined && mentor.hourlyRate > options.maxHourlyRate) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b.rating - a.rating) // Sort by rating (highest first)
      .slice(offset, offset + limit);
    
    return mentors;
  }
  
  async getMoodMentorById(id: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mentor = this.moodMentors[id];
    
    if (!mentor) {
      return {
        success: false,
        data: null,
        error: 'Mood mentor not found'
      };
    }
    
    return {
      success: true,
      data: mentor,
      error: null
    };
  }
  
  async getFormattedMoodMentorData(id: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    reviews: MoodMentorReview[];
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const mentor = this.moodMentors[id];
    
    if (!mentor) {
      return {
        success: false,
        data: null,
        reviews: [],
        error: 'Mood mentor not found'
      };
    }
    
    const reviews = this.reviews[id] || [];
    
    return {
      success: true,
      data: mentor,
      reviews: reviews.slice(0, 5), // Return top 5 reviews
      error: null
    };
  }
  
  async getMoodMentorReviews(mentorId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<MoodMentorReview[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    const reviews = this.reviews[mentorId] || [];
    
    return reviews.slice(offset, offset + limit);
  }
  
  async addMoodMentorReview(review: Omit<MoodMentorReview, 'id' | 'createdAt'>): Promise<MoodMentorReview> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const id = `review-${review.mentorId}-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newReview: MoodMentorReview = {
      id,
      ...review,
      createdAt: now
    };
    
    // Initialize reviews array if it doesn't exist
    if (!this.reviews[review.mentorId]) {
      this.reviews[review.mentorId] = [];
    }
    
    // Add to the beginning of the array (newest first)
    this.reviews[review.mentorId].unshift(newReview);
    
    // Update mentor's rating and review count
    const mentor = this.moodMentors[review.mentorId];
    if (mentor) {
      const reviews = this.reviews[review.mentorId];
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / reviews.length;
      
      this.moodMentors[review.mentorId] = {
        ...mentor,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
        reviewCount: reviews.length
      };
    }
    
    return newReview;
  }
  
  async getMoodMentorSettings(mentorId: string): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const settings = this.settings[mentorId];
    
    if (!settings) {
      return {
        success: false,
        data: null,
        error: 'Settings not found'
      };
    }
    
    return {
      success: true,
      data: settings,
      error: null
    };
  }
  
  async updateMoodMentorSettings(mentorId: string, settingsUpdate: Partial<MoodMentorSettings>): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const currentSettings = this.settings[mentorId];
    
    if (!currentSettings) {
      return {
        success: false,
        data: null,
        error: 'Settings not found'
      };
    }
    
    // Deep merge settings
    const updatedSettings = {
      ...currentSettings,
      ...settingsUpdate,
      notifications: {
        ...currentSettings.notifications,
        ...(settingsUpdate.notifications || {})
      },
      availability: {
        ...currentSettings.availability,
        ...(settingsUpdate.availability || {})
      },
      payment: {
        ...currentSettings.payment,
        ...(settingsUpdate.payment || {})
      },
      preferences: {
        ...currentSettings.preferences,
        ...(settingsUpdate.preferences || {})
      }
    };
    
    this.settings[mentorId] = updatedSettings;
    
    return {
      success: true,
      data: updatedSettings,
      error: null
    };
  }
  
  async updateMoodMentorProfile(profile: Partial<MoodMentor>): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const id = profile.id || '';
    const currentProfile = this.moodMentors[id];
    
    if (!currentProfile) {
      return {
        success: false,
        data: null,
        error: 'Mood mentor not found'
      };
    }
    
    const updatedProfile = {
      ...currentProfile,
      ...profile,
      // Don't let the client override these values directly
      rating: currentProfile.rating,
      reviewCount: currentProfile.reviewCount
    };
    
    this.moodMentors[id] = updatedProfile;
    
    return {
      success: true,
      data: updatedProfile,
      error: null
    };
  }
  
  async uploadProfileImage(mentorId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    // Simulate network delay and file upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mentor = this.moodMentors[mentorId];
    
    if (!mentor) {
      return {
        success: false,
        url: null,
        error: 'Mood mentor not found'
      };
    }
    
    // In a real implementation, the file would be uploaded to storage
    // For mock purposes, we'll just update the avatarUrl with a random image
    const mockImageUrls = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5'
    ];
    
    const randomImageUrl = mockImageUrls[Math.floor(Math.random() * mockImageUrls.length)];
    
    // Update the mentor's avatarUrl
    this.moodMentors[mentorId] = {
      ...mentor,
      avatarUrl: randomImageUrl
    };
    
    return {
      success: true,
      url: randomImageUrl,
      error: null
    };
  }
  
  async getDashboardStats(mentorId: string): Promise<MoodMentorStats> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mentor = this.moodMentors[mentorId];
    
    // Default stats
    const stats: MoodMentorStats = {
      totalPatients: 0,
      activePatients: 0,
      completedSessions: 0,
      upcomingSessions: 0,
      averageRating: 0,
      totalReviews: 0,
      earnings: {
        thisMonth: 0,
        lastMonth: 0,
        total: 0
      },
      patientMetrics: {
        improvementRate: 0,
        averageEngagement: 0
      }
    };
    
    if (mentor) {
      // Generate realistic mock stats based on the mentor's profile
      stats.totalPatients = Math.floor(mentor.reviewCount * 1.5);
      stats.activePatients = Math.floor(stats.totalPatients * 0.7);
      stats.completedSessions = Math.floor(stats.totalPatients * 4.5);
      stats.upcomingSessions = Math.floor(Math.random() * 10) + 5;
      stats.averageRating = mentor.rating;
      stats.totalReviews = mentor.reviewCount;
      
      // Calculate mock earnings based on hourly rate
      stats.earnings = {
        thisMonth: Math.round(mentor.hourlyRate * (15 + Math.random() * 10)),
        lastMonth: Math.round(mentor.hourlyRate * (12 + Math.random() * 15)),
        total: Math.round(mentor.hourlyRate * stats.completedSessions)
      };
      
      // Mock patient improvement metrics
      stats.patientMetrics = {
        improvementRate: Math.round((60 + Math.random() * 30) * 10) / 10, // 60-90%
        averageEngagement: Math.round((70 + Math.random() * 20) * 10) / 10 // 70-90%
      };
    }
    
    return stats;
  }
  
  /**
   * Ensure mood mentor profile schema is created
   */
  async ensureMoodMentorProfileSchema(): Promise<{
    success: boolean;
    error: string | null;
  }> {
    // This is a mock implementation since we no longer use Supabase
    // In a real implementation, this would create/verify database tables
    console.log('Mock: Ensuring mood mentor profile schema exists');
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      error: null
    };
  }
  
  /**
   * Ensure dashboard schema is created
   */
  async ensureDashboardSchema(): Promise<{
    success: boolean;
    error: string | null;
  }> {
    // This is a mock implementation since we no longer use Supabase
    // In a real implementation, this would create/verify database tables
    console.log('Mock: Ensuring dashboard schema exists');
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      error: null
    };
  }
}

// Export a singleton instance
export const moodMentorService: IMoodMentorService = new MockMoodMentorService(); 