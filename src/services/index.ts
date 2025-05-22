import { UserWithMetadata } from './auth/auth.service';
import { supabase } from '@/lib/supabase';

// Import the mood mentor service
import { moodMentorService } from './mood-mentor/mood-mentor.service';
import type { IMoodMentorService } from './mood-mentor/mood-mentor.interface';

// Export implemented services
export { authService } from './auth/auth.service';
export { appointmentService } from './appointments/appointment.service';
export { messageService } from './messages/message.service';
export { userService } from './users/user.service';

// Service Interfaces
export interface ServiceResponse<T> {
  data?: T;
  error?: string;
}

export interface AppointmentData {
  patientId: string;
  moodMentorId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
}

export interface AppointmentService {
  bookAppointment: (data: AppointmentData) => Promise<ServiceResponse<void>>;
  getAppointments: (userId: string) => Promise<ServiceResponse<any[]>>;
  cancelAppointment: (appointmentId: string) => Promise<ServiceResponse<void>>;
  getMoodMentorAppointments: (mentorId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }) => Promise<any[]>;
}

export interface UserService {
  getProfile: (userId: string) => Promise<ServiceResponse<any>>;
  updateProfile: (userId: string, data: Partial<UserWithMetadata>) => Promise<ServiceResponse<void>>;
}

export interface MessageService {
  sendMessage: (data: { senderId: string; recipientId: string; content: string }) => Promise<ServiceResponse<void>>;
  getMessages: (userId: string) => Promise<ServiceResponse<any[]>>;
  markAsRead: (messageId: string) => Promise<ServiceResponse<void>>;
}

// TODO: These services will be implemented later
interface DataService {
  saveStressAssessment: (assessment: any) => Promise<ServiceResponse<void>>;
  getJournalEntry: (entryId: string) => Promise<ServiceResponse<any>>;
  generateShareCode: (entryId: string) => Promise<ServiceResponse<any>>;
  getJournalEntries: (userId: string) => Promise<ServiceResponse<any[]>>;
  deleteJournalEntry: (entryId: string) => Promise<ServiceResponse<void>>;
  getResources: () => Promise<ServiceResponse<any[]>>;
  getResourcesByMentor: (mentorId: string) => Promise<ServiceResponse<any[]>>;
  saveResource: (resource: any) => Promise<ServiceResponse<void>>;
  deleteResource: (resourceId: string) => Promise<ServiceResponse<void>>;
}

interface ApiService {}
interface PatientService {}

// Update the MoodMentorService interface
export type { IMoodMentorService as MoodMentorService };

// Export the service instance
export { moodMentorService };

export const dataService: DataService = {
  async saveStressAssessment(assessment: any) {
    try {
      const { error } = await supabase
        .from('stress_assessments')
        .insert(assessment);
      
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to save stress assessment' };
    }
  },

  async getJournalEntry(entryId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch journal entry' };
    }
  },

  async generateShareCode(entryId: string) {
    try {
      const shareCode = Math.random().toString(36).substring(2, 15);
      const { error } = await supabase
        .from('journal_entries')
        .update({ share_code: shareCode, is_shared: true })
        .eq('id', entryId);
      
      if (error) throw error;
      return { data: { share_code: shareCode } };
    } catch (error) {
      return { error: 'Failed to generate share code' };
    }
  },

  async getJournalEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch journal entries' };
    }
  },

  async deleteJournalEntry(entryId: string) {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to delete journal entry' };
    }
  },

  async getResources() {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch resources' };
    }
  },

  async getResourcesByMentor(mentorId: string) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('mood_mentor_id', mentorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch mentor resources' };
    }
  },

  async saveResource(resource: any) {
    try {
      const { error } = await supabase
        .from('resources')
        .insert(resource);
      
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to save resource' };
    }
  },

  async deleteResource(resourceId: string) {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);
      
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to delete resource' };
    }
  }
};

export const apiService: ApiService = {};
export const patientService: PatientService = {}; 