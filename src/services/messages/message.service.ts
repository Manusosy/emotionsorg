import { supabase } from '@/lib/supabase';
import { MessageService, ServiceResponse } from '../index';

class SupabaseMessageService implements MessageService {
  async sendMessage(data: { senderId: string; recipientId: string; content: string }): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: data.senderId,
          recipient_id: data.recipientId,
          content: data.content,
          read: false
        });

      if (error) throw error;
      return {};
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: error.message };
    }
  }

  async getMessages(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, full_name, email),
          recipient:recipient_id(id, full_name, email)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { error: error.message };
    }
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
      return {};
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error: error.message };
    }
  }
}

export const messageService = new SupabaseMessageService(); 