import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { useAuth } from '@/contexts/authContext';
import { messagingService } from '@/services';
import { toast } from 'sonner';
import { Send, PaperclipIcon, Phone, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { Message, ConversationWithLastMessage } from '@/services/messaging/messaging.interface';
import { Spinner } from '@/components/ui/spinner';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Fetch all conversations for the user
  useEffect(() => {
    if (!user?.id) return;

    async function fetchConversations() {
      setLoadingConversations(true);
      const { data, error } = await messagingService.getUserConversations(user.id);
      
      if (error) {
        toast.error('Failed to load conversations');
        console.error(error);
      } else {
        setConversations(data || []);
        
        // If no conversation ID is provided in the URL but we have conversations,
        // navigate to the first conversation
        if (!conversationId && data && data.length > 0) {
          navigate(`/chat/${data[0].conversation_id}`);
        }
      }
      setLoadingConversations(false);
    }

    fetchConversations();
  }, [user?.id, navigate, conversationId]);

  // Fetch messages for the current conversation
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    async function fetchMessages() {
      setIsLoading(true);
      
      // Mark messages as read when opening the conversation
      await messagingService.markMessagesAsRead(conversationId, user.id);
      
      const { data, error } = await messagingService.getConversationMessages(conversationId);
      
      if (error) {
        toast.error('Failed to load messages');
        console.error(error);
      } else {
        setMessages(data || []);
      }
      
      // Get conversation details to find the other participant
      const { data: conversationData } = await messagingService.getConversation(conversationId);
      
      if (conversationData) {
        const otherUser = conversationData.participants.find(
          (p) => p.user_id !== user.id
        );
        
        if (otherUser && otherUser.user) {
          setOtherParticipant(otherUser.user);
        }
      }
      
      setIsLoading(false);
    }

    fetchMessages();
  }, [conversationId, user?.id]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    
    const subscription = messagingService.subscribeToConversation(
      conversationId,
      (newMessage) => {
        // Add the new message to the list
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        
        // If the message is from the other participant, mark it as read
        if (newMessage.sender_id !== user?.id) {
          messagingService.markMessagesAsRead(conversationId, user.id);
        }
      }
    );
    
    return () => {
      // Unsubscribe when the component unmounts or conversation changes
      subscription.unsubscribe();
    };
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user?.id) return;
    
    try {
      setIsSending(true);
      
      const { error } = await messagingService.sendMessage(
        conversationId,
        user.id,
        newMessage.trim()
      );
      
      if (error) {
        toast.error('Failed to send message');
        console.error(error);
      } else {
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('An error occurred while sending your message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (id: string) => {
    navigate(`/chat/${id}`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <ConversationList
          conversations={conversations.map((conv) => ({
            id: conv.conversation_id,
            otherUser: {
              id: conv.other_participant?.id || '',
              name: conv.other_participant?.full_name || 'Unknown User',
              avatarUrl: conv.other_participant?.avatar_url || undefined,
              role: 'patient' // This would need to be determined from user metadata
            },
            lastMessage: {
              content: conv.last_message_content || 'Start a conversation',
              timestamp: conv.last_message_time || new Date().toISOString(),
              unread: conv.has_unread
            }
          }))}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          isLoading={loadingConversations}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-full">
        {conversationId ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FallbackAvatar
                  src={otherParticipant?.avatar_url}
                  name={otherParticipant?.full_name || 'User'}
                  className="h-10 w-10"
                />
                <div>
                  <h3 className="font-medium">{otherParticipant?.full_name || 'Loading...'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {otherParticipant?.email || ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" title="Audio call">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" title="Video call">
                  <Video className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner size="lg" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      timestamp={message.created_at}
                      isCurrentUser={message.sender_id === user?.id}
                      avatarUrl={
                        message.sender_id === user?.id
                          ? user?.user_metadata?.avatar_url
                          : otherParticipant?.avatar_url
                      }
                      senderName={
                        message.sender_id === user?.id
                          ? user?.user_metadata?.full_name || 'You'
                          : otherParticipant?.full_name || 'User'
                      }
                      read={!!message.read_at}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[60px] max-h-[120px]"
                  disabled={isSending}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the sidebar or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 