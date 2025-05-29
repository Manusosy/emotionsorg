import { supabase } from '@/lib/supabase';
import { AppointmentService, AppointmentData, ServiceResponse } from '../index';
import { tables } from '@/lib/supabase';
import { Appointment } from '@/types/database.types';
import { messagingService } from '@/services';

class SupabaseAppointmentService implements AppointmentService {
  async bookAppointment(data: AppointmentData): Promise<ServiceResponse<any>> {
    try {
      console.log('Booking appointment with data:', JSON.stringify(data, null, 2));
      
      // Use the correct field names that match the database schema
      const appointmentData = {
        patient_id: data.patient_id,
        mentor_id: data.mentor_id,
        title: data.title,
        description: data.description || null,
        date: data.date, // Use date as in the schema
        start_time: data.start_time, // Use start_time as in the schema
        end_time: data.end_time,
        meeting_link: data.meeting_link || `https://meet.emotionsapp.com/${data.patient_id}/${data.mentor_id}`,
        meeting_type: data.meeting_type, // Use meeting_type as in the schema
        notes: data.notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Formatted appointment data:', JSON.stringify(appointmentData, null, 2));
      
      const { data: result, error } = await supabase
        .from(tables.appointments)
        .insert(appointmentData)
        .select();

      if (error) {
        console.error('Supabase error when booking appointment:', error);
        throw error;
      }
      
      console.log('Appointment booked successfully:', result);
      return { data: result };
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      return { error: error.message || 'Failed to book appointment' };
    }
  }

  async getAppointments(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id(id, full_name, email, avatar_url),
          mentor:mentor_id(id, full_name, email, avatar_url, specialty)
        `)
        .or(`patient_id.eq.${userId},mentor_id.eq.${userId}`)
        .order('date', { ascending: true });

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      return { error: error.message };
    }
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      return { error: error.message };
    }
  }
  
  async rescheduleAppointment(
    appointmentId: string, 
    newDate: string, 
    newStartTime: string, 
    newEndTime: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          status: 'rescheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      return { error: error.message };
    }
  }
  
  async completeAppointment(appointmentId: string, notes?: string): Promise<ServiceResponse<void>> {
    try {
      const updateData: any = { 
        status: 'completed',
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from(tables.appointments)
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      return { error: error.message };
    }
  }
  
  async rateAppointment(
    appointmentId: string, 
    rating: number, 
    feedback?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const updateData: any = { 
        rating,
        updated_at: new Date().toISOString()
      };
      
      if (feedback) {
        updateData.feedback = feedback;
      }
      
      const { error } = await supabase
        .from(tables.appointments)
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error rating appointment:', error);
      return { error: error.message };
    }
  }
  
  async getPatientAppointments(patientId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }): Promise<any[]> {
    try {
      // Use the patient_appointments_view for better performance and data structure
      let query = supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', patientId);
        
      // Apply filters if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Order by date and time
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
        
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching patient appointments:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception fetching patient appointments:', error);
      return [];
    }
  }

  async getMoodMentorAppointments(mentorId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }): Promise<any[]> {
    try {
      // Use the mentor_appointments_view for better performance and data structure
      let query = supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('mentor_id', mentorId);
        
      // Apply filters if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Order by date and time
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
        
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching mentor appointments:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception fetching mentor appointments:', error);
      return [];
    }
  }

  // Helper method to create a meeting link
  createMeetingLink(patientId: string, mentorId: string): string {
    return `https://meet.emotionsapp.com/${patientId}/${mentorId}`;
  }

  async startAppointmentChat(appointmentId: string): Promise<ServiceResponse<string>> {
    try {
      // Get the appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from(tables.appointments)
        .select('patient_id, mentor_id')
        .eq('id', appointmentId)
        .single();
      
      if (appointmentError) throw appointmentError;
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Get or create a conversation for this appointment
      const { data: conversationId, error } = await messagingService.getOrCreateConversation(
        appointment.patient_id,
        appointment.mentor_id,
        appointmentId
      );
      
      if (error) throw error;
      
      return { data: conversationId };
    } catch (error: any) {
      console.error('Error starting appointment chat:', error);
      return { error: error.message || 'Failed to start appointment chat' };
    }
  }
}

export const appointmentService = new SupabaseAppointmentService(); 