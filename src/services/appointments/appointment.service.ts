import { supabase } from '@/lib/supabase';
import { AppointmentService, AppointmentData, ServiceResponse } from '../index';
import { tables } from '@/lib/supabase';
import { Appointment } from '@/types/database.types';
import { messagingService } from '@/services';

class SupabaseAppointmentService implements AppointmentService {
  async bookAppointment(data: AppointmentData): Promise<ServiceResponse<any>> {
    try {
      console.log('Booking appointment with data:', JSON.stringify(data, null, 2));
      
      // Verify the mentor_id exists in mood_mentor_profiles table instead of auth.users
      const { data: mentorProfile, error: mentorCheckError } = await supabase
        .from('mood_mentor_profiles')
        .select('id, user_id')
        .eq('user_id', data.mentor_id)
        .maybeSingle();
        
      if (mentorCheckError) {
        console.error('Error checking mentor profile:', mentorCheckError);
        return { error: 'Error verifying mentor profile: ' + mentorCheckError.message };
      }
      
      if (!mentorProfile) {
        console.error('Mentor profile not found for user_id:', data.mentor_id);
        return { error: 'Mentor profile not found. The user may not be registered as a mood mentor.' };
      }
      
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
  
  async completeAppointment(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      // First, get the appointment details to verify it exists
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, mentor_id, patient_id, status')
        .eq('id', appointmentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching appointment for completion:', fetchError);
        return { error: 'Could not find the appointment' };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Check if user is the mentor for this appointment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      if (appointment.mentor_id !== user.id) {
        return { error: 'You are not authorized to complete this appointment' };
      }
      
      // Only allow completion if current status is scheduled, pending, or in-progress
      if (!['scheduled', 'pending', 'in-progress'].includes(appointment.status)) {
        return { error: `Cannot complete appointment with status: ${appointment.status}` };
      }
      
      // Update the appointment status to completed
      const { error: updateError } = await supabase
        .from(tables.appointments)
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
        
      if (updateError) {
        console.error('Error updating appointment status:', updateError);
        return { error: 'Failed to complete the appointment: ' + updateError.message };
      }
      
      // Notify the patient that their appointment was completed (optional)
      try {
        // Create activity for the patient
        await supabase
          .from('activities')
          .insert({
            user_id: appointment.patient_id,
            activity_type: 'appointment',
            title: 'Your appointment was completed',
            description: 'Your mentor has marked your appointment as completed.',
            created_at: new Date().toISOString()
          });
      } catch (notifyError) {
        console.warn('Error creating activity notification:', notifyError);
        // Continue anyway as this is not critical
      }
      
      return { data: { message: 'Appointment completed successfully' } };
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      return { error: error.message || 'Failed to complete appointment' };
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

  async startAppointmentSession(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      // First, get the appointment details
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select(`
          id,
          patient_id,
          mentor_id,
          date,
          start_time,
          end_time,
          status,
          meeting_link,
          meeting_type
        `)
        .eq('id', appointmentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching appointment for session:', fetchError);
        return { error: 'Could not find the appointment' };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Check if user is the mentor or patient
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      const isUserMentor = appointment.mentor_id === user.id;
      const isUserPatient = appointment.patient_id === user.id;
      
      if (!isUserMentor && !isUserPatient) {
        return { error: 'You are not authorized to start this appointment' };
      }
      
      // Check if the appointment is at an appropriate time to start
      const now = new Date();
      const appointmentDate = new Date(appointment.date);
      const [hours, minutes] = appointment.start_time.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Calculate time difference in minutes
      const diffInMinutes = (appointmentDate.getTime() - now.getTime()) / (1000 * 60);
      
      // Mentor can start session 5 minutes early, patient only right on time
      const canStartEarly = isUserMentor && diffInMinutes <= 15 && diffInMinutes >= -60; // Allow mentor to start up to 5 min early and join up to 60 min late
      const isOnTime = diffInMinutes <= 5 && diffInMinutes >= -60; // Allow users to join up to 60 min late
      
      if (!canStartEarly && !isOnTime) {
        if (diffInMinutes > 15) {
          return { error: `This appointment starts in ${Math.ceil(diffInMinutes)} minutes. You can join 5 minutes before the scheduled time.` };
        } else if (diffInMinutes < -60) {
          return { error: 'This appointment has already ended.' };
        }
      }
      
      // Update appointment status to 'in-progress' if it's currently 'scheduled' or 'pending'
      if (appointment.status === 'scheduled' || appointment.status === 'pending') {
        const { error: updateError } = await supabase
          .from(tables.appointments)
          .update({ 
            status: 'in-progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);
          
        if (updateError) {
          console.error('Error updating appointment status:', updateError);
          // Continue anyway as this is not critical
        }
      }
      
      // Return session details
      return { 
        data: {
          appointmentId: appointment.id,
          meetingLink: appointment.meeting_link || `https://meet.emotionsapp.com/${appointment.patient_id}/${appointment.mentor_id}`,
          meetingType: appointment.meeting_type,
          participantRole: isUserMentor ? 'mentor' : 'patient',
          appointmentDate: appointment.date,
          startTime: appointment.start_time,
          endTime: appointment.end_time
        }
      };
    } catch (error: any) {
      console.error('Error starting appointment session:', error);
      return { error: error.message || 'Failed to start appointment session' };
    }
  }
}

export const appointmentService = new SupabaseAppointmentService(); 