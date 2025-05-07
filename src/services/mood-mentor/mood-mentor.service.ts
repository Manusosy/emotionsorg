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
    const specialtyOptions = [
      'Depression & Anxiety',
      'Trauma & PTSD',
      'Relationship Issues',
      'Addiction & Recovery',
      'Stress Management',
      'Self-Esteem',
      'Grief',
      'Life Transitions',
      'LGBTQ+ Issues'
    ];

    const mockMentors: Partial<MoodMentor>[] = [
      {
        userId: '2',
        name: 'Dr. Sarah Johnson',
        title: 'Clinical Psychologist',
        specialties: this.getRandomSpecialties(specialtyOptions, 3),
        bio: 'Dr. Johnson has over 15 years of experience helping patients overcome anxiety and depression. She specializes in cognitive-behavioral therapy and mindfulness techniques.',
        experience: 15,
        rating: 4.9,
        reviewCount: 128,
        hourlyRate: 150,
        avatarUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability(),
        gender: 'Female',
        location: 'New York, USA',
        nameSlug: 'dr-sarah-johnson'
      },
      {
        userId: '3',
        name: 'Michael Chen, LMFT',
        title: 'Licensed Marriage and Family Therapist',
        specialties: this.getRandomSpecialties(specialtyOptions, 3),
        bio: 'Michael specializes in helping couples and individuals navigate relationship challenges, trauma recovery, and grief. His approach combines narrative therapy with evidence-based techniques.',
        experience: 8,
        rating: 4.7,
        reviewCount: 84,
        hourlyRate: 120,
        avatarUrl: 'https://images.unsplash.com/photo-1542190643-37b5ef8dcef7?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability(),
        gender: 'Male',
        location: 'San Francisco, USA',
        nameSlug: 'michael-chen-lmft'
      },
      {
        userId: '4',
        name: 'Dr. Amara Patel',
        title: 'Psychiatrist',
        specialties: this.getRandomSpecialties(specialtyOptions, 3),
        bio: 'Dr. Patel combines medication management with holistic approaches to mental health. She focuses on treating anxiety and depression with an emphasis on overall wellbeing.',
        experience: 12,
        rating: 4.8,
        reviewCount: 96,
        hourlyRate: 180,
        avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability(),
        gender: 'Female',
        location: 'Chicago, USA',
        nameSlug: 'dr-amara-patel'
      },
      {
        userId: '5',
        name: 'Robert Williams, LPC',
        title: 'Licensed Professional Counselor',
        specialties: this.getRandomSpecialties(specialtyOptions, 3),
        bio: 'Robert specializes in helping clients overcome addiction and manage stress. He uses a combination of motivational interviewing and cognitive behavioral techniques.',
        experience: 6,
        rating: 4.6,
        reviewCount: 62,
        hourlyRate: 110,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3',
        profileCompleted: true,
        availability: this.generateAvailability(),
        gender: 'Male',
        location: 'Austin, USA',
        nameSlug: 'robert-williams-lpc'
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
        profileCompleted: mentor.profileCompleted || false,
        gender: mentor.gender || '',
        location: mentor.location || '',
        nameSlug: mentor.nameSlug || ''
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
    try {
      console.log("getMoodMentors called with options:", options);
      
      // First get real mentor profiles from local storage
      const mentorProfiles = await this.getRealMoodMentorProfiles();
      console.log(`Found ${mentorProfiles.length} real mentor profiles`, mentorProfiles);
      
      // Always start with all available mentors
      let filteredMentors = [...mentorProfiles];
      
      // Only perform filtering if we have real mentors AND options are specified
      if (filteredMentors.length > 0) {
        // Check if we should apply filters or just return all real mentors
        const testMentorExists = filteredMentors.some(mentor => mentor.name === "Test Mentor" || mentor.id === "test-mentor-id");
        
        // If Test Mentor exists, don't apply filters to ensure it always shows up
        if (!testMentorExists) {
          // Apply specialty filters if specified
          if (options?.specialties && options.specialties.length > 0) {
            filteredMentors = filteredMentors.filter(mentor => 
              options.specialties?.some(s => 
                mentor.specialties?.includes(s)
              )
            );
          }
          
          // Apply rating filter if specified
          if (options?.minRating) {
            filteredMentors = filteredMentors.filter(mentor => 
              mentor.rating >= (options.minRating || 0)
            );
          }
          
          // Apply hourly rate filter if specified
          if (options?.maxHourlyRate) {
            filteredMentors = filteredMentors.filter(mentor => 
              mentor.hourlyRate <= (options.maxHourlyRate || Infinity)
            );
          }
          
          // Apply limit and offset
          if (options?.offset) {
            filteredMentors = filteredMentors.slice(options.offset);
          }
          
          if (options?.limit) {
            filteredMentors = filteredMentors.slice(0, options.limit);
          }
        }
        
        // If we have real mentors (especially Test Mentor), NEVER use mock data
        console.log(`Returning ${filteredMentors.length} real mentor profiles`);
        return filteredMentors;
      }
      
      // IMPORTANT: Only show mock mentors if no real mentors found
      if (filteredMentors.length === 0) {
        console.log("No real mentors found, returning mock data");
        return this.getFilteredMockMentors(options);
      }
      
      return filteredMentors;
    } catch (error) {
      console.error("Error in getMoodMentors:", error);
      // Fall back to mock data in case of error
      return this.getFilteredMockMentors(options);
    }
  }
  
  /**
   * Debug helper to clear and reset mentor profiles
   */
  async resetMentorProfiles(): Promise<void> {
    console.log("Debug: Attempting to reset mentor profiles in localStorage");
    
    // Log all localStorage keys
    console.log("Current localStorage keys:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`- ${key}`);
    }
    
    // Remove all mentor profile data to start fresh
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('mentor_profile_data')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove keys (separate loop to avoid index issues during deletion)
    keysToRemove.forEach(key => {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log("Mentor profile data reset complete");
  }

  /**
   * Register test mentor profile directly
   * This is a helper for testing to ensure a single profile appears
   */
  async registerTestMentorProfile(): Promise<void> {
    console.log("Registering Test Mentor profile directly");
    
    // Create a standard test mentor profile with consistent values
    const testMentor = {
      id: "test-mentor-id",
      userId: "test-mentor-user-id",
      name: "Test Mentor",
      full_name: "Test Mentor",
      title: "Mental Health Specialist",
      credentials: "Mental Health Specialist",
      specialty: "Trauma & PTSD",
      specialties: ["Trauma & PTSD", "Depression & Anxiety", "Relationship Issues"],
      therapyTypes: ["Cognitive Behavioral Therapy (CBT)", "Mindfulness-Based Therapy", "Interpersonal Therapy"],
      bio: "Experienced mental health specialist focused on helping patients overcome trauma and build resilience.",
      about: "Experienced mental health specialist focused on helping patients overcome trauma and build resilience.",
      description: "Experienced mental health specialist focused on helping patients overcome trauma and build resilience.",
      experience: 5,
      experience_details: [
        {
          title: "Mental Health Specialist",
          place: "Wellness Center",
          duration: "5 years"
        }
      ],
      education: [
        {
          degree: "MSc in Psychology",
          institution: "University of New York",
          year: "2015"
        }
      ],
      rating: 4.9,
      reviewCount: 25,
      hourlyRate: 0, // Free service
      availability: [],
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      profileCompleted: true,
      location: "New York, USA",
      gender: "Female",
      languages: ["English", "Spanish"],
      nameSlug: "test-mentor",
      name_slug: "test-mentor",
      satisfaction: 95
    };
    
    // Clean up any existing mentor profile data first to avoid conflicts
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('mentor') || 
        key.includes('test') || 
        key.includes('profile')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove keys (separate loop to avoid index issues during deletion)
    keysToRemove.forEach(key => {
      console.log(`Removing old profile data key: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Save to both localStorage keys for consistency
    localStorage.setItem('test_mentor_profile', JSON.stringify(testMentor));
    localStorage.setItem('mentor_profile_data', JSON.stringify(testMentor));
    
    // Also save with slug-specific key for better lookup
    localStorage.setItem('mentor_profile_test-mentor', JSON.stringify(testMentor));
    
    console.log("Test Mentor profile registered successfully to all localStorage keys");
    console.log("Profile name:", testMentor.name);
    console.log("Profile slug:", testMentor.nameSlug);
    
    // Add it to the mock data as well for consistency
    this.moodMentors["test-mentor-id"] = testMentor;
  }

  // Helper to get real mentor profiles from user database
  private async getRealMoodMentorProfiles(): Promise<MoodMentor[]> {
    try {
      // Query all users with the role 'mood_mentor'
      // Replace this with your actual database query
      // Here we're just checking localStorage as a simplified approach
      const mentors: MoodMentor[] = [];
      
      // First check for the test mentor profile (highest priority)
      const testMentorData = localStorage.getItem('test_mentor_profile');
      if (testMentorData) {
        try {
          const testMentor = JSON.parse(testMentorData);
          console.log("Found Test Mentor profile:", testMentor);
          mentors.push(testMentor);
          
          // If we found the test mentor, just return it and skip other profiles
          return mentors;
        } catch (e) {
          console.error("Error parsing Test Mentor profile:", e);
        }
      }
      
      // Loop through localStorage to find mentor profiles
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check all variations of the mentor profile key naming
        if (key && (key.includes('mentor_profile_data') || key === 'mentor_profile_data')) {
          try {
            const profileData = JSON.parse(localStorage.getItem(key) || '{}');
            console.log("Found profile data in localStorage:", key, profileData);
            
            // Always consider the profile as having required fields - bypass checking
            const mentor: MoodMentor = {
              id: profileData.id || profileData.userId || `mentor-${Date.now()}`,
              userId: profileData.userId || profileData.id || `user-${Date.now()}`,
              name: profileData.name || profileData.full_name || 'Mood Mentor',
              title: profileData.title || profileData.specialty || 'Mental Health Specialist',
              specialties: profileData.specialties || [],
              bio: profileData.bio || '',
              experience: profileData.experience || 0,
              rating: profileData.rating || 5.0,
              reviewCount: profileData.reviewCount || 0,
              hourlyRate: profileData.hourlyRate || profileData.consultation_fee || 0,
              availability: profileData.availability || [],
              avatarUrl: profileData.avatarUrl || profileData.avatar_url || '',
              // Always set profileCompleted to true to ensure it appears in listing
              profileCompleted: true,
              gender: profileData.gender || '',
              location: profileData.location || '',
              nameSlug: profileData.nameSlug || profileData.name_slug || 
                (profileData.name || profileData.full_name || 'mood-mentor')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
            };
            
            mentors.push(mentor);
            console.log("Added mentor to list:", mentor.name, "with nameSlug:", mentor.nameSlug);
          } catch (e) {
            console.error(`Error parsing profile data for key ${key}:`, e);
          }
        }
      }
      
      return mentors;
    } catch (error) {
      console.error("Error getting real mentor profiles:", error);
      return [];
    }
  }
  
  // Helper to filter mock mentors based on options
  private getFilteredMockMentors(options?: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    limit?: number;
    offset?: number;
  }): MoodMentor[] {
    // Start with all mock mentors
    let filteredMentors = Object.values(this.moodMentors);
    
    // Apply filters
    if (options?.specialties && options.specialties.length > 0) {
      filteredMentors = filteredMentors.filter(mentor => 
        options.specialties?.some(s => 
          mentor.specialties?.includes(s)
        )
      );
    }
    
    if (options?.minRating) {
      filteredMentors = filteredMentors.filter(mentor => 
        mentor.rating >= (options.minRating || 0)
      );
    }
    
    if (options?.maxHourlyRate) {
      filteredMentors = filteredMentors.filter(mentor => 
        mentor.hourlyRate <= (options.maxHourlyRate || Infinity)
      );
    }
    
    // Apply limit and offset
    if (options?.offset) {
      filteredMentors = filteredMentors.slice(options.offset);
    }
    
    if (options?.limit) {
      filteredMentors = filteredMentors.slice(0, options.limit);
    }
    
    return filteredMentors;
  }
  
  /**
   * Update the moodMentors collection with the profile data
   * This ensures the profile is available when queried by ID
   */
  private updateMockDataCollection(profile: MoodMentor): void {
    if (!profile || !profile.id) return;
    
    console.log(`Updating mock data collection with profile ID: ${profile.id}`);
    
    // Ensure the profile has all required fields
    const completeProfile: MoodMentor = {
      ...profile,
      id: profile.id,
      userId: profile.userId || profile.id,
      name: profile.name || profile.full_name || 'Test Mentor',
      title: profile.title || profile.specialty || 'Mental Health Specialist',
      specialties: profile.specialties || [],
      bio: profile.bio || '',
      experience: profile.experience || 0,
      rating: profile.rating || 5.0,
      reviewCount: profile.reviewCount || 0,
      hourlyRate: profile.hourlyRate || 0,
      availability: profile.availability || [],
      profileCompleted: true,
      nameSlug: profile.nameSlug || profile.name_slug,
      name_slug: profile.nameSlug || profile.name_slug,
    };
    
    // Add to the mock data collection
    this.moodMentors[profile.id] = completeProfile;
    console.log(`Profile added to moodMentors collection with ID ${profile.id}`);
  }

  async getMoodMentorById(id: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log(`Looking up mentor by ID: ${id}`);
    
    // First check localStorage for any matching profile
    let profile: MoodMentor | null = null;
    
    // Check mentor_profile_data
    const mentorProfileData = localStorage.getItem('mentor_profile_data');
    if (mentorProfileData) {
      try {
        const data = JSON.parse(mentorProfileData);
        if (data.id === id || data.userId === id) {
          console.log('Found profile in mentor_profile_data:', data);
          profile = data;
        }
      } catch (e) {
        console.error('Error parsing mentor_profile_data:', e);
      }
    }
    
    // Check test_mentor_profile if not found
    if (!profile) {
      const testProfileData = localStorage.getItem('test_mentor_profile');
      if (testProfileData) {
        try {
          const data = JSON.parse(testProfileData);
          if (data.id === id || data.userId === id) {
            console.log('Found profile in test_mentor_profile:', data);
            profile = data;
          }
        } catch (e) {
          console.error('Error parsing test_mentor_profile:', e);
        }
      }
    }
    
    // If found in localStorage, update mock collection and return
    if (profile) {
      this.updateMockDataCollection(profile);
      return {
        success: true,
        data: profile,
        error: null
      };
    }
    
    // If not found in localStorage, check mock mentors
    const mentor = this.moodMentors[id];
    
    if (!mentor) {
      console.log(`No mentor found with ID: ${id}`);
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
  
  /**
   * Get a mood mentor by their name slug
   */
  async getMoodMentorBySlug(nameSlug: string): Promise<{
    success: boolean;
    data: MoodMentor | null;
    error: string | null;
  }> {
    try {
      console.log(`Looking up mentor by slug: ${nameSlug}`);
      
      // DEBUG: Print ALL localStorage contents for debugging
      console.log("=== DEBUG: ALL LOCALSTORAGE CONTENT ===");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('mentor') || key.includes('profile') || key.includes('test'))) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            console.log(`Key: ${key}`);
            console.log(`- Name: ${data.name || data.full_name}`);
            console.log(`- NameSlug: ${data.nameSlug || data.name_slug}`);
            console.log(`- Bio: ${(data.bio || '').substring(0, 30)}...`);
            console.log(`- About: ${(data.about || '').substring(0, 30)}...`);
          } catch (e) {
            console.log(`Key: ${key} - Error parsing JSON`);
          }
        }
      }
      console.log("=== END DEBUG ===");
      
      // Strategy: Look for ANY mentor data with matching slug
      let matchedProfile: MoodMentor | null = null;
      let matchSource = '';
      
      // 1. First check the mentor_profile_data key (most likely to be fresh)
      const mentorProfileData = localStorage.getItem('mentor_profile_data');
      if (mentorProfileData) {
        try {
          const profileData = JSON.parse(mentorProfileData);
          const profileSlug = profileData.nameSlug || profileData.name_slug || 
            (profileData.name || profileData.full_name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          console.log(`mentor_profile_data slug check: ${profileSlug} vs ${nameSlug}`);
          
          if (profileSlug === nameSlug) {
            console.log('Found mentor profile with matching slug in mentor_profile_data:', profileData);
            matchedProfile = profileData;
            matchSource = 'mentor_profile_data';
          }
        } catch (e) {
          console.error("Error parsing mentor profile data:", e);
        }
      }
      
      // 2. Check test_mentor_profile key if no match yet
      if (!matchedProfile) {
        const testMentorData = localStorage.getItem('test_mentor_profile');
        if (testMentorData) {
          try {
            const testMentor = JSON.parse(testMentorData);
            const testMentorSlug = testMentor.nameSlug || testMentor.name_slug || 
              (testMentor.name || testMentor.full_name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            console.log(`test_mentor_profile slug check: ${testMentorSlug} vs ${nameSlug}`);
            
            if (testMentorSlug === nameSlug) {
              console.log('Found test mentor with matching slug in test_mentor_profile:', testMentor);
              matchedProfile = testMentor;
              matchSource = 'test_mentor_profile';
            }
          } catch (e) {
            console.error("Error parsing Test Mentor profile:", e);
          }
        }
      }
      
      // 3. Check all other localStorage keys if still no match
      if (!matchedProfile) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // Skip the keys we already checked
          if (key && key !== 'test_mentor_profile' && key !== 'mentor_profile_data' && 
              (key.includes('mentor') || key.includes('mood') || key.includes('profile'))) {
            try {
              const profileData = JSON.parse(localStorage.getItem(key) || '{}');
              const slug = profileData.nameSlug || profileData.name_slug || 
                (profileData.name || profileData.full_name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              
              console.log(`${key} slug check: ${slug} vs ${nameSlug}`);
              
              if (slug === nameSlug) {
                console.log(`Found mentor with matching slug in key ${key}:`, profileData);
                matchedProfile = profileData;
                matchSource = key;
              }
            } catch (e) {
              console.error(`Error parsing profile data for key ${key}:`, e);
            }
          }
        }
      }
      
      // If we found a match in localStorage, ensure bio field is properly set
      if (matchedProfile) {
        console.log(`FOUND MATCH: Using mentor profile from ${matchSource}`);
        
        // Ensure bio field is set properly for consistency with public profile
        if (!matchedProfile.bio) {
          console.log('Bio field not found in profile data, checking alternate fields');
          // Try to find bio in other fields or set a default
          matchedProfile.bio = matchedProfile.about || matchedProfile.description || 
            "Mental health specialist focused on helping patients overcome challenges and build resilience.";
          console.log(`Set bio field to: "${matchedProfile.bio.substring(0, 50)}..."`);
        } else {
          console.log(`Bio field found in profile: "${matchedProfile.bio.substring(0, 50)}..."`);
        }
        
        // Also ensure 'about' is set for backwards compatibility with UI
        if (!matchedProfile.about) {
          matchedProfile.about = matchedProfile.bio;
          console.log(`Set about field from bio: "${matchedProfile.about.substring(0, 50)}..."`);
        }
        
        // Make sure nameSlug is properly set
        if (!matchedProfile.nameSlug && matchedProfile.name_slug) {
          matchedProfile.nameSlug = matchedProfile.name_slug;
        } else if (!matchedProfile.name_slug && matchedProfile.nameSlug) {
          matchedProfile.name_slug = matchedProfile.nameSlug;
        }
        
        // Sync for future lookups with updated fields
        this.syncProfileToAllKeys(matchedProfile, matchSource);
        
        return {
          success: true,
          data: matchedProfile,
          error: null
        };
      }
      
      // If not found in localStorage, try mock mentors
      const mockMentor = Object.values(this.moodMentors).find(mentor => 
        mentor.nameSlug === nameSlug ||
        mentor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === nameSlug
      );
      
      if (mockMentor) {
        console.log(`Found mock mentor with slug ${nameSlug}:`, mockMentor);
        return {
          success: true,
          data: mockMentor,
          error: null
        };
      }
      
      console.log(`No mentor found with slug ${nameSlug}`);
      return {
        success: false,
        data: null,
        error: `No mentor found with slug ${nameSlug}`
      };
    } catch (error) {
      console.error(`Error finding mentor by slug ${nameSlug}:`, error);
      return {
        success: false,
        data: null,
        error: `Error finding mentor by slug: ${error}`
      };
    }
  }
  
  /**
   * Helper method to sync profile data to all localStorage keys
   */
  private syncProfileToAllKeys(profile: MoodMentor, sourceKey: string): void {
    console.log(`Syncing profile from ${sourceKey} to all localStorage keys`);
    
    // Ensure the profile has all necessary fields
    const fullProfile = {
      ...profile,
      // Use both formats for maximum compatibility
      nameSlug: profile.nameSlug || profile.name_slug,
      name_slug: profile.nameSlug || profile.name_slug,
      // Ensure name is consistent
      name: profile.name || profile.full_name || "Test Mentor",
      full_name: profile.name || profile.full_name || "Test Mentor", 
      // Ensure bio is set consistently
      bio: profile.bio || profile.about || profile.description || "",
      about: profile.bio || profile.about || profile.description || "",
      // Ensure both education and experience arrays are properly preserved
      education: Array.isArray(profile.education) ? profile.education : [],
      // Handle both experience as number and as array
      experience: typeof profile.experience === 'number' ? profile.experience : 0,
      // Preserve experience_details array if it exists
      experience_details: Array.isArray(profile.experience_details) 
        ? profile.experience_details 
        : (Array.isArray(profile.experience) && typeof profile.experience[0] === 'object'
          ? profile.experience 
          : []),
      // Ensure these critical fields are always set
      profileCompleted: true,
      id: profile.id || "test-mentor-id",
      userId: profile.userId || "test-mentor-user-id",
      // Ensure specialty and specialties are set
      specialty: profile.specialty || "Mental Health",
      specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
      // Ensure therapy types are preserved
      therapyTypes: Array.isArray(profile.therapyTypes) ? profile.therapyTypes : [],
      // Ensure other common fields are set
      rating: profile.rating || 4.9,
      reviewCount: profile.reviewCount || 0,
      satisfaction: profile.satisfaction || 95,
      location: profile.location || "New York, USA",
      avatarUrl: profile.avatarUrl || profile.avatar_url || "",
      avatar_url: profile.avatarUrl || profile.avatar_url || "",
      // Make sure credentials are consistent
      credentials: profile.credentials || profile.title || "Mental Health Specialist",
      title: profile.credentials || profile.title || "Mental Health Specialist"
    };
    
    // Print debug information for what we're saving
    console.log("=== SAVING PROFILE DATA ===");
    console.log(`- Name: ${fullProfile.name || fullProfile.full_name}`);
    console.log(`- Bio: ${(fullProfile.bio || '').substring(0, 50)}...`);
    console.log(`- About: ${(fullProfile.about || '').substring(0, 50)}...`);
    console.log(`- Specialties: ${fullProfile.specialties?.join(', ') || 'None'}`);
    console.log(`- Slug: ${fullProfile.nameSlug}`);
    console.log(`- Education entries: ${fullProfile.education?.length || 0}`);
    console.log(`- Experience entries: ${fullProfile.experience_details?.length || 0}`);
    
    // Education debug
    if (Array.isArray(fullProfile.education) && fullProfile.education.length > 0) {
      console.log("- Education details:");
      fullProfile.education.forEach((edu, i) => {
        console.log(`  [${i}] ${edu.degree || 'No degree'} at ${edu.institution || 'Unknown'}`);
      });
    }
    
    // Experience debug
    if (Array.isArray(fullProfile.experience_details) && fullProfile.experience_details.length > 0) {
      console.log("- Experience details:");
      fullProfile.experience_details.forEach((exp, i) => {
        console.log(`  [${i}] ${exp.title || 'No title'} at ${exp.place || exp.company || 'Unknown'}`);
      });
    }
    
    // Save to ALL mentor-related localStorage keys to ensure consistency across user types
    localStorage.setItem('test_mentor_profile', JSON.stringify(fullProfile));
    localStorage.setItem('mentor_profile_data', JSON.stringify(fullProfile));
    
    // Also save to a third key that includes the slug to make sure it's found consistently
    const slugKey = `mentor_profile_${fullProfile.nameSlug}`;
    localStorage.setItem(slugKey, JSON.stringify(fullProfile));
    
    // Update mock data in ALL relevant collections
    if (fullProfile.id) {
      this.moodMentors[fullProfile.id] = fullProfile;
      console.log(`Updated mentor in mock data with ID ${fullProfile.id}`);
    }
    
    console.log("Profile data synchronized to all localStorage keys");
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
    
    // Generate nameSlug if it doesn't exist
    if (!mentor.nameSlug) {
      mentor.nameSlug = mentor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
    
    console.log("updateMoodMentorProfile called with:", profile);
    
    // Ensure the profile has an ID
    const id = profile.id || '';
    if (!id) {
      return {
        success: false,
        data: null,
        error: 'Profile ID is required'
      };
    }
    
    // Ensure slug consistency between nameSlug and name_slug fields
    const nameSlug = profile.nameSlug || profile.name_slug || 
      (profile.name || profile.full_name || 'mood-mentor')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    
    // Debug log bio field before processing
    console.log("BIO FIELD IN UPDATE METHOD:", {
      profileBio: profile.bio,
      profileAbout: profile.about,
      description: profile.description
    });
    
    // Use the provided bio field or about field, ensuring at least one is set
    const bioContent = profile.bio || profile.about || profile.description || '';
    
    // Create a complete profile with all required fields
    // IMPORTANT: Use the actual provided profile data
    const completeProfile: MoodMentor = {
      // First set defaults to ensure all fields exist
      id,
      userId: profile.userId || id,
      name: 'Mood Mentor',
      full_name: 'Mood Mentor',
      title: 'Mental Health Specialist',
      specialties: [],
      bio: bioContent,  // Ensure bio is set even if empty
      about: bioContent, // Ensure about field matches bio for backwards compatibility
      experience: 0,
      rating: 5.0,
      reviewCount: 0,
      hourlyRate: 0,
      availability: [],
      profileCompleted: true,
      nameSlug,
      name_slug: nameSlug,
      
      // Carefully preserve education and experience data
      education: Array.isArray(profile.education) ? profile.education : [],
      experience_details: Array.isArray(profile.experience_details) 
        ? profile.experience_details 
        : (Array.isArray(profile.experience) && typeof profile.experience[0] === 'object'
          ? profile.experience 
          : []),
    };
    
    // Then overwrite with actual profile data, keeping the critical fields
    Object.assign(completeProfile, profile);
    
    // Always ensure these fields are set correctly
    completeProfile.nameSlug = nameSlug;
    completeProfile.name_slug = nameSlug;
    completeProfile.profileCompleted = true;
    
    // Ensure bio and about are synchronized
    completeProfile.bio = completeProfile.bio || completeProfile.about || '';
    completeProfile.about = completeProfile.bio || completeProfile.about || '';
    
    // Debug log final bio/about fields
    console.log("FINAL BIO/ABOUT FIELDS:", {
      bio: completeProfile.bio?.substring(0, 50) + (completeProfile.bio?.length > 50 ? '...' : ''),
      about: completeProfile.about?.substring(0, 50) + (completeProfile.about?.length > 50 ? '...' : '')
    });
    
    // Log the education and experience details for debugging
    console.log("EDUCATION AND EXPERIENCE DETAILS:", {
      educationCount: completeProfile.education?.length || 0,
      experienceCount: completeProfile.experience_details?.length || 0,
      educationData: Array.isArray(completeProfile.education) 
        ? completeProfile.education.map(edu => `${edu.degree} at ${edu.institution}`)
        : 'No education data',
      experienceData: Array.isArray(completeProfile.experience_details)
        ? completeProfile.experience_details.map(exp => `${exp.title || 'Position'} at ${exp.place || 'Location'}`)
        : 'No experience data'
    });
    
    // Update in the mock data collection
    this.moodMentors[id] = completeProfile;
    
    // Save to localStorage for persistence - save the COMPLETE data
    try {
      console.log("Saving profile data to localStorage:", completeProfile);
      localStorage.setItem('test_mentor_profile', JSON.stringify(completeProfile));
      localStorage.setItem('mentor_profile_data', JSON.stringify(completeProfile));
      
      // Also force an immediate sync to ensure data consistency
      this.syncProfileToAllKeys(completeProfile, 'updateMoodMentorProfile');
    } catch (e) {
      console.error("Error saving profile to localStorage:", e);
    }
    
    console.log("Profile updated successfully:", completeProfile);
    
    return {
      success: true,
      data: completeProfile,
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

  // Helper function to get random specialties
  private getRandomSpecialties(specialties: string[], count: number): string[] {
    const shuffled = [...specialties].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Sync all test mentor profile data across localStorage keys
   * This helps ensure consistent data display
   */
  async syncTestMentorProfile(): Promise<void> {
    console.log("==== SYNC PROFILE DATA PROCESS STARTING ====");
    
    // First dump all relevant localStorage keys for debugging
    console.log("Current localStorage keys that may contain profile data:");
    const allKeys: string[] = [];
    const keyData: Record<string, any> = {};
    
    // Step 1: Collect all profile data and their keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('mentor') || 
        key.includes('test') || 
        key.includes('profile') || 
        key.includes('mood')
      )) {
        try {
          console.log(`- Found key: ${key}`);
          allKeys.push(key);
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          keyData[key] = data;
          
          // Print useful debug info about the profile
          const name = data.name || data.full_name || 'Unknown';
          const slug = data.nameSlug || data.name_slug || 'unknown-slug';
          console.log(`  > Name: ${name}, Slug: ${slug}`);
        } catch (e) {
          console.error(`Error parsing data for key ${key}:`, e);
        }
      }
    }
    
    // Step 2: Determine which profile data to use as the source of truth
    let mainProfile = null;
    let sourceKey = '';
    
    // Priority 1: mentor_profile_data (most likely to be fresh)
    if (keyData['mentor_profile_data']) {
      mainProfile = keyData['mentor_profile_data'];
      sourceKey = 'mentor_profile_data';
      console.log("Using mentor_profile_data as primary source");
    } 
    // Priority 2: test_mentor_profile
    else if (keyData['test_mentor_profile']) {
      mainProfile = keyData['test_mentor_profile'];
      sourceKey = 'test_mentor_profile';
      console.log("Using test_mentor_profile as primary source");
    }
    // Priority 3: Any other profile data
    else {
      for (const key of allKeys) {
        if (keyData[key] && (keyData[key].name || keyData[key].full_name)) {
          mainProfile = keyData[key];
          sourceKey = key;
          console.log(`Using ${key} as primary source`);
          break;
        }
      }
    }
    
    // If we found a profile, sync it to all storage keys
    if (mainProfile) {
      console.log(`Found source profile in ${sourceKey}, syncing to all keys`);
      
      // Ensure all naming fields are consistent and present
      const name = mainProfile.name || mainProfile.full_name || "Test Mentor";
      const nameSlug = (mainProfile.nameSlug || mainProfile.name_slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      
      // Create a complete profile with all possible fields and consistent values
      const completeProfile = {
        ...mainProfile,
        // Essential fields that must be present in both formats
        name: name,
        full_name: name,
        nameSlug: nameSlug,
        name_slug: nameSlug,
        // Ensure title and credentials are consistent
        title: mainProfile.title || mainProfile.credentials || "Mental Health Specialist",
        credentials: mainProfile.credentials || mainProfile.title || "Mental Health Specialist",
        // Ensure bio and about fields are consistent
        bio: mainProfile.bio || mainProfile.about || "Mental health specialist helping clients navigate emotional challenges.",
        about: mainProfile.bio || mainProfile.about || "Mental health specialist helping clients navigate emotional challenges.",
        // Ensure specialty is set
        specialty: mainProfile.specialty || "Mental Health",
        // Ensure specialties and therapyTypes are arrays
        specialties: Array.isArray(mainProfile.specialties) ? mainProfile.specialties : 
                    (mainProfile.specialty ? [mainProfile.specialty] : ["Mental Health", "Therapy"]),
        therapyTypes: Array.isArray(mainProfile.therapyTypes) ? mainProfile.therapyTypes : 
                     ["Cognitive Behavioral Therapy", "Mindfulness-Based Therapy"],
        // Set consistent display data
        rating: mainProfile.rating || 4.9,
        reviewCount: mainProfile.reviewCount || 25,
        satisfaction: mainProfile.satisfaction || 95,
        // Set consistent image data
        avatarUrl: mainProfile.avatarUrl || mainProfile.avatar_url || "",
        avatar_url: mainProfile.avatarUrl || mainProfile.avatar_url || "",
        // Set completed to ensure visibility
        profileCompleted: true,
        // Consistent ID fields
        id: mainProfile.id || "test-mentor-id",
        userId: mainProfile.userId || mainProfile.user_id || "test-mentor-user-id",
        // Ensure location is consistent
        location: mainProfile.location || "New York, USA",
        // Ensure hourly rate consistent
        hourlyRate: 0, // Free service
        // Ensure consistent experience data
        experience: typeof mainProfile.experience === 'number' ? mainProfile.experience : 5,
        experience_details: Array.isArray(mainProfile.experience_details) ? mainProfile.experience_details : []
      };
      
      // Clean up any slug-based keys first to prevent duplicates
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mentor_profile_') && key !== 'mentor_profile_data') {
          localStorage.removeItem(key);
        }
      }
      
      // Save to primary keys
      localStorage.setItem('test_mentor_profile', JSON.stringify(completeProfile));
      localStorage.setItem('mentor_profile_data', JSON.stringify(completeProfile));
      
      // Create a consistent slug-specific key
      localStorage.setItem(`mentor_profile_${nameSlug}`, JSON.stringify(completeProfile));
      
      // Add to the mock data collection for consistency
      if (completeProfile.id) {
        this.moodMentors[completeProfile.id] = completeProfile;
      }
      
      console.log("Profile data synchronized successfully to all keys");
      console.log("Updated profile details:");
      console.log(`- Name: ${completeProfile.name}`);
      console.log(`- NameSlug: ${completeProfile.nameSlug}`);
      console.log(`- Bio: ${(completeProfile.bio || '').substring(0, 50)}...`);
      console.log(`- All keys updated: test_mentor_profile, mentor_profile_data, mentor_profile_${nameSlug}`);
    } else {
      console.log("No valid profile data found to sync");
      
      // If no profile found, create a default test mentor
      console.log("Creating default test mentor profile");
      await this.registerTestMentorProfile();
    }
    
    console.log("==== SYNC PROFILE DATA PROCESS COMPLETE ====");
  }

  /**
   * Debug helper to completely reset localStorage and create a fresh test profile
   */
  async completeResetAndCreateTestProfile(): Promise<void> {
    console.log("==== COMPLETE RESET AND TEST PROFILE CREATION ====");
    
    // Log all localStorage keys before reset
    console.log("Current localStorage keys before reset:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`- ${key}`);
    }
    
    // Reset all mentor-related localStorage entries
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('mentor') || 
        key.includes('mood') || 
        key === 'test_mentor_profile' || 
        key === 'mentor_profile_data'
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove keys (separate loop to avoid index issues during deletion)
    keysToRemove.forEach(key => {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log("All mentor-related localStorage keys removed");
    
    // Create and register a completely fresh test mentor profile
    await this.registerTestMentorProfile();
    
    // Verify the data was saved correctly
    const testMentorData = localStorage.getItem('test_mentor_profile');
    const mentorProfileData = localStorage.getItem('mentor_profile_data');
    
    console.log("Test mentor profile registered:", testMentorData ? "YES" : "NO");
    console.log("Mentor profile data registered:", mentorProfileData ? "YES" : "NO");
    
    if (testMentorData && mentorProfileData) {
      const testMentor = JSON.parse(testMentorData);
      console.log("Test Mentor Name:", testMentor.name);
      console.log("Test Mentor Slug:", testMentor.nameSlug || testMentor.name_slug);
    }
    
    console.log("==== RESET AND TEST PROFILE CREATION COMPLETE ====");
    
    return;
  }
}

// Export a singleton instance
export const moodMentorService: IMoodMentorService = new MockMoodMentorService(); 