import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '@/services';
import { toast } from 'sonner';

interface ChatButtonProps {
  appointmentId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ChatButton({
  appointmentId,
  variant = 'default',
  size = 'default',
  className = '',
}: ChatButtonProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleStartChat = async () => {
    setIsLoading(true);
    try {
      const { data: conversationId, error } = await appointmentService.startAppointmentChat(appointmentId);
      
      if (error) {
        toast.error('Failed to start chat session');
        console.error(error);
        return;
      }
      
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('An error occurred while starting the chat');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleStartChat}
      disabled={isLoading}
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Chat
    </Button>
  );
} 