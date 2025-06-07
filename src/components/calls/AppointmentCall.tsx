import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMeetFrame, createGoogleMeetLink } from './GoogleMeetFrame';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Video, Phone, AlertCircle } from 'lucide-react';

interface AppointmentCallProps {
  appointmentId: string;
  isAudioOnly?: boolean;
  isMentor?: boolean;
  redirectPath?: string;
  isFloating?: boolean;
  patientName?: string;
  mentorName?: string;
  onEndCall?: () => void;
  onInitialized?: () => void;
  shouldInitialize?: boolean;
  meetingUrl?: string;
}

export function AppointmentCall({ 
  appointmentId, 
  isAudioOnly = false, 
  isMentor = false,
  redirectPath = '/appointments',
  isFloating = false,
  patientName = 'Patient',
  mentorName = 'Mentor',
  onEndCall,
  onInitialized,
  shouldInitialize = true,
  meetingUrl = ''
}: AppointmentCallProps) {
  const navigate = useNavigate();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [wasExplicitlyEnded, setWasExplicitlyEnded] = useState(false);
  const [callMinimumTimeElapsed, setCallMinimumTimeElapsed] = useState(false);
  const [appointmentMeetingUrl, setAppointmentMeetingUrl] = useState<string>(meetingUrl);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Check for camera permissions before showing join button
  useEffect(() => {
    const checkMediaPermissions = async () => {
      try {
        // First try to get media devices information
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        
        if (!hasCamera && !hasMicrophone) {
          setPermissionError("No camera or microphone detected. Please check your device connections.");
        }
        
        // We don't actually request permissions here, that's handled in GoogleMeetFrame
      } catch (err) {
        console.error("Error checking media devices:", err);
        setPermissionError("Unable to check camera and microphone. Please ensure your browser has permission to access media devices.");
      }
    };
    
    checkMediaPermissions();
  }, []);

  // Prevent external navigation from Google Meet
  useEffect(() => {
    const preventNavigation = (event: BeforeUnloadEvent) => {
      if (isCallActive && !wasExplicitlyEnded) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', preventNavigation);
    return () => window.removeEventListener('beforeunload', preventNavigation);
  }, [isCallActive, wasExplicitlyEnded]);

  // Auto-start the call if this is the mentor
  useEffect(() => {
    if (isMentor && shouldInitialize && !permissionError) {
      console.log('Mentor view - auto-starting the call');
      handleStartCall();
    }
  }, [isMentor, shouldInitialize, permissionError]);

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
    if (isFloating && !permissionError) {
      setIsCallActive(true);
    }
  }, [isFloating, permissionError]);

  // Add minimum time requirement for call
  useEffect(() => {
    if (isCallActive) {
      // Set a timer to ensure calls last for at least 2 minutes
      // This prevents accidental quick closures
      const timer = setTimeout(() => {
        setCallMinimumTimeElapsed(true);
      }, 120000); // 2 minutes (120,000 ms)
      
      return () => clearTimeout(timer);
    }
  }, [isCallActive]);

  // Fetch meeting URL if not provided
  useEffect(() => {
    const fetchMeetingUrl = async () => {
      if ((!meetingUrl || meetingUrl.trim() === '') && appointmentId) {
        try {
          const { data, error } = await supabase
            .from('appointments')
            .select('meeting_link, patient_id, mentor_id')
            .eq('id', appointmentId)
            .single();
            
          if (error) throw error;
          
          if (data?.meeting_link) {
            console.log('Using existing meeting link:', data.meeting_link);
            setAppointmentMeetingUrl(data.meeting_link);
          } else if (isMentor) {
            // If mentor and no meeting link exists, create one
            const newMeetingUrl = createGoogleMeetLink();
            console.log('Created new meeting link for appointment:', newMeetingUrl);
            
            // Save the new meeting URL to the appointment
            const { error: updateError } = await supabase
              .from('appointments')
              .update({ meeting_link: newMeetingUrl })
              .eq('id', appointmentId);
              
            if (updateError) {
              console.error('Error updating appointment with new meeting link:', updateError);
            }
            
            setAppointmentMeetingUrl(newMeetingUrl);
          }
        } catch (err) {
          console.error('Error fetching meeting URL:', err);
          // Don't show error toast, we'll handle missing URL gracefully
        }
      } else if (meetingUrl && meetingUrl.trim() !== '') {
        setAppointmentMeetingUrl(meetingUrl);
      }
    };
    
    fetchMeetingUrl();
  }, [appointmentId, meetingUrl, isMentor]);

  const handlePermissionError = () => {
    // Reset permission error
    setPermissionError(null);
    
    // Try to request camera access by activating the call
    // GoogleMeetFrame will handle the permission requests
    setIsCallActive(true);
  };

  const handleStartCall = async () => {
    console.log('handleStartCall called - starting call initialization');
    setIsJoining(true);
    
    try {
      // If no meeting URL exists, create one
      if (!appointmentMeetingUrl) {
        const newMeetingUrl = createGoogleMeetLink();
        console.log('Created new meeting link during start call:', newMeetingUrl);
        
        // Save the new meeting URL to the appointment
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ meeting_link: newMeetingUrl })
          .eq('id', appointmentId);
          
        if (updateError) {
          console.error('Error updating appointment with new meeting link:', updateError);
        }
        
        setAppointmentMeetingUrl(newMeetingUrl);
      }
      
      // Update appointment status to scheduled
      const { error: statusError } = await supabase
        .from('appointments')
        .update({ 
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
        
      if (statusError) {
        console.error('Error updating appointment status:', statusError);
      }
      
      setIsCallActive(true);
      console.log('Call activated successfully');
      
      // Notify parent component that call is initialized
      if (onInitialized) {
        onInitialized();
      }
    } catch (error) {
      toast.error("Failed to join the call. Please try again.");
      console.error("Error joining call:", error);
    } finally {
      setIsJoining(false);
    }
  };

  // Update the handleEndCall function
  const handleEndCall = () => {
    console.log('handleEndCall called - user explicitly ended the call');
    
    // Check if minimum time has elapsed or if call was explicitly ended
    if (!callMinimumTimeElapsed && !wasExplicitlyEnded) {
      console.log('Call minimum time not elapsed, showing confirmation');
      if (!window.confirm('Are you sure you want to end the call? This will mark the session as completed.')) {
        return;
      }
    }
    
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
    
    // Mark that the call was explicitly ended by the user
    setWasExplicitlyEnded(true);
    
    // Update appointment status to completed if mentor is ending the call
    if (isMentor) {
      supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating appointment status to completed:', error);
          } else {
            toast.success("Session completed successfully");
          }
        });
    }
    
    // Call the onEndCall callback if provided
    if (onEndCall) {
      console.log('Calling onEndCall callback from handleEndCall');
      onEndCall();
    }
    
    // If we have a redirect path, navigate there
    if (redirectPath) {
      window.location.href = redirectPath;
    }
  };

  // Show permission error if detected
  if (permissionError) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Media Access Required</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          {permissionError}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handlePermissionError}
            size="lg"
            className="w-full"
          >
            Continue Anyway
          </Button>
          {onEndCall && (
            <Button
              variant="outline"
              onClick={onEndCall}
              className="w-full"
            >
              Cancel
            </Button>
          )}
          <a 
            href="/test/camera" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm text-center mt-2"
          >
            Troubleshoot camera/microphone issues
          </a>
        </div>
      </Card>
    );
  }

  if (!isCallActive) {
    // For mentors, show a loading state instead of a button since it will auto-join
    if (isMentor && shouldInitialize) {
      return (
        <Card className="p-6 flex flex-col items-center justify-center h-full">
          <div className="text-center max-w-md">
            {isAudioOnly ? (
              <Phone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            ) : (
              <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            )}
            
            <h2 className="text-2xl font-bold mb-4">
              Initializing {isAudioOnly ? 'Audio' : 'Video'} Call
            </h2>
            
            <p className="mb-6 text-gray-600">
              Preparing your call session with {patientName}. Your call will begin shortly.
            </p>
            
            <div className="flex items-center justify-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></span>
              <span className="ml-3 text-blue-600 font-medium">
                Starting call...
              </span>
            </div>
          </div>
        </Card>
      );
    }
    
    // For patients, keep the join button
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
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
                Joining...
              </>
            ) : (
              <>
                {isAudioOnly ? (
                  <><Phone className="mr-2 h-5 w-5" /> Join Audio Call</>
                ) : (
                  <><Video className="mr-2 h-5 w-5" /> Join Video Call</>
                )}
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Show the Google Meet frame when call is active
  return (
    <div className="h-full">
      <GoogleMeetFrame 
        meetingUrl={appointmentMeetingUrl}
        isFloating={isFloating}
        onClose={handleEndCall}
      />
    </div>
  );
} 