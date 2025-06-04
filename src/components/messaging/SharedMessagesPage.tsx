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
  const [hasInitializedConversation, setHasInitializedConversation] = useState(false);
  
  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Try the new conversation-based messaging system first
        const { data: conversationsData, error: conversationsError } = await messagingService.getUserConversations(user.id);
        
        if (!conversationsError && conversationsData && conversationsData.length > 0) {
          console.log("Found conversations using conversation-based messaging:", conversationsData);
          
          // Format conversations for the UI
          const formattedConversations: ConversationItem[] = conversationsData.map(convo => {
            const otherUser = convo.other_participant || { 
              id: "", 
              full_name: "Unknown User", 
              email: "",
              avatar_url: ""
            };
            
            return {
              id: convo.conversation_id,
              otherUser: {
                id: otherUser.id,
                name: otherUser.full_name || "Unknown User",
                avatarUrl: otherUser.avatar_url || undefined,
                role: userRole === 'patient' ? 'mood_mentor' : 'patient'
              },
              lastMessage: {
                content: convo.last_message_content || "No messages yet",
                timestamp: convo.last_message_time || new Date().toISOString(),
                unread: convo.has_unread
              }
            };
          });
          
          setConversations(formattedConversations);
          
          // If we have conversations and an initialPatientId, find and select that conversation
          if (initialPatientId) {
            const targetConversation = formattedConversations.find(
              c => c.otherUser.id === initialPatientId
            );
            
            if (targetConversation) {
              handleSelectConversation(targetConversation.id);
              setHasInitializedConversation(true);
            } else if (!hasInitializedConversation) {
              // If we didn't find a conversation for this patient, create one
              console.log("Creating new conversation with patient:", initialPatientId);
              try {
                const { data: newConversationId, error } = await messagingService.getOrCreateConversation(
                  user.id,
                  initialPatientId
                );
                
                if (error) {
                  console.error("Error creating conversation:", error);
                  toast.error("Could not create conversation with patient");
                  return;
                }
                
                if (newConversationId) {
                  console.log("Created conversation with ID:", newConversationId);
                  // Reload conversations to include the new one
                  setTimeout(() => loadConversations(), 500);
                  setHasInitializedConversation(true);
                }
              } catch (err) {
                console.error("Error creating conversation:", err);
                toast.error("Failed to initialize conversation");
              }
            }
          } else if (formattedConversations.length > 0 && !activeConversationId) {
            // If no specific conversation is requested, select the first one
            handleSelectConversation(formattedConversations[0].id);
          }
        } else {
          console.log("No conversations found or error occurred:", conversationsError);
          
          // If there's an error and we have an initialPatientId, try to create the conversation
          if (conversationsError && initialPatientId && !hasInitializedConversation) {
            try {
              console.log("Attempting to create conversation with patient:", initialPatientId);
              const { data: newConversationId, error } = await messagingService.getOrCreateConversation(
                user.id,
                initialPatientId
              );
              
              if (error) {
                console.error("Error creating conversation:", error);
                toast.error("Could not create conversation with patient");
                setConversations([]);
                return;
              }
              
              if (newConversationId) {
                console.log("Created conversation with ID:", newConversationId);
                // Reload conversations after a short delay
                setTimeout(() => loadConversations(), 500);
                setHasInitializedConversation(true);
                return;
              }
            } catch (err) {
              console.error("Error creating conversation:", err);
              toast.error("Failed to initialize conversation");
            }
          }
          
          setConversations([]);
        }
      } catch (error: any) {
        console.error("Error loading conversations:", error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
    
    // Set up a real-time subscription for new conversations
    const channel = supabase
      .channel('public:conversation_participants')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'conversation_participants',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        console.log('New conversation participant added:', payload);
        // Reload conversations when a new one is created
        loadConversations();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, initialPatientId, hasInitializedConversation]);
  
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
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get messages for this conversation
      const { data: messagesData, error: messagesError } = await messagingService.getConversationMessages(
        conversationId,
        50,
        0
      );
      
      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }
      
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }
      
      // Format messages for UI
      const formattedMessages = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.created_at,
        isCurrentUser: msg.sender_id === user.id,
        senderName: msg.sender_id === user.id ? "You" : convo?.otherUser.name || "User",
        read: !!msg.read_at
      }));
      
      setMessages(formattedMessages);
      
      // Mark all unread messages as read
      await messagingService.markMessagesAsRead(conversationId, user.id);
      
      // Update conversation list to show messages as read
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
      
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const newMessage = payload.new as any;
          
          // Add message to UI
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
            if (messageExists) return prevMessages;
            
            // Mark message as read automatically if it's for the active conversation
            if (newMessage.sender_id !== user.id) {
              messagingService.markMessagesAsRead(conversationId, user.id);
            }
            
            return [
              ...prevMessages,
              {
                id: newMessage.id,
                content: newMessage.content,
                timestamp: newMessage.created_at,
                isCurrentUser: newMessage.sender_id === user.id,
                senderName: newMessage.sender_id === user.id ? "You" : otherUserData?.name || "User",
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
    } catch (error: any) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeConversationId || !user) return;
    
    try {
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
        await messagingService.sendMessage(
          activeConversationId,
          user.id,
          messageContent
        );
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message. Please try again.");
        
        // Remove the optimistic message if it failed to send
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
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
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 border-opacity-50 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600">Loading conversations...</p>
            </div>
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