import { supabase } from '@/lib/supabase';
import { tables } from '@/lib/supabase';
import { ServiceResponse } from '../index';
import { 
  Message, 
  Conversation, 
  ConversationParticipant, 
  ConversationWithLastMessage, 
  MessagingService 
} from './messaging.interface';

export default class SupabaseMessagingService implements MessagingService {
  async getOrCreateConversation(
    user1Id: string, 
    user2Id: string, 
    appointmentId?: string
  ): Promise<ServiceResponse<string>> {
    try {
      console.log(`Attempting to get or create conversation between ${user1Id} and ${user2Id}`);
      
      // First check if the conversations table exists
      const { error: tableCheckError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1)
        .maybeSingle();
        
      // If the conversations table doesn't exist, return an error
      if (tableCheckError && tableCheckError.message && 
          tableCheckError.message.includes('relation "conversations" does not exist')) {
        console.error('Conversations table does not exist');
        return { error: 'Messaging system is not yet initialized. Please check your database setup.' };
      }
      
      // Check if a conversation already exists between these users
      const { data: existingParticipations, error: participationError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user1Id);
        
      if (participationError) {
        console.error('Error checking existing participations:', participationError);
        throw participationError;
      }
      
      if (existingParticipations && existingParticipations.length > 0) {
        // Get all conversation IDs where user1 is a participant
        const user1ConversationIds = existingParticipations.map(p => p.conversation_id);
        
        // Find conversations where user2 is also a participant
        const { data: sharedConversations, error: sharedError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user2Id)
          .in('conversation_id', user1ConversationIds);
          
        if (sharedError) {
          console.error('Error checking shared conversations:', sharedError);
          throw sharedError;
        }
        
        if (sharedConversations && sharedConversations.length > 0) {
          // Use the first shared conversation found
          const conversationId = sharedConversations[0].conversation_id;
          console.log(`Found existing conversation: ${conversationId}`);
          
          // Update the conversation's last_message_at timestamp to ensure it appears at the top
          await supabase
            .from('conversations')
            .update({ 
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);
            
          return { data: conversationId };
        }
      }
      
      // If we get here, we need to create a new conversation
      console.log('Creating new conversation');
      
      // Create a new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          appointment_id: appointmentId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }
      
      // Add both users as participants
      const { error: addParticipantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConversation.id,
            user_id: user1Id,
            joined_at: new Date().toISOString()
          },
          {
            conversation_id: newConversation.id,
            user_id: user2Id,
            joined_at: new Date().toISOString()
          }
        ]);
        
      if (addParticipantsError) {
        console.error('Error adding participants:', addParticipantsError);
        throw addParticipantsError;
      }
      
      // Add a system message to initialize the conversation
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user1Id,
          content: 'Conversation started',
          created_at: new Date().toISOString()
        });
        
      if (msgError) {
        console.warn('Error adding initial message:', msgError);
        // Continue anyway as this is not critical
      }
      
      console.log(`Created new conversation: ${newConversation.id}`);
      return { data: newConversation.id };
    } catch (error: any) {
      console.error('Error getting or creating conversation:', error);
      return { error: error.message || 'Failed to get or create conversation' };
    }
  }

  async getUserConversations(userId: string): Promise<ServiceResponse<ConversationWithLastMessage[]>> {
    try {
      // Get all conversations for the user
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('user_conversations_view')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false });

      if (conversationsError) throw conversationsError;

      // For each conversation, get the other participant's details
      const enhancedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          // Get the other participant in this conversation
          const { data: participantsData, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('user_id', userId);

          if (participantsError) throw participantsError;

          if (participantsData && participantsData.length > 0) {
            const otherUserId = participantsData[0].user_id;
            
            // Get the other user's profile
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', otherUserId)
              .single();

            if (userError) throw userError;

            return {
              ...conv,
              other_participant: userData
            };
          }

          return conv;
        })
      );

      return { data: enhancedConversations };
    } catch (error: any) {
      console.error('Error getting user conversations:', error);
      return { error: error.message || 'Failed to get user conversations' };
    }
  }

  async getConversationMessages(
    conversationId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ServiceResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      // Return messages in chronological order (oldest first)
      return { data: (data || []).reverse() };
    } catch (error: any) {
      console.error('Error getting conversation messages:', error);
      return { error: error.message || 'Failed to get conversation messages' };
    }
  }

  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<ServiceResponse<Message>> {
    try {
      // Insert the new message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          attachment_url: attachmentUrl || null,
          attachment_type: attachmentType || null
        })
        .select()
        .single();

      if (error) throw error;

      // Update the conversation's last_message_at timestamp
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      return { data };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { error: error.message || 'Failed to send message' };
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Get current timestamp
      const now = new Date().toISOString();
      
      // Update all unread messages sent by others to be read
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (messagesError) throw messagesError;

      // Update the user's last_read_at in the conversation
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: now })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (participantError) throw participantError;
      
      return {};
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      return { error: error.message || 'Failed to mark messages as read' };
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Soft delete the message by setting deleted_at
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId); // Ensure the user is the sender

      if (error) throw error;
      
      return {};
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return { error: error.message || 'Failed to delete message' };
    }
  }

  async getConversation(conversationId: string): Promise<ServiceResponse<Conversation>> {
    try {
      // Get the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversationError) throw conversationError;

      // Get the participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          conversation_id,
          joined_at,
          last_read_at,
          user:user_id (
            id,
            full_name:name,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId);

      if (participantsError) throw participantsError;

      return { 
        data: {
          ...conversationData,
          participants: participantsData || []
        } 
      };
    } catch (error: any) {
      console.error('Error getting conversation:', error);
      return { error: error.message || 'Failed to get conversation' };
    }
  }

  subscribeToConversation(conversationId: string, callback: (message: Message) => void) {
    // Subscribe to changes on the messages table for this conversation
    const subscription = supabase
      .channel(`messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Call the callback with the new message
          callback(payload.new as Message);
        }
      )
      .subscribe();

    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      }
    };
  }

  async getConversationByAppointment(appointmentId: string): Promise<ServiceResponse<string | null>> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return { data: null };
        }
        throw error;
      }
      
      return { data: data.id };
    } catch (error: any) {
      console.error('Error getting conversation by appointment:', error);
      return { error: error.message || 'Failed to get conversation by appointment' };
    }
  }
} 