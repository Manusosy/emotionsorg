import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minimize, Maximize, Video } from 'lucide-react';
import { AppointmentCall } from './AppointmentCall';
import { toast } from 'sonner';

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
  isMentor = true
}) => {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 240 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep within window bounds
        const boundedX = Math.max(0, Math.min(window.innerWidth - (isMinimized ? 180 : 320), newX));
        const boundedY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 100 : 240), newY));
        
        setPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMinimized]);

  // Return to session page
  const handleReturnToSession = () => {
    // Navigate to the appropriate session page based on user role
    const path = `/${isMentor ? 'mood-mentor-dashboard' : 'patient-dashboard'}/session/${appointmentId}`;
    
    // Use window.location for a full page reload to ensure clean state
    window.location.href = path;
    
    toast.info("Returning to full session view...");
  };

  // Handle maximize - navigate back to full session page
  const handleMaximize = () => {
    handleReturnToSession();
  };

  // Close the floating call
  const handleClose = () => {
    if (confirm("Are you sure you want to end this call? This will disconnect you from the session.")) {
      // Dispatch an event that the parent component can listen for
      const event = new CustomEvent('floating-call-closed', { 
        detail: { appointmentId } 
      });
      window.dispatchEvent(event);
      toast.info("Call ended");
    }
  };

  return (
    <div
      className={`fixed bg-white rounded-lg shadow-lg z-50 overflow-hidden transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        width: isMinimized ? '180px' : '320px',
        height: isMinimized ? '100px' : '240px',
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Header bar */}
      <div 
        className="bg-blue-600 text-white p-2 flex justify-between items-center"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center text-sm truncate">
          <Video className="w-4 h-4 mr-1" />
          <span className="truncate">{isMinimized ? 'Call' : `Session with ${patientName}`}</span>
        </div>
        <div className="flex items-center space-x-1">
          {isMinimized ? (
            <Maximize 
              className="w-4 h-4 hover:bg-blue-500 rounded cursor-pointer" 
              onClick={handleMaximize} 
            />
          ) : (
            <Minimize 
              className="w-4 h-4 hover:bg-blue-500 rounded cursor-pointer" 
              onClick={() => setIsMinimized(true)} 
            />
          )}
          <X 
            className="w-4 h-4 hover:bg-blue-500 rounded cursor-pointer" 
            onClick={handleClose} 
          />
        </div>
      </div>

      {/* Video content */}
      <div className="w-full h-full" onClick={isMinimized ? handleReturnToSession : undefined}>
        {!isMinimized ? (
          <AppointmentCall
            appointmentId={appointmentId}
            isAudioOnly={isAudioOnly}
            isMentor={isMentor}
            isFloating={true}
            patientName={patientName}
          />
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