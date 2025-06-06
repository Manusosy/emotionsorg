import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoCall } from './VideoCall';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Video, Phone } from 'lucide-react';

interface AppointmentCallProps {
  appointmentId: string;
  isAudioOnly?: boolean;
  isMentor?: boolean;
  redirectPath?: string;
  isFloating?: boolean;
  patientName?: string;
  mentorName?: string;
  onEndCall?: () => void;
}

export function AppointmentCall({ 
  appointmentId, 
  isAudioOnly = false, 
  isMentor = false,
  redirectPath = '/appointments',
  isFloating = false,
  patientName = 'Patient',
  mentorName = 'Mentor',
  onEndCall
}: AppointmentCallProps) {
  const navigate = useNavigate();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // If not a mentor, listen for session end events
    if (!isMentor) {
      const sessionEndListener = supabase
        .channel(`call-end:${appointmentId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_events',
          filter: `appointment_id=eq.${appointmentId} AND event_type=eq.session_ended`
        }, () => {
          // Session has been ended by the mentor
          if (isCallActive) {
            toast.info("The mentor has ended this session");
            handleEndCall();
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(sessionEndListener);
      };
    }
  }, [appointmentId, isMentor, isCallActive]);

  // Auto-start call if in floating mode
  useEffect(() => {
    if (isFloating) {
      setIsCallActive(true);
    }
  }, [isFloating]);

  // Add a function to clean up camera access
  const cleanupCameraAccess = () => {
    // Get all media devices and stop them
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log(`AppointmentCall: Stopped ${track.kind} track`);
        });
      })
      .catch(err => {
        console.warn('AppointmentCall: Could not get media devices to clean up:', err);
      });
  };

  // Update the useEffect cleanup
  useEffect(() => {
    // Return a cleanup function
    return () => {
      console.log('AppointmentCall component unmounting, cleaning up resources');
      
      // Clean up camera access
      cleanupCameraAccess();
      
      // If we're redirecting, make sure to clean up any video resources
      if (onEndCall) {
        onEndCall();
      }
    };
  }, [onEndCall]);

  const handleStartCall = async () => {
    setIsJoining(true);
    
    try {
      // In a production app, we might want to verify the call status with the server
      // For now, we'll just set a short timeout to simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsCallActive(true);
    } catch (error) {
      toast.error("Failed to join the call. Please try again.");
      console.error("Error joining call:", error);
    } finally {
      setIsJoining(false);
    }
  };

  // Update the handleEndCall function
  const handleEndCall = () => {
    console.log('Call ended by user action');
    
    // Clean up camera access
    cleanupCameraAccess();
    
    // If we're in a floating window, dispatch an event to close it
    if (window.opener) {
      try {
        window.opener.dispatchEvent(
          new CustomEvent('floating-call-closed', {
            detail: { appointmentId }
          })
        );
      } catch (e) {
        console.error('Error dispatching event to parent window:', e);
      }
    }
    
    // Call the onEndCall callback if provided
    if (onEndCall) {
      onEndCall();
    }
    
    // If we have a redirect path, navigate there
    if (redirectPath) {
      window.location.href = redirectPath;
    }
  };

  if (!isCallActive) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md">
          {isAudioOnly ? (
            <Phone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          ) : (
            <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          )}
          
          <h2 className="text-2xl font-bold mb-4">
            {isAudioOnly ? 'Audio Call' : 'Video Call'} Session
          </h2>
          
          <p className="mb-6 text-gray-600">
            {isMentor 
              ? `Your patient ${patientName} is waiting to start the session.`
              : `Your mood mentor ${mentorName} is ready for the session.`}
          </p>
          
          <Button 
            onClick={handleStartCall} 
            size="lg" 
            className="w-full"
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                Joining...
              </>
            ) : (
              <>
                {isAudioOnly ? (
                  <Phone className="mr-2 h-5 w-5" />
                ) : (
                  <Video className="mr-2 h-5 w-5" />
                )}
                Join {isAudioOnly ? 'Audio' : 'Video'} Call
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full h-full">
      <VideoCall
        channelName={`appointment-${appointmentId}`}
        isAudioOnly={isAudioOnly}
        onEndCall={handleEndCall}
        isFloating={isFloating}
        participantName={isMentor ? patientName : mentorName}
      />
    </div>
  );
} 