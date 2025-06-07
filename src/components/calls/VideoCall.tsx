import { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { agoraConfig } from '@/config/agora';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize, ScreenShare, MonitorStop } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateToken, generateUID } from '@/utils/tokenGenerator';

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
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [wasExplicitlyEnded, setWasExplicitlyEnded] = useState(false);
  const [waitingForRemoteUser, setWaitingForRemoteUser] = useState(true);
  const [joinRetryCount, setJoinRetryCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      'w-full h-full object-cover': remoteUsers.length === 0,
      'absolute bottom-4 right-4 w-32 h-24 rounded shadow-md z-10': remoteUsers.length >= 1
    }
  );
  
  const controlsContainerClasses = cn(
    'p-3 bg-gray-900 flex items-center justify-between'
  );

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
        if (!isAudioOnly) {
          videoTrack = await AgoraRTC.createCameraVideoTrack();
          await client.publish(videoTrack);
          videoTrack.play('local-video');
        }
        
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await client.publish(audioTrack);
        
        // Set local tracks state
        setLocalTracks({
          audioTrack,
          videoTrack,
        });
        
        console.log('Local tracks published successfully');
        
        // Update state to connected
        setConnectionState('connected');
        setPermissionRequested(false);
        
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
      } catch (error) {
        console.error('Error initializing video call:', error);
        setConnectionState('disconnected');
        setInitError('Failed to initialize video call. Please check your camera and microphone permissions.');
        
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
        
        // Don't automatically end call on initialization error
        // Instead, show an error message in the UI (handled in render)
        // This prevents appointments from being marked as completed automatically
        // onEndCall();
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
        if (Array.isArray(localTracks.screenTrack)) {
          localTracks.screenTrack[0].stop();
          localTracks.screenTrack[0].close();
        } else {
          localTracks.screenTrack.stop();
          localTracks.screenTrack.close();
        }
      }
      
      // Clear any pending timeouts
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      
      // Leave the channel
      client.leave().catch(err => {
        console.error('Error leaving channel:', err);
      });
      
      // Do not call onEndCall here - this prevents auto-completion when the component unmounts
      // onEndCall should only be called when the user explicitly ends the call
      console.log('VideoCall component unmounting, cleanup complete');
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
    console.log('VideoCall.handleEndCall called - user explicitly ended the call');
    
    try {
      // Stop and close all local tracks
      if (localTracks.audioTrack) {
        localTracks.audioTrack.stop();
        localTracks.audioTrack.close();
      }
      
      if (localTracks.videoTrack) {
        localTracks.videoTrack.stop();
        localTracks.videoTrack.close();
      }
      
      if (localTracks.screenTrack) {
        if (Array.isArray(localTracks.screenTrack)) {
          localTracks.screenTrack[0].stop();
          localTracks.screenTrack[0].close();
        } else {
          localTracks.screenTrack.stop();
          localTracks.screenTrack.close();
        }
      }
      
      // Leave the channel
      await client.leave();
      console.log('Left channel successfully');
      
      // Reset state
      setLocalTracks({});
      setRemoteUsers([]);
      
      // Mark that the call was explicitly ended by the user
      setWasExplicitlyEnded(true);
      
      // Notify parent component
      console.log('Calling onEndCall callback from VideoCall.handleEndCall');
      onEndCall();
    } catch (err) {
      console.error('Error ending call:', err);
      // Still notify parent even if there's an error
      setWasExplicitlyEnded(true);
      console.log('Calling onEndCall callback from VideoCall.handleEndCall (error path)');
      onEndCall();
    }
  };
  
  // Add a retry function to reinitialize the call
  const handleRetry = () => {
    console.log('Retrying video call initialization');
    setInitError(null);
    setConnectionState('connecting');
    isInitializedRef.current = false;
    
    // Increment retry count
    setJoinRetryCount(prev => prev + 1);
    
    // Only retry if we haven't exceeded max retry attempts
    if (joinRetryCount < maxRetryAttempts) {
      // The useEffect will reinitialize the call
    } else {
      setInitError('Maximum retry attempts reached. Please try again later or check your connection.');
    }
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
      
      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 text-white">
          <div className="flex flex-col items-center text-center max-w-sm px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
              <PhoneOff className="h-6 w-6 text-red-500" />
            </div>
            <p className="mb-4">{initError}</p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 border-none text-white"
                disabled={joinRetryCount >= maxRetryAttempts}
              >
                Retry
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEndCall}
                className="bg-red-600 hover:bg-red-700 border-none text-white"
              >
                End Call
              </Button>
            </div>
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