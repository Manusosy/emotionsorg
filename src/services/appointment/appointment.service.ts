import { 
  IAppointmentService, 
  Appointment, 
  AppointmentSlot 
} from './appointment.interface';
import { moodMentorService } from '../mood-mentor/mood-mentor.service';
import { AvailabilitySlot } from '../mood-mentor/mood-mentor.interface';

/**
 * Mock Appointment Service
 * Implements the AppointmentService interface with mock functionality
 */
export class MockAppointmentService implements IAppointmentService {
  // Mock data
  private appointments: Record<string, Appointment> = {};
  
  constructor() {
    // Initialize with some example data for testing
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Create some mock appointments
    const today = new Date();
    const statuses: Array<'scheduled' | 'completed' | 'cancelled' | 'rescheduled'> = 
      ['scheduled', 'completed', 'cancelled', 'rescheduled'];
    
    // Create 10 random appointments
    for (let i = 0; i < 10; i++) {
      // Generate a random date within 30 days (past or future)
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + Math.floor(Math.random() * 60) - 30);
      
      // Generate time slots
      const startHour = 9 + Math.floor(Math.random() * 8); // Between 9 AM and 5 PM
      const endHour = startHour + 1;
      
      const formatTime = (hour: number) => 
        `${hour.toString().padStart(2, '0')}:00`;
      
      const startTime = formatTime(startHour);
      const endTime = formatTime(endHour);
      
      // Determine status based on date
      let status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
      if (appointmentDate < today) {
        // Past appointments are either completed, cancelled, or rescheduled
        status = statuses[Math.floor(Math.random() * 3) + 1];
      } else {
        // Future appointments are scheduled
        status = 'scheduled';
      }
      
      const id = `appt-${Math.random().toString(36).substring(2, 15)}`;
      
      // Set random patient and mood mentor IDs
      const patientId = '1'; // Default user from mock user service
      const moodMentorId = String(Math.floor(Math.random() * 4) + 2); // IDs 2-5 from mock mentor service
      
      this.appointments[id] = {
        id,
        patientId,
        moodMentorId,
        title: 'Therapy Session',
        description: 'Regular therapy session',
        date: appointmentDate.toISOString().split('T')[0],
        startTime,
        endTime,
        status,
        meetingLink: status === 'scheduled' ? `https://meet.example.com/${id}` : undefined,
        notes: status === 'completed' ? 'Patient showed improvement in anxiety symptoms.' : undefined,
        createdAt: new Date(appointmentDate.getTime() - 86400000 * 7).toISOString(),
        updatedAt: new Date(appointmentDate.getTime() - 86400000 * 2).toISOString()
      };
    }
  }
  
  async getPatientAppointments(patientId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Appointment[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const limit = options?.limit || 20;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let appointments = Object.values(this.appointments)
      .filter(appointment => appointment.patientId === patientId)
      .filter(appointment => {
        // Filter by status if specified
        if (options?.status && appointment.status !== options.status) {
          return false;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
          const appointmentDate = new Date(appointment.date);
          
          if (startDate && appointmentDate < startDate) {
            return false;
          }
          
          if (endDate && appointmentDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by date, then start time
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, limit);
    
    return appointments;
  }
  
  async getMoodMentorAppointments(moodMentorId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Appointment[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const limit = options?.limit || 20;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let appointments = Object.values(this.appointments)
      .filter(appointment => appointment.moodMentorId === moodMentorId)
      .filter(appointment => {
        // Filter by status if specified
        if (options?.status && appointment.status !== options.status) {
          return false;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
          const appointmentDate = new Date(appointment.date);
          
          if (startDate && appointmentDate < startDate) {
            return false;
          }
          
          if (endDate && appointmentDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by date, then start time
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, limit);
    
    return appointments;
  }
  
  async getAppointment(id: string): Promise<Appointment | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.appointments[id] || null;
  }
  
  async bookAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const id = `appt-${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date().toISOString();
    
    const newAppointment: Appointment = {
      id,
      ...appointment,
      status: 'scheduled',
      meetingLink: `https://meet.example.com/${id}`,
      createdAt: now,
      updatedAt: now
    };
    
    this.appointments[id] = newAppointment;
    
    return newAppointment;
  }
  
  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return null;
    }
    
    // Don't allow changing certain fields through this method
    const { status, createdAt, ...updatableData } = data;
    
    this.appointments[id] = {
      ...appointment,
      ...updatableData,
      updatedAt: new Date().toISOString()
    };
    
    return this.appointments[id];
  }
  
  async cancelAppointment(id: string, reason?: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return false;
    }
    
    this.appointments[id] = {
      ...appointment,
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : appointment.notes,
      updatedAt: new Date().toISOString()
    };
    
    return true;
  }
  
  async rescheduleAppointment(id: string, newDate: string, newStartTime: string, newEndTime: string): Promise<Appointment | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return null;
    }
    
    this.appointments[id] = {
      ...appointment,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'rescheduled',
      updatedAt: new Date().toISOString()
    };
    
    return this.appointments[id];
  }
  
  async completeAppointment(id: string, notes?: string): Promise<Appointment | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return null;
    }
    
    this.appointments[id] = {
      ...appointment,
      status: 'completed',
      notes: notes || appointment.notes,
      updatedAt: new Date().toISOString()
    };
    
    return this.appointments[id];
  }
  
  async getAvailableSlots(moodMentorId: string, options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AppointmentSlot[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Get mood mentor's general availability
    const mentorResponse = await moodMentorService.getMoodMentorById(moodMentorId);
    if (!mentorResponse.success || !mentorResponse.data) {
      return [];
    }
    
    const mentor = mentorResponse.data;
    const mentorAvailability = mentor.availability || [];
    
    // Convert dates to Date objects
    const startDate = options?.startDate 
      ? new Date(options.startDate) 
      : new Date();
    
    // Default to 2 weeks from startDate if no endDate is provided
    const endDate = options?.endDate 
      ? new Date(options.endDate) 
      : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    // Get current appointments to check for conflicts
    const existingAppointments = await this.getMoodMentorAppointments(moodMentorId, {
      status: 'scheduled',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const slots: AppointmentSlot[] = [];
    
    // Generate available slots based on mentor's availability
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' }) as 
        'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      
      // Get all time slots for this day of the week
      const daySlots = mentorAvailability.filter(slot => slot.day === dayOfWeek);
      
      if (daySlots.length === 0) continue;
      
      // For each availability slot, generate hourly appointment slots
      for (const availSlot of daySlots) {
        const slots_for_day = this.generateTimeSlotsFromAvailability(
          date.toISOString().split('T')[0],
          availSlot,
          moodMentorId
        );
        
        // Filter out slots that conflict with existing appointments
        for (const slot of slots_for_day) {
          // Check if slot conflicts with any existing appointment
          const hasConflict = existingAppointments.some(appointment => 
            appointment.date === slot.date &&
            (
              (slot.startTime >= appointment.startTime && slot.startTime < appointment.endTime) ||
              (slot.endTime > appointment.startTime && slot.endTime <= appointment.endTime) ||
              (slot.startTime <= appointment.startTime && slot.endTime >= appointment.endTime)
            )
          );
          
          slot.available = !hasConflict;
          slots.push(slot);
        }
      }
    }
    
    return slots;
  }
  
  private generateTimeSlotsFromAvailability(
    date: string, 
    availabilitySlot: AvailabilitySlot,
    moodMentorId: string
  ): AppointmentSlot[] {
    const slots: AppointmentSlot[] = [];
    
    // Parse the start and end times
    const [startHour, startMinute] = availabilitySlot.startTime.split(':').map(Number);
    const [endHour, endMinute] = availabilitySlot.endTime.split(':').map(Number);
    
    // Convert to minutes for easier calculation
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    // Generate 1-hour slots
    const slotDurationMinutes = 60;
    
    for (
      let slotStart = startTimeMinutes; 
      slotStart + slotDurationMinutes <= endTimeMinutes; 
      slotStart += slotDurationMinutes
    ) {
      const slotEnd = slotStart + slotDurationMinutes;
      
      // Format times back to HH:MM
      const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };
      
      const startTime = formatTime(slotStart);
      const endTime = formatTime(slotEnd);
      
      slots.push({
        moodMentorId,
        date,
        startTime,
        endTime,
        available: true // This will be updated later based on existing appointments
      });
    }
    
    return slots;
  }
}

// Export a singleton instance
export const appointmentService: IAppointmentService = new MockAppointmentService(); 