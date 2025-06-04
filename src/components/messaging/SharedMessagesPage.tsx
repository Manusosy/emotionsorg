import { useState, useEffect, useRef, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { ConversationList, ConversationItem, ConversationUser } from "@/components/messaging/ConversationList";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthContext } from "@/contexts/authContext";
import { Loader2, Search, Send, MessageSquare, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { messageService } from "@/services";
import { supabase } from "@/lib/supabase";
import { messagingService } from "@/services";

export interface MessageData {
  id: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  senderName: string;
  read: boolean;
}

interface SharedMessagesPageProps {
  userRole: 'patient' | 'mood_mentor';
  onCreateNewMessage?: () => void;
  initialPatientId?: string;
}

export function SharedMessagesPage({ userRole, onCreateNewMessage, initialPatientId }: SharedMessagesPageProps) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [otherUserData, setOtherUserData] = useState<ConversationUser | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        // Get all messages for the user
        const { data: messagesData, error } = await messageService.getMessages(user.id);
        
        if (error) {
          console.error("Error loading messages:", error);
          // Don't show error toast for empty results or when table doesn't exist yet
          if (error.toString().includes('relation "messages" does not exist')) {
            setConversations([]);
            setIsLoading(false);
            return;
          }
          throw new Error(error);
        }
        
        // If no messages, return empty array instead of showing error
        if (!messagesData || messagesData.length === 0) {
          setConversations([]);
          setIsLoading(false);
          return;
        }
        
        // Group messages by conversation (based on the other user)
        const conversationsMap = new Map<string, {
          otherUser: ConversationUser,
          lastMessage: {
            content: string,
            timestamp: string,
            unread: boolean
          }
        }>();
        
        messagesData?.forEach((message: any) => {
          const isCurrentUser = message.sender_id === user.id;
          const otherUser = isCurrentUser ? message.recipient : message.sender;
          const otherUserId = otherUser.id;
          
          // Skip if no other user found
          if (!otherUserId) return;
          
          // Create a unique conversation ID based on both users
          const conversationId = [user.id, otherUserId].sort().join('_');
          
          // Determine if the other user is a patient or mentor
          const otherUserRole = userRole === 'patient' ? 'mood_mentor' : 'patient';
          
          if (!conversationsMap.has(conversationId)) {
            conversationsMap.set(conversationId, {
              otherUser: {
                id: otherUserId,
                name: otherUser.full_name || "Unknown User",
                avatarUrl: otherUser.avatar_url,
                role: otherUserRole as 'patient' | 'mood_mentor'
              },
              lastMessage: {
                content: message.content,
                timestamp: message.created_at,
                unread: !isCurrentUser && !message.read
              }
            });
          } else {
            // Update last message if this one is newer
            const existing = conversationsMap.get(conversationId)!;
            const existingTimestamp = new Date(existing.lastMessage.timestamp).getTime();
            const newTimestamp = new Date(message.created_at).getTime();
            
            if (newTimestamp > existingTimestamp) {
              existing.lastMessage = {
                content: message.content,
                timestamp: message.created_at,
                unread: !isCurrentUser && !message.read
              };
              conversationsMap.set(conversationId, existing);
            }
          }
        });
        
        // Convert map to array and sort by last message time
        const formattedConversations: ConversationItem[] = Array.from(conversationsMap.entries())
          .map(([id, data]) => ({
            id,
            otherUser: data.otherUser,
            lastMessage: data.lastMessage
          }))
          .sort((a, b) => {
            return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
          });
        
        setConversations(formattedConversations);
        
        // If we have conversations, select the first one
        if (formattedConversations.length > 0) {
          handleSelectConversation(formattedConversations[0].id);
        }
      } catch (error: any) {
        console.error("Error loading conversations:", error);
        // Only show toast for actual errors, not empty states
        if (error.toString().includes('Failed to fetch') || 
            error.toString().includes('Network Error')) {
          toast.error("Failed to load conversations. Network issue.");
        } else {
          // Set empty conversations instead of showing error
          setConversations([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
  }, [user, userRole]);
  
  // Handle selecting a conversation
  const handleSelectConversation = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      setActiveConversationId(conversationId);
      
      // Find the conversation to get the other user data
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setOtherUserData(convo.otherUser);
      }
      
      // Get the two user IDs from the conversation ID
      const userIds = conversationId.split('_');
      const otherUserId = userIds.find(id => id !== user?.id);
      
      if (!user || !otherUserId) {
        throw new Error("Could not determine participants in conversation");
      }
      
      // Get messages between these two users
      const { data: messagesData, error: messagesError } = await messageService.getMessages(user.id);
      
      if (messagesError) {
        // Don't show error for empty results or when table doesn't exist yet
        if (messagesError.toString().includes('relation "messages" does not exist')) {
          setMessages([]);
          setIsLoadingMessages(false);
          return;
        }
        throw new Error(messagesError);
      }
      
      // If no messages, set empty array and return
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }
      
      // Filter messages to only those between these two users
      const relevantMessages = (messagesData || []).filter((msg: any) => {
        return (msg.sender_id === user.id && msg.recipient_id === otherUserId) || 
               (msg.sender_id === otherUserId && msg.recipient_id === user.id);
      });
      
      // If no relevant messages between these users, show empty state
      if (relevantMessages.length === 0) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }
      
      // Format messages for UI
      const formattedMessages = relevantMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.created_at,
        isCurrentUser: msg.sender_id === user.id,
        senderName: msg.sender_id === user.id ? "You" : convo?.otherUser.name || "User",
        read: !!msg.read
      }));
      
      // Sort messages by timestamp
      formattedMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(formattedMessages);
      
      // Mark all unread messages as read
      const unreadMessages = relevantMessages.filter((msg: any) => 
        !msg.read && msg.recipient_id === user.id
      );
      
      for (const msg of unreadMessages) {
        try {
          await messageService.markAsRead(msg.id);
        } catch (markError) {
          console.error("Error marking message as read:", markError);
          // Continue with other messages even if one fails
        }
      }
      
      // Update conversation list to show messages as read
      if (unreadMessages.length > 0) {
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
      }
      
      // Set up real-time subscription for new messages
      try {
        const channel = supabase
          .channel(`messages:${user.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          }, (payload) => {
            const newMessage = payload.new as any;
            
            // Only handle messages relevant to this conversation
            if (newMessage.sender_id !== otherUserId && newMessage.recipient_id !== otherUserId) {
              return;
            }
            
            // Add message to UI
            setMessages(prevMessages => {
              const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
              if (messageExists) return prevMessages;
              
              // Mark message as read automatically
              try {
                messageService.markAsRead(newMessage.id);
              } catch (markError) {
                console.error("Error marking new message as read:", markError);
              }
              
              return [
                ...prevMessages,
                {
                  id: newMessage.id,
                  content: newMessage.content,
                  timestamp: newMessage.created_at,
                  isCurrentUser: false,
                  senderName: otherUserData?.name || "User",
                  read: true
                }
              ];
            });
            
            // Update conversation last message
            setConversations(prevConversations => {
              return prevConversations.map(convo => {
                if (convo.id === conversationId) {
                  return {
                    ...convo,
                    lastMessage: {
                      content: newMessage.content,
                      timestamp: newMessage.created_at,
                      unread: false // Already marked as read
                    }
                  };
                }
                return convo;
              });
            });
          })
          .subscribe();
        
        // Return cleanup function
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (subError) {
        console.error("Error setting up real-time subscription:", subError);
        // Continue even if subscription fails
      }
    } catch (error: any) {
      console.error("Error loading messages:", error);
      
      // Only show toast for actual errors, not empty states
      if (error.toString().includes('Failed to fetch') || 
          error.toString().includes('Network Error')) {
        toast.error("Failed to load messages. Network issue.");
      } else {
        // Set empty messages instead of showing error for other issues
        setMessages([]);
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeConversationId || !user) return;
    
    try {
      const convo = conversations.find(c => c.id === activeConversationId);
      if (!convo) return;
      
      // Create a temporary message ID for optimistic updates
      const tempId = `temp-${Date.now()}`;
      
      // Add the message to the UI immediately (optimistic update)
      const newMessage: MessageData = {
        id: tempId,
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
        isCurrentUser: true,
        senderName: "You",
        read: false
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Update the conversation list (optimistic update)
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            lastMessage: {
              content: messageText.trim(),
              timestamp: new Date().toISOString(),
              unread: false
            }
          };
        }
        return c;
      }));
      
      // Clear the input immediately for better UX
      const messageContent = messageText.trim();
      setMessageText("");
      
      // Send the message to the server
      try {
        await messageService.sendMessage({
          senderId: user.id,
          recipientId: convo.otherUser.id,
          content: messageContent
        });
      } catch (error: any) {
        console.error("Error sending message:", error);
        
        // If table doesn't exist yet, don't show error to user
        if (error.toString().includes('relation "messages" does not exist')) {
          toast.info("Messaging system is being set up. Please try again in a moment.");
        } else {
          toast.error("Failed to send message. Please try again.");
          
          // Remove the optimistic message if it failed to send
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
      }
    } catch (error: any) {
      console.error("Error in send message flow:", error);
      toast.error("An unexpected error occurred while sending the message.");
    }
  };
  
  // Filter conversations based on search query and tab
  const filteredConversations = conversations.filter(convo => {
    const matchesSearch = convo.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || (activeTab === "unread" && convo.lastMessage.unread);
    return matchesSearch && matchesTab;
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the appropriate empty state message based on user role
  const getEmptyStateMessage = () => {
    if (userRole === 'patient') {
      return {
        title: "No conversations yet",
        description: "Connect with mood mentors to start conversations.",
        buttonText: "Find Mood Mentors",
        buttonLink: "/mood-mentors"
      };
    } else {
      return {
        title: "No conversations yet",
        description: "Your message threads with patients will appear here.",
        buttonText: "View Patients",
        buttonLink: "/mood-mentor-dashboard/patients"
      };
    }
  };

  const emptyState = getEmptyStateMessage();

  // Effect to select conversation with initial patient ID
  useEffect(() => {
    if (!initialPatientId || !user) return;
    
    const initiateConversation = async () => {
      try {
        // First check if we have loaded conversations
        if (conversations.length > 0) {
          // Look for existing conversation with this patient
          const existingConvo = conversations.find(c => 
            c.otherUser.id === initialPatientId
          );
          
          if (existingConvo) {
            // If found, select it
            handleSelectConversation(existingConvo.id);
            return;
          }
        }
        
        // Don't try to create a conversation while still loading
        if (isLoading) return;
        
        if (userRole === 'mood_mentor' && initialPatientId) {
          // For mood mentors, try to create a new conversation
          console.log(`Creating conversation with patient ${initialPatientId}`);
          
          // Try both messaging systems if needed
          let conversationId = null;
          let error = null;
          
          try {
            // First try the full messaging system
            const result = await messagingService.getOrCreateConversation(
              user.id,
              initialPatientId
            );
            
            if (!result.error && result.data) {
              conversationId = result.data;
            } else {
              error = result.error;
              console.log('First attempt failed, trying direct messaging:', error);
              
              // If that fails, try the direct messaging fallback
              const fallbackResult = await messageService.getOrCreateConversation(
                user.id,
                initialPatientId
              );
              
              if (!fallbackResult.error && fallbackResult.data) {
                conversationId = fallbackResult.data;
                error = null;
              } else {
                error = fallbackResult.error || 'Unknown error creating conversation';
              }
            }
          } catch (err: any) {
            console.error('Error creating conversation:', err);
            error = err.message || 'Failed to initialize messaging';
          }
          
          if (error) {
            console.error("Error creating conversation:", error);
            toast.error("Failed to create conversation with patient");
            return;
          }
          
          if (conversationId) {
            console.log(`Created conversation with ID: ${conversationId}`);
            
            // Force reload of conversations in 0.5 seconds
            // This gives the DB time to register the new conversation
            setTimeout(() => {
              // Refresh the page to load the new conversation
              window.location.reload();
            }, 500);
          }
        }
      } catch (err) {
        console.error("Error handling initial patient ID:", err);
        toast.error("Could not initialize conversation with patient");
      }
    };
    
    initiateConversation();
  }, [initialPatientId, conversations, user, isLoading, userRole, handleSelectConversation]);

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-134px)]">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          {userRole === 'mood_mentor' && onCreateNewMessage && (
            <Button size="sm" onClick={onCreateNewMessage}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Message
            </Button>
          )}
        </div>
        
        {conversations.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-blue-50 rounded-full p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">{emptyState.title}</h3>
            <p className="text-gray-500 mb-6">
              {emptyState.description}
            </p>
            <Button
              onClick={() => window.location.href = emptyState.buttonLink}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {emptyState.buttonText}
            </Button>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-190px)]">
            {/* Conversations List */}
            <Card className="md:col-span-1 h-full">
              <CardHeader className="p-3 pb-0">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search messages..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="unread" className="flex-1">Unread</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-3">
                <ConversationList
                  conversations={filteredConversations}
                  activeConversationId={activeConversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  isLoading={false}
                />
              </CardContent>
            </Card>
            
            {/* Messages Area */}
            <Card className="md:col-span-2 h-full flex flex-col">
              {activeConversationId ? (
                <>
                  {/* Conversation Header */}
                  <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
                    {otherUserData && (
                      <div className="flex items-center">
                        <FallbackAvatar
                          src={otherUserData.avatarUrl}
                          name={otherUserData.name}
                          className="h-8 w-8 mr-2"
                        />
                        <div>
                          <CardTitle className="text-md">{otherUserData.name}</CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">
                            {otherUserData.role}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {otherUserData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const baseUrl = userRole === 'patient' 
                            ? '/mood-mentors' 
                            : '/mood-mentor-dashboard/patients';
                          const nameSlug = otherUserData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          const url = `${baseUrl}/${nameSlug}?id=${otherUserData.id}`;
                          window.open(url, '_blank');
                        }}
                      >
                        View Profile
                      </Button>
                    )}
                  </CardHeader>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {isLoadingMessages ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <p className="text-muted-foreground mb-2">No messages yet</p>
                        <p className="text-sm text-muted-foreground">
                          Send a message to start the conversation
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            content={message.content}
                            timestamp={message.timestamp}
                            isCurrentUser={message.isCurrentUser}
                            avatarUrl={message.isCurrentUser ? user?.user_metadata?.avatarUrl : otherUserData?.avatarUrl}
                            senderName={message.senderName}
                            read={message.read}
                          />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!messageText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="bg-blue-50 rounded-full p-4 mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Select a conversation</h3>
                  <p className="text-gray-500 mb-6">
                    {userRole === 'patient' 
                      ? "Select a conversation to start messaging or browse mood mentors to start new conversations."
                      : "Select a conversation to start messaging with your patients."}
                  </p>
                  <Button
                    onClick={() => window.location.href = userRole === 'patient' ? "/mood-mentors" : "/mood-mentor-dashboard/patients"}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {userRole === 'patient' ? "Find Mood Mentors" : "View Patients"}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 