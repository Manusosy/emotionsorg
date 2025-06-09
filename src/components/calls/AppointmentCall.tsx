import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video, X, RotateCcw, Camera, Mic, MicOff, CameraOff, AlertCircle, HelpCircle, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMeetFrame, createGoogleMeetLink } from './GoogleMeetFrame';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useVideoSession } from '@/contexts/VideoSessionContext';

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
  onError?: () => void;
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
  meetingUrl = '',
  onError
}: AppointmentCallProps) {
  const navigate = useNavigate();
  const { minimizeSession } = useVideoSession();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [wasExplicitlyEnded, setWasExplicitlyEnded] = useState(false);
  const [callMinimumTimeElapsed, setCallMinimumTimeElapsed] = useState(false);
  const [appointmentMeetingUrl, setAppointmentMeetingUrl] = useState<string>(meetingUrl);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showTestCameraDialog, setShowTestCameraDialog] = useState(false);
  const [showPermissionHelpDialog, setShowPermissionHelpDialog] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(!isAudioOnly);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [testLocalStream, setTestLocalStream] = useState<MediaStream | null>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'idle'>('idle');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  // Check for camera permissions before showing join button
  useEffect(() => {
    const checkMediaPermissions = async () => {
      try {
        // First try to get media devices information
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        
        // Check if we already have permission by checking for device labels
        const hasPermission = devices.some(device => device.label !== '');
        
        if (!hasCamera && !hasMicrophone) {
          setPermissionError("No camera or microphone detected. Please check your device connections.");
        } else if (hasPermission) {
          // We already have permission, no need to show permission error
          console.log("Camera/microphone permission already granted");
          setPermissionError(null);
        }
        
        // We don't actually request permissions here, that's handled in GoogleMeetFrame
      } catch (err) {
        console.error("Error checking media devices:", err);
        
        // Don't set permission error yet - the user might have permissions
        // but the browser just doesn't expose device info until explicitly requested
        console.warn("Could not check device permissions, will try when joining call");
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

  // Don't show errors immediately - wait for a reasonable time
  useEffect(() => {
    let errorTimer: ReturnType<typeof setTimeout>;
    
    if (isCallActive && connectionStatus === 'connecting') {
      // Only show error after 10 seconds of being stuck in connecting
      errorTimer = setTimeout(() => {
        if (connectionStatus === 'connecting') {
          console.log('Call has been connecting for too long, showing error UI');
          // Only call onError if we're still in connecting state after timeout
          if (onError) onError();
        }
      }, 10000); // Wait 10 seconds before showing errors
    }
    
    return () => {
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [isCallActive, connectionStatus, onError]);

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

  // Effect to auto-join for mentors
  useEffect(() => {
    if (isMentor && shouldInitialize && !isCallActive && !isJoining) {
      handleStartCall();
    }
  }, [isMentor, shouldInitialize]);
    
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (testLocalStream) {
        testLocalStream.getTracks().forEach(track => track.stop());
      }
      cleanupCameraAccess();
    };
  }, []);

  // Start a timer to track minimum call duration (used for confirmation dialogs)
  useEffect(() => {
    if (isCallActive) {
      const timer = setTimeout(() => {
        setCallMinimumTimeElapsed(true);
      }, 60000); // 1 minute minimum call time
      return () => clearTimeout(timer);
    }
  }, [isCallActive]);
      
  // Listen for connection status changes from Google Meet iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from our own domain or Google Meet
      if (event.origin !== window.location.origin && !event.origin.includes('meet.google.com')) {
        return;
      }

      // Check for connection status messages
      if (event.data && event.data.type === 'connectionStatus') {
        setConnectionStatus(event.data.status);
        
        // If disconnected, try to reconnect
        if (event.data.status === 'disconnected' && reconnectAttempts < maxReconnectAttempts) {
          setConnectionStatus('reconnecting');
          setReconnectAttempts(prev => prev + 1);
          // Attempt to reconnect after a short delay
          setTimeout(() => {
            handleReconnect();
          }, 2000);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [reconnectAttempts]);

  // Function to get camera and microphone access for the test dialog
  const initializeTestMedia = async () => {
    try {
      // Clean up any existing test stream
      if (testLocalStream) {
        testLocalStream.getTracks().forEach(track => track.stop());
      }

      // Request media based on call type
      const constraints = {
        audio: true,
        video: !isAudioOnly
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setTestLocalStream(stream);

      // Connect stream to video element
      if (testVideoRef.current && !isAudioOnly) {
        testVideoRef.current.srcObject = stream;
      }
      
      setPermissionError(null);
      return true;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Cast error to an object with name and message properties
      const err = error as { name?: string; message?: string };

      // Set appropriate error message based on error type
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera or microphone access was denied. Please enable permissions in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setPermissionError(`Error accessing your camera or microphone: ${err.message || 'Unknown error'}`);
      }
      return false;
      }
  };

  // Clean up media access
  const cleanupCameraAccess = () => {
    try {
      navigator.mediaDevices.getUserMedia({ audio: true, video: !isAudioOnly })
        .then(stream => {
          stream.getTracks().forEach(track => {
            track.stop();
          });
        })
        .catch(err => console.warn('Could not get media for cleanup:', err));
        
      // Also stop any tracks from video elements
      document.querySelectorAll('video').forEach(videoElement => {
        const stream = (videoElement as HTMLVideoElement).srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
          });
          videoElement.srcObject = null;
        }
      });
    } catch (e) {
      console.warn('Error cleaning up media tracks:', e);
    }
  };

  // Handle the start call button click
  const handleStartCall = async () => {
    setIsJoining(true);
    setPermissionError(null);

    try {
      // If no meeting URL is provided, get one from the appointment or create a new one
      if (!appointmentMeetingUrl) {
        // First, check if the appointment already has a meeting link
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('meeting_link')
          .eq('id', appointmentId)
          .single();

        if (appointmentError) {
          console.error('Error fetching appointment meeting link:', appointmentError);
          throw new Error('Failed to get appointment details');
        }

        // If the appointment has a meeting link, use it
        if (appointmentData?.meeting_link) {
          setAppointmentMeetingUrl(appointmentData.meeting_link);
        } else {
          // Otherwise, create a new meeting link
          const newMeetingUrl = createGoogleMeetLink();
          setAppointmentMeetingUrl(newMeetingUrl);

          // Update the appointment with the new meeting link
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ meeting_link: newMeetingUrl })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('Error updating appointment with meeting link:', updateError);
            // Continue anyway, as this is not critical for the call to work
          }
        }
      }

      // Log that user has joined the call - do this silently without displaying an error toast
      try {
        const { error: eventError } = await supabase
          .from('session_events')
          .insert({
            appointment_id: appointmentId,
            event_type: isMentor ? 'mentor_joined' : 'patient_joined',
            initiated_by: isMentor ? 'mentor' : 'patient',
            message: `${isMentor ? 'Mentor' : 'Patient'} has joined the session`
          });
          
        if (eventError) {
          console.warn('Error logging join event:', eventError);
          // Continue anyway, as this is not critical
        }
      } catch (logError) {
        console.warn('Error logging join event:', logError);
        // Continue anyway, as this is not critical
      }

      // Set the call as active
      setIsCallActive(true);
      setConnectionStatus('connecting');
      
      // Notify parent component
      if (onInitialized) {
        onInitialized();
      }
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please try again.', { id: 'call-start-error' });
      setPermissionError('Failed to initialize the call. Please try again.');
      setIsJoining(false);
    }
  };

  // Handle the end call button
  const handleEndCall = () => {
    console.log('handleEndCall called - user explicitly ended the call');
    
    // No longer need to check minimum time or show confirmation about completion
    // Just end the call without marking anything as completed
    
    // Mark that the call was explicitly ended by the user
    setWasExplicitlyEnded(true);
    setIsCallActive(false);
    setConnectionStatus('disconnected');
    
    // Clean up media resources
    cleanupCameraAccess();
    
    // Dispatch event to notify other components the call has ended
    window.dispatchEvent(
      new CustomEvent('floating-call-closed', {
        detail: { appointmentId }
      })
    );
    
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
    
    // Log the session end event
    supabase
      .from('session_events')
      .insert({
        appointment_id: appointmentId,
        event_type: 'session_ended',
        initiated_by: isMentor ? 'mentor' : 'patient',
        message: `Session ended by ${isMentor ? 'mentor' : 'patient'}`
      })
      .then(({ error }) => {
        if (error) {
          console.warn('Error logging session end event:', error);
        }
      });
    
    // Call the onEndCall callback if provided
    if (onEndCall) {
      onEndCall();
    }
  };

  // Toggle camera function for test dialog
  const toggleTestCamera = async () => {
    if (!testLocalStream) return;
    
    const videoTracks = testLocalStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsCameraEnabled(!isCameraEnabled);
  };

  // Toggle microphone function for test dialog
  const toggleTestMic = () => {
    if (!testLocalStream) return;
    
    const audioTracks = testLocalStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMicEnabled(!isMicEnabled);
  };

  // Handle reconnection attempts
  const handleReconnect = () => {
    // Create a new meeting URL to force a fresh connection
    const newMeetingUrl = createGoogleMeetLink();
    setAppointmentMeetingUrl(newMeetingUrl);
    
    // Update the appointment with the new meeting link
    supabase
      .from('appointments')
      .update({ meeting_link: newMeetingUrl })
      .eq('id', appointmentId)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating appointment with new meeting link:', error);
      }
      });
    
    // Notify users of reconnection attempt
    toast.info('Attempting to reconnect to the call...');
    
    // Reset connection status to connecting
    setConnectionStatus('connecting');
  };

  // Open the test camera dialog
  const handleTestDevices = async () => {
    const initialized = await initializeTestMedia();
    if (initialized) {
      setShowTestCameraDialog(true);
    } else {
      setShowPermissionHelpDialog(true);
    }
  };

  // Component for showing permission help content
  const PermissionHelpContent = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Permission Required</h3>
            <p className="text-sm text-amber-700 mt-1">
              {permissionError || "Your browser needs permission to access your camera and microphone for the call."}
            </p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="chrome">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="chrome">Chrome</TabsTrigger>
          <TabsTrigger value="firefox">Firefox</TabsTrigger>
          <TabsTrigger value="safari">Safari</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chrome" className="space-y-3 mt-3">
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Click the lock icon in the address bar</li>
            <li>Select "Site settings"</li>
            <li>For both Camera and Microphone, select "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
        </TabsContent>
        
        <TabsContent value="firefox" className="space-y-3 mt-3">
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Click the lock icon in the address bar</li>
            <li>Click "More Information"</li>
            <li>Under "Permissions", set Camera and Microphone to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
        </TabsContent>
        
        <TabsContent value="safari" className="space-y-3 mt-3">
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Go to Safari Preferences</li>
            <li>Select "Websites" tab</li>
            <li>Find Camera and Microphone in the left sidebar</li>
            <li>Set permission for this website to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
        </TabsContent>
      </Tabs>
        </div>
  );

  // Handle minimizing the call
  const handleMinimizeCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (minimizeSession) {
      minimizeSession();
  }
  };

  // If not in a call, show the pre-call UI
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
    
    // For patients, show the join UI with device testing option
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
          
          {permissionError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{permissionError}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => setShowPermissionHelpDialog(true)}
              >
                <HelpCircle className="h-4 w-4 mr-2" /> Get Help with Permissions
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
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
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleTestDevices}
              disabled={isJoining}
            >
              {isAudioOnly ? <Mic className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
              Test your {isAudioOnly ? 'microphone' : 'camera & microphone'}
            </Button>
          </div>
        </div>

        {/* Test Camera Dialog */}
        <Dialog open={showTestCameraDialog} onOpenChange={setShowTestCameraDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Test Your Devices</DialogTitle>
              <DialogDescription>
                Make sure your {isAudioOnly ? 'microphone' : 'camera and microphone'} are working properly.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {!isAudioOnly && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    ref={testVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex justify-center space-x-3">
                {!isAudioOnly && (
                  <Button
                    variant={isCameraEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleTestCamera}
                  >
                    {isCameraEnabled ? (
                      <>
                        <Camera className="h-4 w-4 mr-2" /> Camera On
                      </>
                    ) : (
                      <>
                        <CameraOff className="h-4 w-4 mr-2" /> Camera Off
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  variant={isMicEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleTestMic}
                >
                  {isMicEnabled ? (
                    <>
                      <Mic className="h-4 w-4 mr-2" /> Mic On
                    </>
                  ) : (
                    <>
                      <MicOff className="h-4 w-4 mr-2" /> Mic Off
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Audio Test</h3>
                <p className="text-sm text-gray-600">
                  Speak into your microphone. If the volume meter moves, your microphone is working.
                </p>
                <div className="h-4 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all" 
                    style={{ 
                      width: testLocalStream && isMicEnabled ? '60%' : '0%',
                      animation: testLocalStream && isMicEnabled ? 'pulse 2s infinite' : 'none'
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => {
                  // Clean up test media
                  if (testLocalStream) {
                    testLocalStream.getTracks().forEach(track => track.stop());
                    setTestLocalStream(null);
                  }
                  if (testVideoRef.current) {
                    testVideoRef.current.srcObject = null;
                  }
                }}>
                  Close
                </Button>
              </DialogClose>
              <Button onClick={handleStartCall}>
                {isAudioOnly ? "Join Audio Call" : "Join Video Call"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Help Dialog */}
        <Dialog open={showPermissionHelpDialog} onOpenChange={setShowPermissionHelpDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Camera & Microphone Permissions</DialogTitle>
              <DialogDescription>
                Follow these steps to enable access to your {isAudioOnly ? 'microphone' : 'camera and microphone'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <PermissionHelpContent />
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button onClick={() => {
                setRetryCount(retryCount + 1);
                setPermissionError(null);
                setShowPermissionHelpDialog(false);
                handleTestDevices();
              }}>
                <RotateCcw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Modify the container for the Google Meet frame
  // Show the Google Meet frame when call is active
  return (
    <div className="h-full relative fixed-height-container">
      {connectionStatus === 'reconnecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="bg-white p-6 rounded-lg max-w-md text-center">
            <RotateCcw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-bold mb-2">Reconnecting...</h3>
            <p className="text-gray-600 mb-4">
              Attempting to reconnect to your call. Please wait...
            </p>
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleEndCall}>
                End Call
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add minimize button if not in floating mode */}
      {!isFloating && (
        <div className="absolute top-2 right-2 z-10">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={handleMinimizeCall}
            title="Minimize call"
          >
            <Minimize className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <GoogleMeetFrame 
        meetingUrl={appointmentMeetingUrl}
        isFloating={isFloating}
        onClose={handleEndCall}
        onError={onError}
        isAudioOnly={isAudioOnly}
      />
    </div>
  );
} 