import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '@/services';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/authContext';

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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleStartChat = async () => {
    if (!user) {
      toast.error('You must be logged in to start a chat');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log(`Starting chat for appointment: ${appointmentId}`);
      
      // First get the appointment details to verify it exists
      const appointmentResult = await appointmentService.getAppointmentById(appointmentId);
      
      if (appointmentResult.error || !appointmentResult.data) {
        toast.error('Could not find appointment details');
        setIsLoading(false);
        return;
      }
      
      const appointment = appointmentResult.data;
      const isUserMentor = appointment.mentor_id === user.id;
      const isUserPatient = appointment.patient_id === user.id;
      
      if (!isUserMentor && !isUserPatient) {
        toast.error('You are not authorized to start this chat');
        setIsLoading(false);
        return;
      }
      
      // Get or create a conversation for this appointment
      const { data: conversationId, error } = await appointmentService.startAppointmentChat(appointmentId);
      
      if (error) {
        // Special handling for database table not existing yet
        if (error.includes('relation') && error.includes('does not exist')) {
          toast.info('Chat system is being set up. Please try again in a moment.');
        } else {
          toast.error('Failed to start chat session: ' + error);
          console.error(error);
        }
        setIsLoading(false);
        return;
      }
      
      if (conversationId) {
        // Use consistent navigation for both user types
        if (isUserMentor) {
          // Mood mentors go to their dashboard messages with the patient ID
          navigate(`/mood-mentor-dashboard/messages/${appointment.patient_id}`);
        } else {
          // Patients go to their dashboard messages
          navigate(`/messages`);
        }
      } else {
        toast.error('Could not create a chat session');
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
      {isLoading ? 'Starting...' : 'Chat'}
    </Button>
  );
} 