import { supabase } from '@/lib/supabase';
import { AppointmentService, AppointmentData, ServiceResponse } from '../index';
import { tables } from '@/lib/supabase';
import { Appointment } from '@/types/database.types';
// import { messagingService } from '@/services'; // Removed old import
// import { messageService } from '@/services'; // Removed old import
import SupabaseMessagingService from '@/features/messaging/services/messaging.service'; // New import

const newMessagingService = new SupabaseMessagingService(); // Instantiate new service

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
      
      // First get the appointment details to know who to notify
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, patient_id, mentor_id, title, date, start_time')
        .eq('id', appointmentId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching appointment for cancellation:', fetchError);
        return { error: 'Could not find the appointment' };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Update the appointment status
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
      
      // Create a notification for the other party
      try {
        // Determine who to notify (the other person)
        const recipientId = user.id === appointment.patient_id 
          ? appointment.mentor_id 
          : appointment.patient_id;
          
        const isCancelledByMentor = user.id === appointment.mentor_id;
        
        // Format the date for the notification
        const appointmentDate = new Date(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric'
        });
        
        // Create notification
        const notificationData = {
          user_id: recipientId,
          title: 'Appointment Cancelled',
          message: isCancelledByMentor
            ? `Your appointment on ${formattedDate} at ${appointment.start_time} has been cancelled by your mood mentor.${reason ? ` Reason: ${reason}` : ''}`
            : `Your patient has cancelled their appointment scheduled for ${formattedDate} at ${appointment.start_time}.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'appointment',
          is_read: false,
          created_at: new Date().toISOString()
        };
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notifyError) {
          console.error('Error creating cancellation notification:', notifyError);
          // Continue anyway as this is not critical
        }
      } catch (notifyError) {
        console.warn('Error creating cancellation notification:', notifyError);
        // Continue anyway as this is not critical
      }
      
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
      
      // Only allow completion if current status is scheduled or pending
      if (!['scheduled', 'pending'].includes(appointment.status)) {
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
            type: 'appointment_completed',
            message: `Your appointment with your mood mentor has been completed.`,
            created_at: new Date().toISOString()
          });
      } catch (activityError) {
        console.warn('Error creating activity for completed appointment:', activityError);
      }
      
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
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          rating: rating,
          feedback: feedback || null,
          updated_at: new Date().toISOString()
        })
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
      const { status, limit = 10, offset = 0, startDate, endDate } = options || {};
      
      let query = supabase
        .from(tables.appointments)
        .select(`
          *,
          mentor:mentor_id(id, full_name, email, avatar_url, specialty)
        `)
        .eq('patient_id', patientId);

      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      throw error;
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
      const { status, limit = 10, offset = 0, startDate, endDate } = options || {};

      let query = supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id(id, full_name, email, avatar_url)
        `)
        .eq('mentor_id', mentorId);

      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching mood mentor appointments:', error);
      throw error;
    }
  }

  createMeetingLink(patientId: string, mentorId: string): string {
    // Generate a random meeting ID for Google Meet
    const meetingId = Math.random().toString(36).substring(2, 12);
    return `https://meet.google.com/${meetingId}`;
  }

  async getAppointmentById(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id(id, full_name, email, avatar_url),
          mentor:mentor_id(id, full_name, email, avatar_url, specialty)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error fetching appointment by ID:', error);
      return { error: error.message };
    }
  }

  async startAppointmentChat(appointmentId: string): Promise<ServiceResponse<string>> {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, patient_id, mentor_id')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('Error fetching appointment for chat:', fetchError);
        return { error: 'Appointment not found.' };
      }

      if (!appointment) {
        return { error: 'Appointment not found.' };
      }

      // Use the conversational messaging system with the new schema
      const { data: conversationId, error } = await newMessagingService.getOrCreateConversation(
        appointment.patient_id,
        appointment.mentor_id,
        appointment.id
      );

      if (error) {
        console.error('Error getting or creating conversation for appointment:', error);
        return { error: 'Failed to start chat for appointment.' };
      }

      return { data: conversationId };
    } catch (error: any) {
      console.error('Unexpected error starting appointment chat:', error);
      return { error: 'An unexpected error occurred while starting chat.' };
    }
  }

  async startAppointmentSession(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, status, meeting_link')
        .eq('id', appointmentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching appointment for session:', fetchError);
        return { error: 'Appointment not found for session.' };
      }

      if (!appointment) {
        return { error: 'Appointment not found for session.' };
      }

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        return { error: `Cannot start session for appointment with status: ${appointment.status}` };
      }

      // Update the appointment status to scheduled if it's not already completed or cancelled
      if (appointment.status !== 'scheduled') {
        const { error: updateError } = await supabase
          .from(tables.appointments)
          .update({ 
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('Error updating appointment status to scheduled:', updateError);
          return { error: 'Failed to start session: ' + updateError.message };
        }
      }
      
      return { data: { meeting_link: appointment.meeting_link } };
    } catch (error: any) {
      console.error('Error starting appointment session:', error);
      return { error: error.message };
    }
  }
}

export const appointmentService = new SupabaseAppointmentService(); 