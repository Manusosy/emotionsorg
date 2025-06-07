import { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { agoraConfig } from '@/config/agora';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize, ScreenShare, MonitorStop, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateToken, generateUID } from '@/utils/tokenGenerator';
import { toast } from 'sonner';
import './video-call.css'; // Import styles for the video call component

interface VideoCallProps {
  channelName: string;
  isAudioOnly?: boolean;
  onEndCall: () => void;
  isFloating?: boolean;
  participantName?: string;
  onInitialized?: () => void;
  shouldInitialize?: boolean;
}

// Create client outside component to avoid recreating it on re-renders
const client: IAgoraRTCClient = AgoraRTC.createClient({ 
  mode: 'rtc', 
  codec: 'vp8'
});

export function VideoCall({ 
  channelName, 
  isAudioOnly = false, 
  onEndCall, 
  isFloating = false,
  participantName = 'Participant',
  onInitialized,
  shouldInitialize = true
}: VideoCallProps) {
  const [localTracks, setLocalTracks] = useState<{
    audioTrack?: IMicrophoneAudioTrack;
    videoTrack?: ICameraVideoTrack;
    screenTrack?: any;
  }>({});
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [initError, setInitError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'connection' | 'unknown' | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [wasExplicitlyEnded, setWasExplicitlyEnded] = useState(false);
  const [waitingForRemoteUser, setWaitingForRemoteUser] = useState(true);
  const [joinRetryCount, setJoinRetryCount] = useState(0);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const permissionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetryAttempts = 3;
  
  // Styling classes
  const containerClasses = cn(
    'relative overflow-hidden bg-black rounded-lg h-full w-full flex flex-col',
    {
      'fixed inset-0 z-50': isFullScreen,
      'h-full w-full': !isFullScreen && !isFloating,
      'h-72 w-96 shadow-lg': isFloating,
    }
  );
  
  const videoContainerClasses = cn(
    'flex-1 flex items-stretch relative bg-gray-900 overflow-hidden',
    {
      'grid grid-cols-1': remoteUsers.length === 0,
      'grid grid-cols-2': remoteUsers.length >= 1
    }
  );
  
  const localVideoClasses = cn(
    'bg-gray-800 overflow-hidden',
    {
      'w-full h-full object-cover mirror-mode': remoteUsers.length === 0,
      'absolute bottom-4 right-4 w-32 h-24 rounded shadow-md z-10 mirror-mode': remoteUsers.length >= 1
    }
  );
  
  const controlsContainerClasses = cn(
    'p-3 bg-gray-900 flex items-center justify-between'
  );

  // Add a function to check for existing permissions
  const checkPermissions = async () => {
    try {
      // Check if permissions are already granted using the permissions API
      if (navigator.permissions && navigator.permissions.query) {
        // Check camera permission
        const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        const hasAllPermissions = 
          (cameraResult.state === 'granted' || isAudioOnly) && 
          micResult.state === 'granted';
        
        setHasPermissions(hasAllPermissions);
        
        if (!hasAllPermissions && (cameraResult.state === 'denied' || micResult.state === 'denied')) {
          // If explicitly denied, show a message to the user
          setInitError('Camera or microphone access has been blocked. Please update your browser settings to allow access.');
          setErrorType('permission');
          return false;
        }
        
        return hasAllPermissions;
      } else {
        // Fallback for browsers that don't support the permissions API
        // We'll try to access the devices directly as a permissions check
        try {
          const constraints = isAudioOnly 
            ? { audio: true } 
            : { audio: true, video: true };
            
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          // Stop tracks immediately after check
          stream.getTracks().forEach(track => track.stop());
          
          setHasPermissions(true);
          return true;
        } catch (err: any) {
          console.error('Permission check failed:', err);
          
          // Different browsers return different error types
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setInitError('Camera or microphone access was denied. Please grant permission when prompted.');
            setErrorType('permission');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setInitError('No camera or microphone found. Please connect a device and try again.');
            setErrorType('permission');
          } else {
            setInitError('An error occurred while accessing your camera and microphone.');
            setErrorType('unknown');
          }
          
          setHasPermissions(false);
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermissions(false);
      return false;
    }
  };

  // Use an effect to check permissions initially
  useEffect(() => {
    if (shouldInitialize) {
      checkPermissions();
    }
  }, [shouldInitialize, isAudioOnly]);

  // Set up permission change listeners
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      const setupPermissionListeners = async () => {
        try {
          // Set up listeners for permission changes
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          const handlePermissionChange = () => {
            console.log('Permission state changed, rechecking permissions');
            checkPermissions().then(hasPermissions => {
              if (hasPermissions && initError && errorType === 'permission') {
                // If permissions are now granted and we had a permission error, retry
                console.log('Permissions granted, retrying initialization');
                handleRetry();
              }
            });
          };
          
          cameraPermission.addEventListener('change', handlePermissionChange);
          micPermission.addEventListener('change', handlePermissionChange);
          
          return () => {
            cameraPermission.removeEventListener('change', handlePermissionChange);
            micPermission.removeEventListener('change', handlePermissionChange);
          };
        } catch (err) {
          console.warn('Could not set up permission change listeners:', err);
        }
      };
      
      setupPermissionListeners();
    } else {
      // For browsers without the permissions API, poll for permission changes
      // This helps recover if the user grants permissions after initially denying
      if (permissionCheckIntervalRef.current) {
        clearInterval(permissionCheckIntervalRef.current);
      }
      
      if (initError && errorType === 'permission') {
        // Only set up polling if we have a permission error
        permissionCheckIntervalRef.current = setInterval(() => {
          checkPermissions().then(hasPermissions => {
            if (hasPermissions) {
              // If permissions are now granted, retry
              console.log('Permissions now detected via polling, retrying');
              handleRetry();
              
              // Clear the interval once permissions are granted
              if (permissionCheckIntervalRef.current) {
                clearInterval(permissionCheckIntervalRef.current);
                permissionCheckIntervalRef.current = null;
              }
            }
          });
        }, 2000); // Check every 2 seconds
      }
      
      return () => {
        if (permissionCheckIntervalRef.current) {
          clearInterval(permissionCheckIntervalRef.current);
          permissionCheckIntervalRef.current = null;
        }
      };
    }
  }, [initError, errorType]);

  useEffect(() => {
    let audioTrack: IMicrophoneAudioTrack | undefined;
    let videoTrack: ICameraVideoTrack | undefined;
    let screenTrack: any;

    // Only initialize once to prevent multiple camera access requests
    // AND only if shouldInitialize is true
    if (isInitializedRef.current || !shouldInitialize) {
      console.log('Skipping initialization: isInitializedRef.current =', isInitializedRef.current, 'shouldInitialize =', shouldInitialize);
      return;
    }
    
    console.log('Starting video call initialization for channel:', channelName);
    isInitializedRef.current = true;
    
    const init = async () => {
      try {
        // Check permissions first
        const permissionsGranted = await checkPermissions();
        if (!permissionsGranted) {
          console.log('Permissions not granted, showing prompt');
          // Don't throw here - we'll show UI for the user to grant permissions
          return;
        }
        
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          console.log('Remote user published:', user.uid, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers(prev => {
              // Check if user is already in the array
              if (!prev.some(u => u.uid === user.uid)) {
                return [...prev, user];
              }
              return prev;
            });
          }
          
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
          
          // When a remote user joins, we're no longer waiting
          setWaitingForRemoteUser(false);
          
          // Clear any join timeout
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          }
          if (mediaType === 'audio') {
            user.audioTrack?.stop();
          }
        });

        client.on('user-left', user => {
          console.log('Remote user left:', user.uid);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          
          // If all users left, we're waiting again
          if (remoteUsers.length <= 1) {
            setWaitingForRemoteUser(true);
          }
        });

        client.on('connection-state-change', (state) => {
          console.log('Connection state changed to:', state);
          if (state === 'CONNECTED') {
            setConnectionState('connected');
          } else if (state === 'CONNECTING' || state === 'RECONNECTING') {
            setConnectionState('connecting');
          } else {
            setConnectionState('disconnected');
          }
        });

        // Generate a token and UID for the user
        console.log('Generating token for channel:', channelName);
        const { token, uid } = await generateToken(channelName);
        
        if (!token) {
          throw new Error('Failed to generate token');
        }
        
        console.log('Generated token successfully, joining channel with UID:', uid);
        
        // Flag that we're requesting permissions
        setPermissionRequested(true);
        
        // Join the channel
        await client.join(agoraConfig.appId, channelName, token, uid);
        console.log('Joined channel successfully');
        
        // Create and publish the tracks
        try {
          if (!isAudioOnly) {
            videoTrack = await AgoraRTC.createCameraVideoTrack();
            await client.publish(videoTrack);
            videoTrack.play('local-video');
          }
          
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          await client.publish(audioTrack);
        } catch (mediaError: any) {
          console.error('Error creating media tracks:', mediaError);
          
          // Handle specific media errors
          if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
            setInitError('Camera or microphone access was denied. Please grant permission when prompted.');
            setErrorType('permission');
            throw mediaError;
          } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
            setInitError('No camera or microphone found. Please connect a device and try again.');
            setErrorType('permission');
            throw mediaError;
          }
          
          // For other errors, continue with just audio if video fails
          if (!isAudioOnly && !videoTrack) {
            toast.warning('Could not access camera. Continuing with audio only.');
          }
        }
        
        // Set local tracks state
        setLocalTracks({
          audioTrack,
          videoTrack,
        });
        
        console.log('Local tracks published successfully');
        
        // Update state to connected
        setConnectionState('connected');
        setPermissionRequested(false);
        setInitError(null);
        setErrorType(null);
        
        // Set up a timeout to check if any remote users have joined
        // If not, we'll display a "waiting for participant" message
        joinTimeoutRef.current = setTimeout(() => {
          if (remoteUsers.length === 0) {
            console.log('No remote users joined after timeout');
            setWaitingForRemoteUser(true);
          }
        }, 5000); // 5 seconds timeout
        
        // Notify parent component that initialization is complete
        if (onInitialized) {
          console.log('Calling onInitialized callback');
          onInitialized();
        }
      } catch (error: any) {
        console.error('Error initializing video call:', error);
        setConnectionState('disconnected');
        
        // Set specific error messages based on the error type
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setInitError('Camera or microphone access was denied. Please grant permission when prompted.');
          setErrorType('permission');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setInitError('No camera or microphone found. Please connect a device and try again.');
          setErrorType('permission');
        } else if (error.type === 'NETWORK_ERROR' || error.message?.includes('network')) {
          setInitError('Network error. Please check your internet connection and try again.');
          setErrorType('connection');
        } else {
          setInitError('Failed to initialize video call. Please check your camera and microphone permissions.');
          setErrorType('unknown');
        }
        
        // Clean up any tracks that might have been created
        if (audioTrack) {
          audioTrack.stop();
          audioTrack.close();
        }
        
        if (videoTrack) {
          videoTrack.stop();
          videoTrack.close();
        }
        
        // Reset initialization flag to allow retry
        isInitializedRef.current = false;
      }
    };

    init();

    // Cleanup function
    return () => {
      // Reset initialization flag on unmount to allow re-initialization if needed
      isInitializedRef.current = false;
      
      // Clean up local tracks
      if (localTracks.audioTrack) {
        localTracks.audioTrack.stop();
        localTracks.audioTrack.close();
      }
      
      if (localTracks.videoTrack) {
        localTracks.videoTrack.stop();
        localTracks.videoTrack.close();
      }
      
      if (localTracks.screenTrack) {
        localTracks.screenTrack.stop();
        localTracks.screenTrack.close();
      }
      
      // Leave the channel
      if (client) {
        client.leave();
      }
      
      // Clear any timeouts
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      
      if (permissionCheckIntervalRef.current) {
        clearInterval(permissionCheckIntervalRef.current);
        permissionCheckIntervalRef.current = null;
      }
    };
  }, [channelName, isAudioOnly, onInitialized, shouldInitialize]);

  const toggleAudio = async () => {
    if (localTracks.audioTrack) {
      if (isAudioEnabled) {
        await localTracks.audioTrack.setEnabled(false);
      } else {
        await localTracks.audioTrack.setEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = async () => {
    if (localTracks.videoTrack && !isAudioOnly) {
      if (isVideoEnabled) {
        await localTracks.videoTrack.setEnabled(false);
      } else {
        await localTracks.videoTrack.setEnabled(true);
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleFullScreen = () => {
    if (isFullScreen) {
      document.exitFullscreen().catch(err => console.error('Error exiting fullscreen:', err));
      setIsFullScreen(false);
    } else if (containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => console.error('Error entering fullscreen:', err));
      setIsFullScreen(true);
    }
  };

  const startScreenSharing = async () => {
    try {
      // Stop video track first
      if (localTracks.videoTrack) {
        await client.unpublish(localTracks.videoTrack);
        localTracks.videoTrack.stop();
        localTracks.videoTrack.close();
      }
      
      // Create and publish screen track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
      await client.publish(screenTrack);
      
      if (Array.isArray(screenTrack)) {
        screenTrack[0].play('local-video');
      } else {
        screenTrack.play('local-video');
      }
      
      setLocalTracks(prev => ({ ...prev, screenTrack, videoTrack: undefined }));
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Error sharing screen:', error);
      
      // If screen sharing fails, try to restore camera
      if (!isAudioOnly) {
        try {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          await client.publish(videoTrack);
          videoTrack.play('local-video');
          setLocalTracks(prev => ({ ...prev, videoTrack }));
        } catch (err) {
          console.error('Error restoring camera after screen share fail:', err);
        }
      }
    }
  };

  const stopScreenSharing = async () => {
    try {
      // Unpublish and close screen track
      if (localTracks.screenTrack) {
        if (Array.isArray(localTracks.screenTrack)) {
          await client.unpublish(localTracks.screenTrack);
          localTracks.screenTrack[0].stop();
          localTracks.screenTrack[0].close();
        } else {
          await client.unpublish(localTracks.screenTrack);
          localTracks.screenTrack.stop();
          localTracks.screenTrack.close();
        }
      }

      // Create and publish video track again
      if (!isAudioOnly) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        await client.publish(videoTrack);
        setLocalTracks(prev => ({ ...prev, videoTrack, screenTrack: undefined }));
        videoTrack.play('local-video');
      } else {
        setLocalTracks(prev => ({ ...prev, screenTrack: undefined }));
      }
      
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const handleEndCall = async () => {
    console.log('Ending call from VideoCall component');
    setWasExplicitlyEnded(true);
    
    // Clean up local tracks
    if (localTracks.audioTrack) {
      localTracks.audioTrack.stop();
      localTracks.audioTrack.close();
    }
    
    if (localTracks.videoTrack) {
      localTracks.videoTrack.stop();
      localTracks.videoTrack.close();
    }
    
    if (localTracks.screenTrack) {
      localTracks.screenTrack.stop();
      localTracks.screenTrack.close();
    }
    
    // Reset local tracks
    setLocalTracks({});
    
    // Leave the channel
    try {
      await client.leave();
      console.log('Left channel successfully');
    } catch (error) {
      console.warn('Error leaving channel:', error);
    }
    
    // Call the onEndCall callback
    onEndCall();
  };
  
  // Update the retry handler to be more robust
  const handleRetry = () => {
    console.log('Retry attempt:', joinRetryCount + 1);
    
    // Clear any previous errors
    setInitError(null);
    setErrorType(null);
    
    // Reset initialization flag to allow retry
    isInitializedRef.current = false;
    
    // Increment retry counter
    setJoinRetryCount(prev => prev + 1);
    
    // Clean up any existing tracks
    if (localTracks.audioTrack) {
      localTracks.audioTrack.stop();
      localTracks.audioTrack.close();
    }
    
    if (localTracks.videoTrack) {
      localTracks.videoTrack.stop();
      localTracks.videoTrack.close();
    }
    
    // Reset local tracks
    setLocalTracks({});
    
    // Leave the channel if already joined
    client.leave().then(() => {
      console.log('Left channel for retry');
    }).catch(err => {
      console.warn('Error leaving channel for retry:', err);
    });
    
    // Force a re-render to restart the initialization process
    setTimeout(() => {
      // This will trigger the useEffect to run again
      isInitializedRef.current = false;
    }, 500);
  };

  // Effect to handle remote video playback
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        user.videoTrack.play(`remote-video-${user.uid}`);
      }
    });
  }, [remoteUsers]);

  // Effect to listen for session end events
  useEffect(() => {
    // Extract appointment ID from channel name
    const appointmentId = channelName.replace('appointment-', '');
    
    if (appointmentId) {
      const sessionEndListener = supabase
        .channel(`video-end:${appointmentId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_events',
          filter: `appointment_id=eq.${appointmentId} AND event_type=eq.session_ended`
        }, () => {
          // Session has been ended by the mentor
          handleEndCall();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(sessionEndListener);
      };
    }
  }, [channelName]);

  // Effect to handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // If there's an initialization error, show error UI
  if (initError) {
    return (
      <div className={containerClasses} ref={containerRef}>
        <div className="flex-1 flex items-center justify-center bg-gray-900 p-6 text-white text-center">
          <div className="max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Failed to initialize video call.</h3>
            <p className="mb-4">{initError}</p>
            
            {errorType === 'permission' && (
              <div className="p-3 bg-blue-900/30 rounded-lg mb-4 text-sm">
                <p>To fix this issue:</p>
                <ol className="list-decimal pl-5 text-left mt-2 space-y-1">
                  <li>Click the camera icon in your browser's address bar</li>
                  <li>Select "Allow" for both camera and microphone</li>
                  <li>Click the "Retry" button below</li>
                </ol>
              </div>
            )}
            
            <div className="flex space-x-3 justify-center">
              <Button 
                onClick={handleRetry}
                disabled={joinRetryCount >= maxRetryAttempts}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </Button>
              <Button 
                onClick={handleEndCall}
                variant="destructive"
              >
                End Call
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={containerClasses} ref={containerRef}>
      {connectionState === 'connecting' && !initError && !permissionRequested && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 text-white">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-3"></div>
            <p>Connecting to call...</p>
          </div>
        </div>
      )}
      
      {permissionRequested && connectionState === 'connecting' && !initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 text-white">
          <div className="flex flex-col items-center text-center max-w-sm px-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Video className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mb-4 font-medium text-lg">Camera and Microphone Access Required</p>
            <p className="mb-4">Please allow access to your camera and microphone when prompted by your browser.</p>
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      {waitingForRemoteUser && connectionState === 'connected' && remoteUsers.length === 0 && !initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 z-10 text-white pointer-events-none">
          <div className="flex flex-col items-center text-center max-w-sm px-4 pointer-events-auto bg-gray-900/70 p-6 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <Video className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mb-4 font-medium text-lg">Waiting for {participantName} to join...</p>
            <p className="mb-4">The call will begin automatically when they connect.</p>
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      <div className={videoContainerClasses}>
        {/* Local video */}
        {!isAudioOnly && (
          <div 
            id="local-video" 
            className={localVideoClasses}
            style={{
              transform: remoteUsers.length === 0 ? 'scaleX(-1)' : 'none', // Mirror local video when alone
              transition: 'all 0.3s ease'
            }}
          />
        )}
        
        {/* Remote videos */}
        {remoteUsers.map(user => (
          <div 
            key={user.uid}
            className="w-full h-full bg-gray-900 overflow-hidden relative"
          >
            {user.videoTrack && (
              <>
                <div id={`remote-video-${user.uid}`} className="w-full h-full" />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                  {participantName}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className={controlsContainerClasses}>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-gray-800 hover:bg-gray-700 border-none text-white rounded-full"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-500" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {!isAudioOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-gray-800 hover:bg-gray-700 border-none text-white rounded-full"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-red-500" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {!isAudioOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-gray-800 hover:bg-gray-700 border-none text-white rounded-full"
                    onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
                  >
                    {isScreenSharing ? <MonitorStop className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-gray-800 hover:bg-gray-700 border-none text-white rounded-full"
                  onClick={toggleFullScreen}
                >
                  {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-red-600 hover:bg-red-700 border-none text-white rounded-full"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                End Call
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
} 