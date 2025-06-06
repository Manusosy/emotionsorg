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
  participantName = 'Participant'
}: VideoCallProps) {
  const [localTracks, setLocalTracks] = useState<{
    audioTrack?: IMicrophoneAudioTrack;
    videoTrack?: ICameraVideoTrack;
    screenTrack?: any;
  }>({});
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    let audioTrack: IMicrophoneAudioTrack | undefined;
    let videoTrack: ICameraVideoTrack | undefined;
    let screenTrack: any;

    // Only initialize once to prevent multiple camera access requests
    if (isInitializedRef.current) {
      return;
    }
    
    isInitializedRef.current = true;
    
    const init = async () => {
      try {
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers(prev => [...prev, user]);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
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
          console.error('Failed to generate token - falling back to app ID only mode');
          console.warn('This is not secure for production! Make sure the agora-token function is deployed.');
        }
        
        // Join the channel with the token
        console.log('Joining channel with token:', token ? 'Valid token' : 'No token (app ID only)');
        await client.join(agoraConfig.appId, channelName, token, uid);
        console.log('Successfully joined channel:', channelName);
        setConnectionState('connected');

        // Create audio track first
        console.log('Creating audio track...');
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        
        // Create video track only if not in audio-only mode
        if (!isAudioOnly) {
          console.log('Creating video track...');
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 360,
              frameRate: 30
            }
          });
          
          // Publish both tracks
          await client.publish([audioTrack, videoTrack]);
          console.log('Published local audio and video tracks');
          
          // Play local video
          if (videoTrack) {
            videoTrack.play('local-video');
          }
        } else {
          // Publish only audio track
          await client.publish([audioTrack]);
          console.log('Published local audio track (audio only mode)');
        }

        setLocalTracks({ audioTrack, videoTrack });
      } catch (error) {
        console.error('Error initializing video call:', error);
        setConnectionState('disconnected');
        
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
        
        // Notify the parent component about the error
        onEndCall();
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
      
      // Leave the channel
      client.leave().catch(err => {
        console.error('Error leaving channel:', err);
      });
    };
  }, [channelName, isAudioOnly]);

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
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const toggleScreenSharing = async () => {
    if (!isScreenSharing) {
      try {
        // Stop video track if it's active
        if (localTracks.videoTrack) {
          await client.unpublish(localTracks.videoTrack);
          localTracks.videoTrack.stop();
          localTracks.videoTrack.close();
        }

        // Create and publish screen track
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
        await client.publish(screenTrack);
        
        setLocalTracks(prev => ({ ...prev, screenTrack, videoTrack: undefined }));
        setIsScreenSharing(true);
        
        // Handle when user stops screen sharing via browser UI
        if (Array.isArray(screenTrack)) {
          screenTrack[0].on('track-ended', () => {
            stopScreenSharing();
          });
        } else {
          screenTrack.on('track-ended', () => {
            stopScreenSharing();
          });
        }
        
        // Play the screen track
        if (Array.isArray(screenTrack)) {
          screenTrack[0].play('local-video');
        } else {
          screenTrack.play('local-video');
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      stopScreenSharing();
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
    console.log('Ending call and cleaning up resources');
    
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
      console.log('Successfully left the channel');
      
      // Reset initialization flag to allow re-initialization if needed
      isInitializedRef.current = false;
      
      // Call the onEndCall callback
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      // Still call onEndCall even if there was an error
      onEndCall();
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

  // Adjust styles for floating mode
  const containerClasses = cn(
    "relative overflow-hidden bg-gray-900 rounded-lg",
    isFloating ? "w-full h-full" : "w-full h-[500px]"
  );

  // Determine video container classes based on number of participants
  const videoContainerClasses = cn(
    "w-full h-full grid gap-2 p-2",
    remoteUsers.length === 0 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
  );

  // Determine local video classes based on number of participants
  const localVideoClasses = cn(
    "bg-gray-800 rounded overflow-hidden relative",
    remoteUsers.length === 0 ? "w-full h-full" : "w-full h-full md:h-[calc(100%-80px)]"
  );

  return (
    <Card className={containerClasses} ref={containerRef}>
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 text-white">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-3"></div>
            <p>Connecting to call...</p>
          </div>
        </div>
      )}
      
      <div className={videoContainerClasses}>
        {/* Local video */}
        {!isAudioOnly && (
          <div 
            id="local-video" 
            className={localVideoClasses}
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-center">
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
                    onClick={toggleScreenSharing}
                  >
                    {isScreenSharing ? <MonitorStop className="h-5 w-5 text-blue-400" /> : <ScreenShare className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
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
                {isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
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