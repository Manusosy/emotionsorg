import { IPatientService, PatientProfile, Appointment, AppointmentReport, PatientMetric, Assessment, PatientDashboardData, UserMetricsUpdate, UserActivity } from './patient.interface';
import { supabase } from '@/lib/supabase';
import { getFormattedDeviceInfo } from '@/utils/device-detection';

// Utility functions for case conversion (same as in mood-mentor.service.ts)
const snakeToCamel = (str: string): string => 
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const camelToSnake = (str: string): string => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertObjectToCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToCamelCase(item));
  }
  
  const result: any = {};
  Object.keys(obj).forEach(key => {
    const camelKey = snakeToCamel(key);
    result[camelKey] = convertObjectToCamelCase(obj[key]);
  });
  
  return result;
};

const convertObjectToSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToSnakeCase(item));
  }
  
  const result: any = {};
  Object.keys(obj).forEach(key => {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = convertObjectToSnakeCase(obj[key]);
  });
  
  return result;
};

export class PatientService implements IPatientService {
  async getAllPatients(): Promise<PatientProfile[]> {
    try {
      const { data, error } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      // Convert snake_case to camelCase
      return (data || []).map(patient => convertObjectToCamelCase(patient)) as PatientProfile[];
    } catch (error) {
      console.error('Error in getAllPatients:', error);
      return [];
    }
  }

  subscribeToPatientUpdates(callback: () => void): (() => void) | undefined {
    try {
      // Set up real-time subscription to patient profiles table
      const subscription = supabase
        .channel('patient_profiles_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'patient_profiles' }, 
          callback
        )
        .subscribe();
        
      // Return a cleanup function
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up patient updates subscription:', error);
      return undefined;
    }
  }

