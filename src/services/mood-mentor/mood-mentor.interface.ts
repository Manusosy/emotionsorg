/**
 * Mood Mentor Service Interface
 * Defines the contract for mood mentor operations
 */

export interface MoodMentor {
  id: string;
  userId: string;
  name: string;
  title: string;
  specialties: string[];
  bio: string;
  experience: number; // years
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  availability: AvailabilitySlot[];
  avatarUrl?: string;
  profileCompleted: boolean;
}

export interface AvailabilitySlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface MoodMentorReview {
  id: string;
  mentorId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MoodMentorSettings {
  id: string;
  mentorId: string;
  notifications: {
    email: boolean;
    app: boolean;
    sms: boolean;
  };
  availability: {
    autoConfirm: boolean;
    bufferTime: number; // minutes between sessions
  };
  payment: {
    hourlyRate: number;
    acceptsInsurance: boolean;
    insuranceProviders?: string[];
  };
  preferences: Record<string, any>;
}

export interface MoodMentorStats {
  totalPatients: number;
  activePatients: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
  totalReviews: number;
  earnings: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  patientMetrics: {
    improvementRate: number;
    averageEngagement: number;
  };
}

export interface IMoodMentorService {
  /**
   * Get all mood mentors
   */
  getMoodMentors(options?: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    limit?: number;
    offset?: number;
  }): Promise<MoodMentor[]>;
  
  /**
   * Get a specific mood mentor by ID
   */
  getMoodMentorById(id: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }>;
  
  /**
   * Get formatted mood mentor data for display
   */
  getFormattedMoodMentorData(id: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    reviews: MoodMentorReview[];
    error: string | null;
  }>;
  
  /**
   * Get mood mentor reviews
   */
  getMoodMentorReviews(mentorId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<MoodMentorReview[]>;
  
  /**
   * Add a review for a mood mentor
   */
  addMoodMentorReview(review: Omit<MoodMentorReview, 'id' | 'createdAt'>): Promise<MoodMentorReview>;
  
  /**
   * Get a mood mentor's settings
   */
  getMoodMentorSettings(mentorId: string): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }>;
  
  /**
   * Update a mood mentor's settings
   */
  updateMoodMentorSettings(mentorId: string, settings: Partial<MoodMentorSettings>): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }>;
  
  /**
   * Update a mood mentor's profile
   */
  updateMoodMentorProfile(profile: Partial<MoodMentor>): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }>;
  
  /**
   * Upload a profile image for a mood mentor
   */
  uploadProfileImage(mentorId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }>;
  
  /**
   * Get dashboard stats for a mood mentor
   */
  getDashboardStats(mentorId: string): Promise<MoodMentorStats>;
  
  /**
   * Ensure mood mentor profile schema is created
   * Used for data migration and initialization
   */
  ensureMoodMentorProfileSchema(): Promise<{
    success: boolean;
    error: string | null;
  }>;
  
  /**
   * Ensure dashboard schema is created
   * Used for data migration and initialization
   */
  ensureDashboardSchema(): Promise<{
    success: boolean;
    error: string | null;
  }>;
} 