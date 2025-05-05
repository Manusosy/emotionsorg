import { IMessageService, ChatMessage, ConversationItem } from './message.interface';
import { userService } from '../user/user.service';

/**
 * Mock Message Service
 * Implements the MessageService interface with mock functionality
 */
export class MockMessageService implements IMessageService {
  // Mock data
  private messages: Record<string, ChatMessage> = {};
  private conversations: Record<string, { 
    id: string;
    participants: string[];
    messages: string[];
  }> = {};
  
  // Subscriptions
  private subscriptions: Record<string, ((message: ChatMessage) => void)[]> = {};
  
  constructor() {
    // Initialize with some example data for testing
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Create a few sample conversations and messages
    const conversation1 = {
      id: 'conv1',
      participants: ['1', '2'], // user and mentor
      messages: []
    };
    
    const conversation2 = {
      id: 'conv2',
      participants: ['1', '3'], // user and another user
      messages: []
    };
    
    this.conversations[conversation1.id] = conversation1;
    this.conversations[conversation2.id] = conversation2;
    
    // Add some messages to the conversations
    const messages = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: '2',
        receiverId: '1',
        content: 'Hello, how are you feeling today?',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        read: true
      },
      {
        id: 'msg2',
        conversationId: 'conv1',
        senderId: '1',
        receiverId: '2',
        content: 'I\'m doing better, thanks for checking in.',
        timestamp: new Date(Date.now() - 86400000 * 1.9).toISOString(),
        read: true
      },
      {
        id: 'msg3',
        conversationId: 'conv1',
        senderId: '2',
        receiverId: '1',
        content: 'Great to hear! Have you been using the meditation techniques we discussed?',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        read: false
      },
      {
        id: 'msg4',
        conversationId: 'conv2',
        senderId: '3',
        receiverId: '1',
        content: 'Hi there! I just joined the support group.',
        timestamp: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        read: false
      }
    ];
    
    for (const message of messages) {
      this.messages[message.id] = message as ChatMessage;
      this.conversations[message.conversationId].messages.push(message.id);
    }
  }
  
  async getConversations(userId: string): Promise<ConversationItem[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userConversations = Object.values(this.conversations)
      .filter(conv => conv.participants.includes(userId));
    
    const conversationItems: ConversationItem[] = [];
    
    for (const conv of userConversations) {
      // Find the other participant
      const otherUserId = conv.participants.find(id => id !== userId) || '';
      
      // Get the user profile for the other participant
      const otherUser = await userService.getUserProfile(otherUserId);
      
      if (!otherUser) continue;
      
      // Get the messages for this conversation
      const conversationMessages = conv.messages
        .map(msgId => this.messages[msgId])
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Get the last message
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      
      // Count unread messages
      const unreadCount = conversationMessages.filter(
        msg => msg.receiverId === userId && !msg.read
      ).length;
      
      conversationItems.push({
        id: conv.id,
        otherUserId,
        otherUserName: otherUser.name,
        otherUserAvatar: otherUser.avatarUrl,
        lastMessage: lastMessage?.content,
        lastMessageTimestamp: lastMessage?.timestamp,
        unreadCount
      });
    }
    
    return conversationItems.sort((a, b) => {
      if (!a.lastMessageTimestamp) return 1;
      if (!b.lastMessageTimestamp) return -1;
      return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
    });
  }
  
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const conversation = this.conversations[conversationId];
    
    if (!conversation) {
      return [];
    }
    
    return conversation.messages
      .map(msgId => this.messages[msgId])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  async sendMessage(message: {
    conversationId?: string;
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<ChatMessage> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let conversationId = message.conversationId;
    
    // If no conversation ID is provided, find or create one
    if (!conversationId) {
      // Look for an existing conversation between these users
      const existingConversation = Object.values(this.conversations)
        .find(conv => 
          conv.participants.includes(message.senderId) && 
          conv.participants.includes(message.receiverId)
        );
      
      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create a new conversation
        conversationId = `conv-${Date.now()}`;
        this.conversations[conversationId] = {
          id: conversationId,
          participants: [message.senderId, message.receiverId],
          messages: []
        };
      }
    }
    
    // Create the new message
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Add the message to storage
    this.messages[newMessage.id] = newMessage;
    this.conversations[conversationId].messages.push(newMessage.id);
    
    // Notify subscribers
    if (this.subscriptions[conversationId]) {
      for (const callback of this.subscriptions[conversationId]) {
        callback(newMessage);
      }
    }
    
    return newMessage;
  }
  
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const conversation = this.conversations[conversationId];
    
    if (!conversation) {
      return false;
    }
    
    let updated = false;
    
    for (const msgId of conversation.messages) {
      const message = this.messages[msgId];
      
      if (message.receiverId === userId && !message.read) {
        this.messages[msgId] = { ...message, read: true };
        updated = true;
      }
    }
    
    return updated;
  }
  
  subscribeToConversation(
    conversationId: string, 
    callback: (message: ChatMessage) => void
  ): { unsubscribe: () => void } {
    // Initialize the subscription array if it doesn't exist
    if (!this.subscriptions[conversationId]) {
      this.subscriptions[conversationId] = [];
    }
    
    // Add the callback to the subscription array
    this.subscriptions[conversationId].push(callback);
    
    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        this.subscriptions[conversationId] = this.subscriptions[conversationId].filter(
          cb => cb !== callback
        );
      }
    };
  }
}

// Export a singleton instance
export const messageService: IMessageService = new MockMessageService(); 