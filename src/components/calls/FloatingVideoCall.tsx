import React, { useState, useEffect } from 'react';
import { X, Minimize, Maximize, Video, AlertCircle } from 'lucide-react';
import { useVideoSession } from '@/contexts/VideoSessionContext';
import { AppointmentCall } from './AppointmentCall';
import { Button } from '@/components/ui/button';

interface FloatingVideoCallProps {
  appointmentId: string;
  patientName: string;
  isAudioOnly?: boolean;
  isMentor?: boolean;
}

export const FloatingVideoCall: React.FC<FloatingVideoCallProps> = ({
  appointmentId,
  patientName,
  isAudioOnly = false,
  isMentor = false
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initializationError, setInitializationError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const { endSession } = useVideoSession();

  useEffect(() => {
    // Handle cleanup when component unmounts
    return () => {
      // Additional cleanup when component unmounts
      try {
        console.log('FloatingVideoCall unmounting, cleaning up media');
        document.querySelectorAll('video').forEach(videoElement => {
          const stream = (videoElement as HTMLVideoElement).srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('Stopped track on unmount:', track.kind);
            });
            videoElement.srcObject = null;
          }
        });
      } catch (e) {
        console.warn('Error during FloatingVideoCall cleanup:', e);
      }
    };
  }, []);
  
  // Add auto-retry logic for initialization errors
  useEffect(() => {
    if (initializationError && retryCount < 2) {
      // Wait a bit before retrying
      const timer = setTimeout(() => {
        console.log(`Automatically retrying video initialization (attempt ${retryCount + 1})`);
        setInitializationError(false);
        setRetryCount(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [initializationError, retryCount]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (dragging) {
      const maxX = window.innerWidth - 300; // Adjust based on your component width
      const maxY = window.innerHeight - 200; // Adjust based on your component height
      
      // Calculate new position
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, dragOffset]);

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  const handleClose = () => {
    // First dispatch the event to ensure other components know about it
    window.dispatchEvent(
      new CustomEvent('floating-call-closed', {
        detail: { appointmentId }
      })
    );
    
    // Explicitly end the session via context to clean up media and localStorage
    console.log('Explicitly ending session from FloatingVideoCall close button');
    endSession();
  };

  const handleReturnToSession = () => {
    // Navigate to the appropriate appointment session page
    const basePath = isMentor ? '/mood-mentor-dashboard' : '/patient-dashboard';
    window.location.href = `${basePath}/appointments/${appointmentId}`;
  };

  const handleInitializationError = () => {
    console.log('Call initialization failed');
    setInitializationError(true);
  };
  
  const handleRetry = () => {
    setInitializationError(false);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      className={`fixed rounded-lg overflow-hidden shadow-lg transition-all z-50 bg-white ${
        isMinimized ? 'w-36 h-36' : 'w-72 h-48 md:w-80 md:h-64'
      }`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`
      }}
    >
      {/* Draggable header */}
      <div 
        className="bg-blue-600 text-white p-2 flex justify-between items-center cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="text-xs font-medium truncate flex-1">
          {isAudioOnly ? 'Audio Call' : 'Video Call'}
        </div>
        <div className="flex space-x-1">
          {isMinimized ? (
            <button 
              onClick={handleMaximize}
              className="text-white hover:bg-blue-700 rounded p-1"
            >
              <Maximize className="h-3 w-3" />
            </button>
          ) : (
            <button 
              onClick={handleMinimize}
              className="text-white hover:bg-blue-700 rounded p-1"
            >
              <Minimize className="h-3 w-3" />
            </button>
          )}
          <button 
            onClick={handleClose}
            className="text-white hover:bg-blue-700 rounded p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {/* Video content */}
      <div className="w-full h-full" onClick={isMinimized ? handleReturnToSession : undefined}>
        {!isMinimized ? (
          initializationError ? (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
              <div className="text-amber-500 mb-3">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-medium mb-2 text-center">
                Video initialization failed
              </h3>
              <p className="text-xs text-gray-600 mb-3 text-center">
                There was an issue starting the video call.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  size="sm"
                  onClick={handleRetry}
                  className="w-full"
                >
                  Retry
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleReturnToSession}
                  className="w-full"
                >
                  Go To Full Call Page
                </Button>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <AppointmentCall
              appointmentId={appointmentId}
              isAudioOnly={isAudioOnly}
              isMentor={isMentor}
              isFloating={true}
              patientName={patientName}
              onEndCall={handleClose}
              onError={handleInitializationError}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white text-xs">
            <div className="text-center">
              <span>Ongoing call</span>
              <div className="text-xs opacity-75 mt-1">Click to return</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 