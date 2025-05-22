import { supabase } from '@/lib/supabase';
import { AppointmentService, AppointmentData, ServiceResponse } from '../index';

class SupabaseAppointmentService implements AppointmentService {
  async bookAppointment(data: AppointmentData): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patientId,
          mentor_id: data.moodMentorId,
          title: data.title,
          description: data.description,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          meeting_link: data.meetingLink,
          status: 'pending'
        });

      if (error) throw error;
      return {};
    } catch (error) {
      console.error('Error booking appointment:', error);
      return { error: error.message };
    }
  }

  async getAppointments(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, full_name, email),
          mentor:mentor_id(id, full_name, email)
        `)
        .or(`patient_id.eq.${userId},mentor_id.eq.${userId}`)
        .order('date', { ascending: true });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return { error: error.message };
    }
  }

  async cancelAppointment(appointmentId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { error: error.message };
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
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, full_name, email, avatar_url)
        `)
        .eq('mentor_id', mentorId);
        
      // Apply filters if provided
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.startDate) {
        query = query.gte('start_time', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('start_time', options.endDate);
      }
      
      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Order by date
      query = query.order('start_time', { ascending: true });
        
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
}

export const appointmentService = new SupabaseAppointmentService(); 