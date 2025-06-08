import React, { useEffect, useContext } from 'react';
import { FloatingVideoCall } from './FloatingVideoCall';
import { useVideoSession } from '@/contexts/VideoSessionContext';
import { AuthContext } from '@/contexts/authContext';

export const PersistentVideoSession: React.FC = () => {
  const { activeSession, endSession, isOnSessionPage } = useVideoSession();
  const { user } = useContext(AuthContext) || {};
  const isMentor = user?.user_metadata?.role === 'mood_mentor';

  useEffect(() => {
    // Listen for the floating call closed event
    const handleFloatingCallClosed = (event: any) => {
      console.log('Received floating-call-closed event:', event.detail);
      if (event.detail?.appointmentId === activeSession?.appointmentId) {
        console.log('Ending active session due to floating-call-closed event');
        endSession();
      }
    };

    // Listen for explicit end session events
    const handleEndSessionEvent = (event: any) => {
      if (event.detail?.action === 'end_session' && activeSession) {
        console.log('Ending session due to explicit end_session event');
        endSession();
      }
    };

    window.addEventListener('floating-call-closed', handleFloatingCallClosed);
    window.addEventListener('video-session-action', handleEndSessionEvent);

    // Also listen for page unload to clean up sessions if the user closes the browser
    const handleBeforeUnload = () => {
      console.log('Page unloading, ending active session');
      if (activeSession) {
        // Try to clean up media before unload
        try {
          navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {});
            
          document.querySelectorAll('video').forEach(videoElement => {
            const stream = (videoElement as HTMLVideoElement).srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              videoElement.srcObject = null;
            }
          });
        } catch (e) {
          console.warn('Error during unload cleanup:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('floating-call-closed', handleFloatingCallClosed);
      window.removeEventListener('video-session-action', handleEndSessionEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession, endSession]);

  // Don't show the floating video if we're on the session page or no active session
  if (!activeSession || isOnSessionPage) return null;

  return (
    <FloatingVideoCall
      appointmentId={activeSession.appointmentId}
      patientName={activeSession.patientName}
      isAudioOnly={activeSession.isAudioOnly}
      isMentor={isMentor}
    />
  );
}; 