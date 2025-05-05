import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../services'
/**
 * Basic Database Types
 * These define the data models used throughout the application
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  patient_id?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role: 'user' | 'admin' | 'mood_mentor';
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  mood_mentor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_link?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string;
  mood_score?: number;
  tags?: string[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number;
  notes?: string;
  tags?: string[];
  activities?: string[];
  created_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  type: string;
  score: number;
  responses: Record<string, any>;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string;
  category: string;
  tags?: string[];
  created_at: string;
  created_by?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  group_type: string;
  meeting_schedule: string;
  max_participants: number;
  mood_mentor_id: string;
  created_at: string;
  updated_at: string;
}

// Mock enums
export enum mood_type {
  HAPPY = 'happy',
  CONTENT = 'content',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  DEPRESSED = 'depressed',
  ANXIOUS = 'anxious',
  STRESSED = 'stressed',
  ANGRY = 'angry',
  EXCITED = 'excited',
  GRATEFUL = 'grateful'
}

// Database namespace mock to match Supabase-generated types
export namespace Database {
  export namespace public {
    export namespace Tables {
      export interface journal_entries {
        Row: JournalEntry;
      }
      export interface mood_entries {
        Row: MoodEntry;
      }
      export interface user_profiles {
        Row: UserProfile;
      }
      export interface appointments {
        Row: Appointment;
      }
      export interface messages {
        Row: Message;
      }
      export interface assessments {
        Row: Assessment;
      }
      export interface resources {
        Row: Resource;
      }
      export interface notifications {
        Row: Notification;
      }
      export interface support_groups {
        Row: SupportGroup;
      }
    }
    export namespace Enums {
      export type mood_type = 'happy' | 'content' | 'neutral' | 'sad' | 'depressed' | 'anxious' | 'stressed' | 'angry' | 'excited' | 'grateful';
    }
  }
} 
