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
      if (event.detail?.appointmentId === activeSession?.appointmentId) {
        endSession();
      }
    };

    window.addEventListener('floating-call-closed', handleFloatingCallClosed);

    // Also listen for page unload to clean up sessions if the user closes the browser
    const handleBeforeUnload = () => {
      // We don't call endSession() here because the page is unloading anyway
      // This is just for debugging purposes
      console.log('Page unloading, active session will be cleared on next load');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('floating-call-closed', handleFloatingCallClosed);
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