  async getPatientById(id: string): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }> {
    try {
      if (!id) {
        throw new Error('ID is required');
      }

      // First try to find by user_id
      const { data: userData, error: userError } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (userData) {
        return {
          success: true,
          data: convertObjectToCamelCase(userData) as PatientProfile,
          error: null
        };
      }

      // If not found by user_id, try by id
      const { data: idData, error: idError } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (idError) {
        throw idError;
      }

      return {
        success: true,
        data: idData ? convertObjectToCamelCase(idData) as PatientProfile : null,
        error: null
      };
    } catch (error: any) {
      console.error('Error in getPatientById:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  async uploadProfileImage(patientId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }> {
    try {
      // Generate a unique filename with timestamp to avoid cache issues
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}-${timestamp}-${randomStr}.${fileExt}`;
      
      console.log('Starting profile image upload process...');
      
      // First get a list of available buckets to ensure we're using one that exists
      const { data: bucketList, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.error('Error fetching bucket list:', bucketListError);
        throw new Error(`Failed to access storage: ${bucketListError.message}`);
      }
      
      console.log('Available buckets:', bucketList?.map(b => b.name));
      
      // Default bucket names to try
      let bucketOptions = ['avatars', 'public', 'profile-images'];
      
      // If we have a bucket list, prioritize existing buckets
      if (bucketList && bucketList.length > 0) {
        // Use existing buckets from the list
        const availableBuckets = bucketList.map(b => b.name);
        
        // If none of our preferred buckets exist, use the first available bucket
        if (!bucketOptions.some(name => availableBuckets.includes(name))) {
          console.log('None of the preferred buckets found, using first available bucket');
          bucketOptions = [availableBuckets[0]];
        } else {
          // Filter to only include buckets that actually exist
          bucketOptions = bucketOptions.filter(name => availableBuckets.includes(name));
        }
      }
      
      // If still no buckets available, try to create one
      if (bucketOptions.length === 0) {
        console.log('No buckets available, attempting to create one');
        try {
          // Try to create a public bucket
          await supabase.storage.createBucket('public', {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
          });
          bucketOptions = ['public'];
          console.log('Created new public bucket');
        } catch (createError) {
          console.error('Failed to create bucket:', createError);
          throw new Error('No storage buckets available and unable to create one. Please contact support.');
        }
      }
      
      // Try each bucket until one works
      let uploadedUrl = null;
      let lastError = null;
      
      for (const bucketName of bucketOptions) {
        try {
          console.log(`Attempting to upload to "${bucketName}" bucket`);
          
          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: 'no-cache',
              upsert: true
            });
            
          if (uploadError) {
            console.warn(`Failed to upload to "${bucketName}" bucket:`, uploadError.message);
            lastError = uploadError;
            continue; // Try next bucket
          }
          
          // Get public URL for the file
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
            
          if (urlData?.publicUrl) {
            uploadedUrl = urlData.publicUrl;
            console.log(`Successfully uploaded to "${bucketName}" bucket:`, uploadedUrl);
            
            // Record this activity
            this.recordUserActivity({
              activityType: 'profile_update',
              description: 'Updated profile picture',
              timestamp: new Date().toISOString(),
              metadata: {
                bucketName,
                fileSize: file.size
              }
            }).catch(err => console.warn('Failed to record activity:', err));
            
            // Update user metadata with the avatar URL
            try {
              const { data: userData } = await supabase.auth.getUser();
              if (userData?.user) {
                await supabase.auth.updateUser({
                  data: {
                    avatar_url: uploadedUrl
                  }
                });
                console.log("Updated user metadata with new avatar URL");
              }
            } catch (metadataError) {
              console.warn("Failed to update user metadata with avatar URL:", metadataError);
              // Continue anyway as we have the URL
            }
            
            break; // Exit loop after successful upload
          }
        } catch (bucketError) {
          console.warn(`Error with "${bucketName}" bucket:`, bucketError);
          lastError = bucketError;
        }
      }
      
      if (uploadedUrl) {
        return {
          success: true,
          url: uploadedUrl,
          error: null
        };
      } else {
        throw new Error(lastError?.message || 'Failed to upload image to any storage bucket');
      }
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        url: null,
        error: error.message || 'Unknown error occurred while uploading image'
      };
    }
  }

  async updatePatientProfile(profile: Partial<PatientProfile>): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }> {
    try {
      // Ensure we have a user_id field
      const userId = (profile as any).userId || (profile as any).user_id;
      if (!userId) {
        throw new Error('Profile must have a user_id or userId');
      }

      // Ensure we have the required email field
      if (!profile.email) {
        throw new Error('Profile must have an email field');
      }

      // Log the incoming profile for debugging
      console.log('Updating patient profile with data:', JSON.stringify(profile));

      // Convert object to snake_case for database
      const snakeCaseProfile = convertObjectToSnakeCase({
        ...profile,
        user_id: userId
      });

      // Log the snake_case converted profile
      console.log('After snake_case conversion:', JSON.stringify(snakeCaseProfile));

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking if profile exists:', checkError);
        throw checkError;
      }

      let result;
      
      if (existingProfile) {
        // Update existing profile
        console.log('Updating existing profile with ID:', existingProfile.id);
        result = await supabase
          .from('patient_profiles')
          .update({
            ...snakeCaseProfile,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
          .single();
      } else {
        // Insert new profile
        console.log('Creating new profile for user_id:', userId);
        result = await supabase
          .from('patient_profiles')
          .insert({
            ...snakeCaseProfile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();
      }

      if (result.error) {
        console.error('Supabase error in updatePatientProfile:', result.error);
        throw result.error;
      }

      // Convert back to camelCase for UI
      return {
        success: true,
        data: result.data ? convertObjectToCamelCase(result.data) as PatientProfile : null,
        error: null
      };
    } catch (error: any) {
      console.error('Error updating patient profile:', error);
      // Log specific error details if available
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      if (error.code) console.error('Error code:', error.code);
      
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update profile'
      };
    }
  }

  async getAppointments(patientId: string, options?: {
    status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    try {
      // Use the patient_appointments_view for better performance and data structure
      let query = supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', patientId);

      // Add status filter if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      // Add date range filters if provided
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      // Add limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Order by date and time ascending
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      
      // Return data as is since we're using snake_case throughout the application
      return data || [];
    } catch (error) {
      console.error('Error in getAppointments:', error);
      return [];
    }
  }

  async getAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: AppointmentReport[];
    error: string | null;
  }> {
    try {
      // Implementation placeholder - use getMockAppointmentReports for now
      // In a real implementation, this would query the appointment_reports table
      const mockReports = this.getMockAppointmentReports(options);
      
      return {
        success: true,
        data: mockReports,
        error: null
      };
    } catch (error: any) {
      console.error('Error in getAppointmentReports:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at' | 'cancellation_reason' | 'cancelled_by' | 'rating' | 'feedback'>): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          status: 'pending'
        })
        .select('*')
        .single();
        
      if (error) throw error;
      
      return data as Appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    try {
      // Add updated_at timestamp
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedData, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (error) throw error;
      
      return updatedData as Appointment;
    } catch (error) {
      console.error('Error updating appointment:', error);
      return null;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return false;
      }
      
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return false;
    }
  }

  async getMetrics(patientId: string, options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PatientMetric[]> {
    // This is a placeholder - would query metrics tables in a real implementation
    return [];
  }

  async getAssessments(patientId: string, options?: {
    type?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Assessment[]> {
    // This is a placeholder - would query assessment tables in a real implementation
    return [];
  }

  getMockAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): AppointmentReport[] {
    // This is a placeholder for mock data
    return [];
  }

  async getPatientDashboardData(patientId: string): Promise<{
    success: boolean;
    data: PatientDashboardData | null;
    error: string | null;
  }> {
    try {
      // This is a placeholder - would aggregate data from multiple tables in a real implementation
      const mockData: PatientDashboardData = {
        metrics: {
          moodScore: 3.5,
          stressLevel: 2.1,
          consistency: 85,
          lastCheckInStatus: 'good',
          streak: 5,
          firstCheckInDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastCheckInDate: new Date().toISOString(),
          hasAssessments: true
        },
        journalEntries: [],
        supportGroups: []
      };
      
      return {
        success: true,
        data: mockData,
        error: null
      };
    } catch (error: any) {
      console.error('Error getting patient dashboard data:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  async saveAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment> {
    try {
      // Convert to snake_case
      const snakeCaseAssessment = convertObjectToSnakeCase(assessment);
      
      const { data, error } = await supabase
        .from('assessments')
        .insert(snakeCaseAssessment)
        .select('*')
        .single();
        
      if (error) throw error;
      
      return convertObjectToCamelCase(data) as Assessment;
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  }

  async updateMetrics(patientId: string, metricsUpdate: UserMetricsUpdate): Promise<boolean> {
    try {
      // This is a placeholder - would update metrics in a real implementation
      return true;
    } catch (error) {
      console.error('Error updating metrics:', error);
      return false;
    }
  }

  async getUserActivity(userId: string, limit: number = 10): Promise<{
    success: boolean;
    data: UserActivity[];
    error: string | null;
  }> {
    try {
      // First check if the user_activity table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('user_activity')
        .select('id')
        .limit(1);
      
      // If table doesn't exist or error, we'll create recent activities from other tables
      if (checkError || !tableExists) {
        return await this.generateUserActivityFromEvents(userId, limit);
      }
      
      // If the user_activity table exists, query it directly
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      // Convert to camelCase
      return {
        success: true,
        data: (data || []).map(activity => convertObjectToCamelCase(activity)) as UserActivity[],
        error: null
      };
    } catch (error: any) {
      console.error('Error getting user activity:', error);
      // Fallback to generated activities on error
      return await this.generateUserActivityFromEvents(userId, limit);
    }
  }
  
  private async generateUserActivityFromEvents(userId: string, limit: number): Promise<{
    success: boolean;
    data: UserActivity[];
    error: string | null;
  }> {
    const activities: UserActivity[] = [];
    
    try {
      // 1. Get recent auth sessions
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        // Add current login session
        const metadata = authData.user.user_metadata || {};
        const current = metadata.current_session || {};
        
        if (current.last_login) {
          activities.push({
            id: `login-${Date.now()}`,
            activityType: 'login',
            description: 'Logged in successfully',
            deviceInfo: `${current.os || 'Unknown OS'} • ${current.device_type || 'Unknown Device'} • ${current.browser || 'Unknown Browser'}`,
            timestamp: current.last_login,
            metadata: { ip: current.ip_address, userAgent: current.user_agent }
          });
        }
      }
      
      // 2. Get recent profile updates
      const { data: profileData } = await supabase
        .from('patient_profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();
        
      if (profileData && profileData.updated_at) {
        activities.push({
          id: `profile-${Date.now() + 1}`,
          activityType: 'profile_update',
          description: 'Updated profile information',
          timestamp: profileData.updated_at,
        });
      }
      
      // 3. Get recent appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, start_time, status, created_at')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (appointments) {
        appointments.forEach((apt, index) => {
          activities.push({
            id: `appointment-${apt.id}`,
            activityType: 'appointment',
            description: apt.status === 'scheduled' 
              ? 'Scheduled a new appointment' 
              : `Appointment ${apt.status}`,
            timestamp: apt.created_at,
            metadata: { appointmentId: apt.id, startTime: apt.start_time }
          });
        });
      }
      
      // 4. Get recent journal entries
      const { data: journal } = await supabase
        .from('journal_entries')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (journal) {
        journal.forEach((entry) => {
          activities.push({
            id: `journal-${entry.id}`,
            activityType: 'journal',
            description: 'Created a journal entry',
            timestamp: entry.created_at,
            metadata: { entryId: entry.id }
          });
        });
      }
      
      // 5. Get recent mood entries
      const { data: moods } = await supabase
        .from('mood_entries')
        .select('id, mood, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);
        
      if (moods) {
        moods.forEach((entry) => {
          activities.push({
            id: `mood-${entry.id}`,
            activityType: 'assessment',
            description: `Recorded mood: ${entry.mood}`,
            timestamp: entry.created_at,
            metadata: { mood: entry.mood }
          });
        });
      }
      
      // 6. Get recent stress assessments
      const { data: stress } = await supabase
        .from('stress_assessments')
        .select('id, score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);
        
      if (stress) {
        stress.forEach((entry) => {
          activities.push({
            id: `stress-${entry.id}`,
            activityType: 'assessment',
            description: `Completed stress assessment`,
            timestamp: entry.created_at,
            metadata: { score: entry.score }
          });
        });
      }
      
      // Sort all activities by timestamp (newest first) and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      
      return {
        success: true,
        data: sortedActivities,
        error: null
      };
    } catch (error: any) {
      console.error('Error generating user activity:', error);
      
      // Return at least the current login if we have it
      return {
        success: true,
        data: activities.length > 0 ? 
          activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit) : 
          this.getFallbackActivities(userId),
        error: error.message
      };
    }
  }
  
  private getFallbackActivities(userId: string): UserActivity[] {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    return [
      {
        id: `login-${Date.now()}`,
        activityType: 'login',
        description: 'Logged in successfully',
        deviceInfo: getFormattedDeviceInfo(),
        timestamp: now.toISOString(),
      },
      {
        id: `profile-${Date.now() + 1}`,
        activityType: 'profile_update',
        description: 'Updated profile information',
        timestamp: yesterday.toISOString(),
      },
      {
        id: `assessment-${Date.now() + 2}`,
        activityType: 'assessment',
        description: 'Completed stress assessment',
        timestamp: twoDaysAgo.toISOString(),
      }
    ];
  }

  async recordUserActivity(activity: Omit<UserActivity, 'id'>): Promise<boolean> {
    try {
      // First check if the user_activity table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('user_activity')
        .select('id')
        .limit(1);
      
      // If table doesn't exist or error, try to create it
      if (checkError) {
        console.warn('User activity table may not exist, will attempt to create:', checkError);
        // Not attempting to create table here as it requires additional permissions
        return false;
      }
      
      // Insert the activity record
      const { error } = await supabase
        .from('user_activity')
        .insert({
          ...convertObjectToSnakeCase(activity),
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
        });
        
      if (error) {
        console.error('Error recording user activity:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in recordUserActivity:', error);
      return false;
    }
  }
} 