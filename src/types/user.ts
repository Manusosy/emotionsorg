/**
 * User type definitions for the application
 */

export type UserRole = 'patient' | 'mood_mentor' | 'admin';

export interface User {
  id: string;
  email: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  date_of_birth?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  patient_id?: string;
  gender?: string;
}

export interface UserProfile {
  id: string;
  patient_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender?: string;
  country: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar_url: string;
  created_at: string;
}

export interface MoodMentorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  bio: string;
  specialty: string;
  hourly_rate: number;
  availability_status: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  isFree?: boolean;
  languages?: string[];
  education?: string;
  experience?: string;
  session_duration?: string;
  rating?: number;
} 