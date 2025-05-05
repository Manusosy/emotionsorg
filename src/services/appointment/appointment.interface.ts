/**
 * Appointment Service Interface
 * Defines the contract for appointment operations
 */

export interface Appointment {
  id: string;
  patientId: string;
  moodMentorId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meetingLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSlot {
  moodMentorId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface IAppointmentService {
  /**
   * Get appointments for a patient
   */
  getPatientAppointments(patientId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Appointment[]>;
  
  /**
   * Get appointments for a mood mentor
   */
  getMoodMentorAppointments(moodMentorId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Appointment[]>;
  
  /**
   * Get a specific appointment by ID
   */
  getAppointment(id: string): Promise<Appointment | null>;
  
  /**
   * Book a new appointment
   */
  bookAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Appointment>;
  
  /**
   * Update an appointment
   */
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null>;
  
  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string, reason?: string): Promise<boolean>;
  
  /**
   * Reschedule an appointment
   */
  rescheduleAppointment(id: string, newDate: string, newStartTime: string, newEndTime: string): Promise<Appointment | null>;
  
  /**
   * Complete an appointment
   */
  completeAppointment(id: string, notes?: string): Promise<Appointment | null>;
  
  /**
   * Get available appointment slots for a mood mentor
   */
  getAvailableSlots(moodMentorId: string, options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AppointmentSlot[]>;
} 