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
      // First check if the conversations table exists
      const { error: tableCheckError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1)
        .maybeSingle();
        
      // If the conversations table doesn't exist, try to use direct messaging
      if (tableCheckError && tableCheckError.message && 
          tableCheckError.message.includes('relation "conversations" does not exist')) {
        console.log('Conversations table does not exist, using direct messaging fallback');
        
        // For direct messaging, we can create a deterministic conversation ID
        const conversationId = [user1Id, user2Id].sort().join('_');
        
        // Try to send a system message to initialize the conversation
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            sender_id: user1Id,
            recipient_id: user2Id,
            content: 'Conversation started',
            read: false,
            created_at: new Date().toISOString()
          });
          
        if (msgError) {
          // If direct messaging fails too, we're out of options
          if (msgError.message && msgError.message.includes('relation "messages" does not exist')) {
            return { error: 'Messaging system is not yet initialized.' };
          }
          throw msgError;
        }
        
        return { data: conversationId };
      }
      
      // Try to use the RPC function first
      try {
        const { data, error } = await supabase
          .rpc('get_or_create_conversation', { 
            user1_id: user1Id, 
            user2_id: user2Id,
            appointment_id: appointmentId || null
          });

        if (!error && data) {
          return { data };
        }
        
        // If RPC fails but not because it doesn't exist, throw the error
        if (error && !error.message.includes('function get_or_create_conversation() does not exist')) {
          throw error;
        }
        
        // If we get here, the RPC function doesn't exist, so use manual creation
        console.log('RPC function does not exist, falling back to manual conversation creation');
      } catch (rpcError) {
        console.log('RPC call failed, falling back to manual conversation creation', rpcError);
        // Continue to manual conversation creation
      }
      
      // Manual conversation creation process
      // 1. Check if a conversation already exists between these users
      const { data: existingConversations, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId || null);
        
      if (findError) throw findError;
      
      if (existingConversations && existingConversations.length > 0) {
        // Find a conversation where both users are participants
        for (const conversation of existingConversations) {
          const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversation.id);
            
          if (participantsError) continue;
          
          const participantIds = participants.map(p => p.user_id);
          if (participantIds.includes(user1Id) && participantIds.includes(user2Id)) {
            return { data: conversation.id };
          }
        }
      }
      
      // 2. If no existing conversation, create a new one
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
        
      if (createError) throw createError;
      
      // 3. Add both users as participants
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
        
      if (addParticipantsError) throw addParticipantsError;
      
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