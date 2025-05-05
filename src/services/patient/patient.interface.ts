/**
 * Patient Service Interface
 * Defines the contract for patient-related operations
 */

import { UserProfile } from '../user/user.interface';

export interface Appointment {
  id: string;
  patientId: string;
  moodMentorId: string;
  timestamp: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
}

export interface AppointmentReport {
  id: string;
  appointmentId: string;
  patientId: string;
  moodMentorId: string;
  date: string;
  summary: string;
  recommendations: string[];
  followUpDate?: string;
  moodScore?: number;
}

export interface PatientMetric {
  id: string;
  patientId: string;
  type: string;
  value: number;
  timestamp: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  type: string;
  date: string;
  score: number;
  responses: Record<string, any>;
}

export interface IPatientService {
  /**
   * Get a patient's appointments
   */
  getAppointments(patientId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]>;
  
  /**
   * Get a patient's appointment reports
   */
  getAppointmentReports(options: {
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
  }>;
  
  /**
   * Create an appointment
   */
  createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment>;
  
  /**
   * Update an appointment
   */
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null>;
  
  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string): Promise<boolean>;
  
  /**
   * Get a patient's metrics
   */
  getMetrics(patientId: string, options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PatientMetric[]>;
  
  /**
   * Get a patient's assessments
   */
  getAssessments(patientId: string, options?: {
    type?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Assessment[]>;
  
  /**
   * Mock appointment reports for development
   */
  getMockAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): AppointmentReport[];
} 