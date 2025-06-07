import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface VideoSessionContextType {
  activeSession: ActiveSession | null;
  startSession: (session: ActiveSession) => void;
  endSession: () => void;
  isOnSessionPage: boolean;
  setIsOnSessionPage: (isOn: boolean) => void;
  isSessionActiveForAppointment: (appointmentId: string) => boolean;
}

export interface ActiveSession {
  appointmentId: string;
  patientName: string;
  isAudioOnly: boolean;
}

const VideoSessionContext = createContext<VideoSessionContextType | undefined>(undefined);

export const VideoSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage if available
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    try {
      const savedSession = localStorage.getItem('activeVideoSession');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch (e) {
      console.error('Error loading saved video session:', e);
      return null;
    }
  });
  
  const [isOnSessionPage, setIsOnSessionPage] = useState<boolean>(false);

  // Update localStorage whenever activeSession changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeVideoSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('activeVideoSession');
    }
  }, [activeSession]);

  // Add a function to completely clean up camera access
  const cleanupCameraAccess = () => {
    // Only attempt to clean up tracks if MediaDevices API is available
    if (navigator.mediaDevices) {
      // Don't request new media permissions; only check for existing tracks
      // Instead of requesting new permissions, just check if tracks exist already
      try {
        // Get all media tracks currently in use and stop them
        const mediaDevices = navigator.mediaDevices as any;
        
        // Check if the browser supports enumerating media devices
        if (mediaDevices.getTracks) {
          const tracks = mediaDevices.getTracks();
          if (tracks && tracks.length > 0) {
            tracks.forEach((track: MediaStreamTrack) => {
              track.stop();
              console.log(`Stopped existing ${track.kind} track`);
            });
          }
        }
      } catch (err) {
        console.warn('Error while cleaning up existing media tracks:', err);
      }
    }
  };

  const startSession = (session: ActiveSession) => {
    console.log('Starting video session:', session);
    setActiveSession(session);
  };

  // Update the endSession function to ensure camera access is released
  const endSession = () => {
    console.log('Ending video session in context:', activeSession);
    
    // Clean up any resources
    if (activeSession) {
      // Dispatch event to notify any floating video components
      window.dispatchEvent(
        new CustomEvent('floating-call-closed', {
          detail: { appointmentId: activeSession.appointmentId }
        })
      );
      
      // Clean up camera access
      cleanupCameraAccess();
      
      // Clear the active session
      setActiveSession(null);
      
      // Update localStorage
      localStorage.removeItem('activeVideoSession');
    }
  };

  const isSessionActiveForAppointment = (appointmentId: string) => {
    // Check if there's an active session for this appointment
    const hasActiveSession = activeSession?.appointmentId === appointmentId;
    
    if (hasActiveSession) {
      // If session is active, refresh its timestamp to prevent expiration
      if (activeSession) {
        localStorage.setItem('activeVideoSession', JSON.stringify({
          ...activeSession,
          lastRefreshed: new Date().toISOString() // Add timestamp
        }));
      }
    }
    
    return hasActiveSession;
  };

  // Add a logout cleanup function to the provider
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, cleaning up camera access');
        cleanupCameraAccess();
        setActiveSession(null);
        localStorage.removeItem('activeVideoSession');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <VideoSessionContext.Provider
      value={{
        activeSession,
        startSession,
        endSession,
        isOnSessionPage,
        setIsOnSessionPage,
        isSessionActiveForAppointment
      }}
    >
      {children}
    </VideoSessionContext.Provider>
  );
};

export const useVideoSession = (): VideoSessionContextType => {
  const context = useContext(VideoSessionContext);
  if (context === undefined) {
    throw new Error('useVideoSession must be used within a VideoSessionProvider');
  }
  return context;
}; 