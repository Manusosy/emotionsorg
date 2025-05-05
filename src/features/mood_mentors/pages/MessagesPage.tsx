import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { ConversationList, ConversationItem } from "@/components/messaging/ConversationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
// Supabase import removed
// Supabase import removed
import { Loader2, Search, Send, MessageSquare, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MessagesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const conversationsData = await messageService.getConversations(user.id);
        
        // Format conversations for UI
        const formattedConversations = await Promise.all(
          conversationsData.map(async (convo) => {
            // Determine if user is patient or mood mentor
            const isMoodMentor = convo.mood_mentor_id === user.id;
            const otherUserId = isMoodMentor ? convo.patient_id : convo.mood_mentor_id;
            
            try {
              // Get other user's data
              const { data: otherUser, error } = await userService.getUserProfile(otherUserId);
              
              if (error) throw error;
              
              return {
                id: convo.id,
                otherUser: {
                  id: otherUserId,
                  name: otherUser?.full_name || "Unknown User",
                  avatarUrl: otherUser?.avatar_url,
                  role: isMoodMentor ? 'patient' : 'mood_mentor'
                },
                lastMessage: {
                  content: convo.messages?.[0]?.content || "No messages yet",
                  timestamp: convo.last_message_at || convo.created_at,
                  unread: convo.messages?.[0]?.read === false && 
                          convo.messages?.[0]?.recipient_id === user.id
                }
              };
            } catch (error) {
              console.error("Error fetching user profile:", error);
              return {
                id: convo.id,
                otherUser: {
                  id: otherUserId,
                  name: "Unknown User",
                  role: isMoodMentor ? 'patient' : 'mood_mentor'
                },
                lastMessage: {
                  content: convo.messages?.[0]?.content || "No messages yet",
                  timestamp: convo.last_message_at || convo.created_at,
                  unread: false
                }
              };
            }
          })
        );
        
        setConversations(formattedConversations);
        
        // If we have conversations, select the first one
        if (formattedConversations.length > 0) {
          handleSelectConversation(formattedConversations[0].id);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
  }, [user]);
  
  // Handle selecting a conversation
  const handleSelectConversation = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      setActiveConversationId(conversationId);
      
      // Load messages for this conversation
      const messagesData = await messageService.getMessages(conversationId);
      
      // Mark messages as read
      if (user) {
        await messageService.markAsRead(conversationId, user.id);
      }
      
      // Find the conversation to get the other user data
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setOtherUserData(convo.otherUser);
      }
      
      // Format messages for UI
      const formattedMessages = messagesData.map((msg: ChatMessage) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.created_at,
        isCurrentUser: msg.sender_id === user?.id,
        senderName: msg.sender_id === user?.id ? "You" : convo?.otherUser.name || "User",
        read: msg.read
      }));
      
      setMessages(formattedMessages);
      
      // Update conversation list to show message as read
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              unread: false
            }
          };
        }
        return c;
      }));
      
      // Subscribe to new messages for this conversation
      const subscription = messageService.subscribeToConversation(
        conversationId,
        (payload) => {
          const newMessage = payload.new;
          
          // Add new message to the UI
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
            if (messageExists) return prevMessages;
            
            // Mark as read if you are the recipient
            if (newMessage.recipient_id === user?.id && user) {
              messageService.markAsRead(conversationId, user.id);
            }
            
            return [
              ...prevMessages,
              {
                id: newMessage.id,
                content: newMessage.content,
                timestamp: newMessage.created_at,
                isCurrentUser: newMessage.sender_id === user?.id,
                senderName: newMessage.sender_id === user?.id ? "You" : otherUserData?.name || "User",
                read: newMessage.read
              }
            ];
          });
          
          // Update the conversation list
          setConversations(prevConversations => {
            return prevConversations.map(convo => {
              if (convo.id === conversationId) {
                return {
                  ...convo,
                  lastMessage: {
                    content: newMessage.content,
                    timestamp: newMessage.created_at,
                    unread: newMessage.read === false && 
                            newMessage.recipient_id === user?.id
                  }
                };
              }
              return convo;
            });
          });
        }
      );
      
      // Clean up subscription when changing conversations
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
      // Scroll to bottom after messages load
      scrollToBottom();
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  
  // Effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeConversationId || !user) {
      return;
    }
    
    try {
      const conversationId = activeConversationId;
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      
      // Send message
      await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: conversation.otherUser.id,
        content: messageText,
      });
      
      // Clear input
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };
  
  // Filter conversations based on search query
  const filteredConversations = conversations.filter(convo => {
    if (!searchQuery) return true;
    return convo.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <Button size="sm" className="ml-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
        
        <div className="grid md:grid-cols-[300px_1fr] gap-4 flex-1">
          {/* Conversations List */}
          <Card className="md:h-full">
            <CardHeader className="p-4">
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-64 p-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  {searchQuery ? (
                    <p className="text-sm text-muted-foreground">No conversations match your search.</p>
                  ) : (
                    <>
                      <p className="font-medium mb-1">No conversations yet</p>
                      <p className="text-sm text-muted-foreground">
                        Your message threads with patients will appear here.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <ConversationList 
                  conversations={filteredConversations} 
                  activeConversationId={activeConversationId}
                  onSelect={handleSelectConversation}
                />
              )}
            </CardContent>
          </Card>
          
          {/* Message Thread */}
          <Card className="md:h-full flex flex-col">
            {activeConversationId && otherUserData ? (
              <>
                <CardHeader className="p-4 border-b">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={otherUserData.avatarUrl} />
                      <AvatarFallback>
                        {otherUserData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{otherUserData.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {otherUserData.role === 'patient' ? 'Patient' : 'Mood Mentor'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(80vh-13.5rem)]">
                    <div className="p-4 space-y-4">
                      {isLoadingMessages ? (
                        <div className="flex flex-col items-center justify-center h-32">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                          <p className="text-sm text-muted-foreground">Loading messages...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center h-32">
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start a conversation!
                          </p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <MessageBubble 
                            key={message.id}
                            message={message.content}
                            isCurrentUser={message.isCurrentUser}
                            timestamp={message.timestamp}
                            senderName={message.senderName}
                            read={message.read}
                          />
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>
                
                <CardContent className="p-4 border-t mt-auto">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input 
                      placeholder="Type your message..." 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!messageText.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full p-4">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select a conversation from the list or start a new one to begin messaging.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 


