import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Copy, RefreshCw, Camera, Mic, MicOff, CameraOff, Users } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleMeetFrameProps {
  meetingUrl?: string;
  height?: string;
  width?: string;
  isFloating?: boolean;
  onClose?: () => void;
}

// Function to create a direct Google Meet link
export const createGoogleMeetLink = () => {
  // Generate a random meeting ID
  const meetingId = Math.random().toString(36).substring(2, 12);
  // Don't use embed=true as it requires authentication
  return `https://meet.google.com/${meetingId}`;
};

export function GoogleMeetFrame({ 
  meetingUrl, 
  height = '100%', 
  width = '100%',
  isFloating = false,
  onClose
}: GoogleMeetFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualMeetingUrl, setActualMeetingUrl] = useState<string>(meetingUrl || '');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showSimpleView, setShowSimpleView] = useState(true); // Default to simple view
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [permissionRetryCount, setPermissionRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Check for camera permissions and initialize local video with auto-retry
  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        // Try to access the camera with lower constraints first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: true 
        });
        
        setHasCameraPermission(true);
        setLocalStream(stream);
        
        // Connect stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        toast.success("Camera and microphone initialized successfully");
      } catch (err) {
        console.error('Camera permission error:', err);
        
        // If we've retried less than 3 times, try again with different constraints
        if (permissionRetryCount < 3) {
          setPermissionRetryCount(prev => prev + 1);
          
          // Try with just audio if video fails
          try {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ 
              audio: true,
              video: false
            });
            
            setHasCameraPermission(true);
            setLocalStream(audioOnlyStream);
            setIsCameraEnabled(false);
            
            toast.info("Audio initialized, but camera access was denied");
          } catch (audioErr) {
            console.error('Audio permission error:', audioErr);
            setHasCameraPermission(false);
            setError("Failed to access camera and microphone");
            toast.error("Failed to initialize video call. Please check your camera and microphone permissions.");
          }
        } else {
          setHasCameraPermission(false);
        }
      }
    };
    
    checkCameraPermission();
    
    return () => {
      // Clean up stream when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [permissionRetryCount]);
  
  useEffect(() => {
    // If no meeting URL is provided, create a new one
    if (!meetingUrl) {
      const newMeetingUrl = createGoogleMeetLink();
      console.log('Created new Google Meet link:', newMeetingUrl);
      setActualMeetingUrl(newMeetingUrl);
    } else {
      setActualMeetingUrl(meetingUrl);
    }
  }, [meetingUrl]);
  
  useEffect(() => {
    // Reset loading state when URL changes
    if (actualMeetingUrl) {
      setIsLoading(true);
      setError(null);
      
      // Set a timeout to consider the iframe loaded after a reasonable time
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [actualMeetingUrl]);

  const handleIframeError = () => {
    console.error('Google Meet iframe failed to load');
    setError('Failed to load Google Meet');
    setShowSimpleView(true);
    setIsLoading(false);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(actualMeetingUrl);
    toast.success('Meeting link copied to clipboard');
  };

  const handleRefreshFrame = () => {
    setIsLoading(true);
    
    // Force iframe refresh by changing the key
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.src = actualMeetingUrl;
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    toast.info('Refreshing video call...');
  };

  const retryMediaAccess = () => {
    // Increment retry count to trigger the useEffect
    setPermissionRetryCount(prev => prev + 1);
    toast.info("Retrying camera and microphone access...");
  };

  const toggleSimpleView = () => {
    setShowSimpleView(!showSimpleView);
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraEnabled(!isCameraEnabled);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };
  
  const requestCameraPermission = async () => {
    try {
      // Try with different constraints
      const constraints = { 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }, 
        audio: true 
      };
      
      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setHasCameraPermission(true);
      setLocalStream(stream);
      
      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast.success('Camera and microphone access granted');
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      
      // Try with just audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(audioStream);
        setHasCameraPermission(true);
        setIsCameraEnabled(false);
        toast.info('Audio access granted, but camera was blocked');
      } catch (audioErr) {
        console.error('Failed to get audio permission:', audioErr);
        toast.error('Could not access camera or microphone. Please check your browser settings.');
      }
    }
  };
  
  if (!actualMeetingUrl) {
    return (
      <Card className="flex flex-col items-center justify-center p-6 h-full">
        <div className="text-blue-500 mb-4">
          <Video className="h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold mb-2">Creating Meeting...</h3>
        <p className="text-gray-600 mb-4 text-center">Please wait while we set up your meeting.</p>
        <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
      </Card>
    );
  }
  
  // Show camera permission request if needed
  if (hasCameraPermission === false) {
    return (
      <Card className="flex flex-col items-center justify-center p-6 h-full">
        <div className="text-amber-500 mb-4">
          <Video className="h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
        <p className="text-gray-600 mb-4 text-center">
          To join the video call, please allow access to your camera and microphone in your browser settings.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={requestCameraPermission}
            className="w-full flex items-center justify-center"
          >
            <Camera className="mr-2 h-5 w-5" />
            Allow Camera Access
          </Button>
          <Button 
            variant="outline"
            onClick={() => setHasCameraPermission(true)}
            className="w-full flex items-center justify-center"
          >
            <Mic className="mr-2 h-5 w-5" />
            Continue with Audio Only
          </Button>
          {onClose && (
            <Button 
              variant="ghost" 
              onClick={onClose}
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
            Test your camera and microphone
          </a>
        </div>
      </Card>
    );
  }
  
  // Show simple view with local video and meeting link
  if (showSimpleView || error) {
    return (
      <Card className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Video Call</h3>
            <p className="text-sm text-gray-500">Meeting ID: {actualMeetingUrl.split('/').pop()}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSimpleView}
            className="hidden md:flex items-center"
          >
            Try Google Meet
          </Button>
        </div>
        
        <div className="flex-grow p-4 flex flex-col">
          {/* Main video container */}
          <div className="flex-grow bg-gray-100 rounded-lg overflow-hidden relative mb-4">
            {localStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
            )}
            
            {/* Overlay with waiting message */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white">
              <div className="text-center p-4 bg-black bg-opacity-50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <h4 className="text-lg font-medium">Waiting for patient to join...</h4>
                <p className="text-sm opacity-80 mt-1">
                  {localStream 
                    ? (isCameraEnabled ? "Your video is active and ready" : "Audio only mode (camera disabled)")
                    : "Initializing your media devices..."}
                </p>
                {!localStream && (
                  <Button 
                    onClick={retryMediaAccess} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
            
            {/* Video controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <Button 
                size="icon" 
                variant={isMicEnabled ? "secondary" : "destructive"}
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={toggleMic}
                disabled={!localStream}
              >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button 
                size="icon" 
                variant={isCameraEnabled ? "secondary" : "destructive"}
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={toggleCamera}
                disabled={!localStream || !localStream.getVideoTracks().length}
              >
                {isCameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
              </Button>
              {onClose && (
                <Button 
                  size="icon" 
                  variant="destructive"
                  className="rounded-full h-12 w-12 shadow-lg"
                  onClick={onClose}
                >
                  <Video className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Meeting info and controls */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium mb-2">Meeting Information</h4>
            <p className="text-sm text-gray-600 mb-3">
              Share this link with your patient to join the meeting
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline"
                onClick={handleCopyLink}
                className="flex items-center justify-center flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Meeting Link
              </Button>
              <Button
                variant="outline"
                onClick={retryMediaAccess}
                className="flex items-center justify-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Media
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <a 
                href="/test/camera" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Having problems? Test your camera and microphone
              </a>
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Show Google Meet iframe
  return (
    <div className="relative h-full w-full flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center">
            <Video className="h-12 w-12 text-blue-600 animate-pulse" />
            <p className="mt-4 text-lg font-medium">Loading Google Meet...</p>
          </div>
        </div>
      )}
      
      <div className="absolute top-0 right-0 z-20 p-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSimpleView}
          className="bg-white shadow-md"
          title="Switch to simple view"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="bg-white shadow-md"
          title="Copy meeting link"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshFrame}
          className="bg-white shadow-md"
          title="Refresh video call"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className={`flex-grow ${isFloating ? 'rounded-lg overflow-hidden' : ''}`}>
        <iframe 
          ref={iframeRef}
          src={actualMeetingUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ height, width, border: 'none' }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
          onLoad={() => setIsLoading(false)}
          onError={handleIframeError}
        />
      </div>
      
      {isFloating && (
        <div className="flex justify-end items-center p-2 bg-gray-100 border-t">
          {onClose && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onClose}
            >
              End Call
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 