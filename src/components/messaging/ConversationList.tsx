import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export interface ConversationUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role: 'patient' | 'mood_mentor';
}

export interface ConversationItem {
  id: string;
  otherUser: ConversationUser;
  lastMessage: {
    content: string;
    timestamp: string;
    unread: boolean;
  };
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

export const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading = false,
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="px-1 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-4 p-3 animate-pulse">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <p className="text-muted-foreground text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="pr-3 space-y-1">
        {conversations.map((conversation) => (
          <Button
            key={conversation.id}
            variant="ghost"
            className={cn(
              "w-full justify-start px-2 py-3 h-auto",
              activeConversationId === conversation.id && "bg-accent",
              conversation.lastMessage.unread && !activeConversationId && "bg-accent/50"
            )}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start gap-3 w-full">
              <FallbackAvatar 
                src={conversation.otherUser.avatarUrl} 
                name={conversation.otherUser.name}
                className="h-10 w-10 flex-shrink-0"
              />
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate">{conversation.otherUser.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                    {conversation.lastMessage.content || "No messages yet"}
                  </span>
                  {conversation.lastMessage.unread && (
                    <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      <span className="sr-only">Unread message</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}; 