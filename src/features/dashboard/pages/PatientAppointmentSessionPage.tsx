import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { appointmentService } from '@/services';
import { AuthContext } from '@/contexts/authContext';
import { AppointmentCall } from '@/components/calls/AppointmentCall';
import { useVideoSession } from '@/contexts/VideoSessionContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

// Icons
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  X,
  AlertCircle,
  Mail,
  Phone,
  ArrowLeft,
  MessageCircle,
  CheckCircle,
  Star
} from 'lucide-react';

export default function PatientAppointmentSessionPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { setIsOnSessionPage, startSession: startVideoSession, activeSession, isSessionActiveForAppointment } = useVideoSession();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [mentor, setMentor] = useState<any>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [showSessionEndDialog, setShowSessionEndDialog] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Add a function to clean up camera access
  const cleanupCameraAccess = () => {
    // Only clean up if video is actually active
    if (isVideoActive) {
      console.log('Cleaning up camera access after patient session');
      // Get all media devices and stop them
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
          const tracks = stream.getTracks();
          tracks.forEach(track => {
            track.stop();
            console.log(`PatientSession: Stopped ${track.kind} track`);
          });
        })
        .catch(err => {
          console.warn('PatientSession: Could not get media devices to clean up:', err);
        });
    } else {
      console.log('No active video in patient session to clean up');
    }
  };

  // Check appointment status periodically and listen for session events
  useEffect(() => {
    // Mark that we're on the session page when component mounts
    setIsOnSessionPage(true);
    
    // Check if there's already an active session for this appointment
    if (appointmentId && isSessionActiveForAppointment(appointmentId)) {
      setIsVideoActive(true);
      setSessionStarted(true);
    }
    
    if (appointmentId) {
      fetchAppointmentDetails();
      
      // Poll for appointment status changes every 5 seconds
      const intervalId = setInterval(() => {
        checkAppointmentStatus();
      }, 5000);
      
      // Subscribe to session events
      const sessionChannel = supabase
        .channel(`session:${appointmentId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_events',
          filter: `appointment_id=eq.${appointmentId}`
        }, (payload) => {
          if (payload.new && payload.new.event_type === 'session_ended') {
            // Mentor has ended the session
            console.log('Received session_ended event:', payload.new);
            
            // Show end dialog instead of immediate redirect
            setSessionEndReason(payload.new.message || 'The mentor has ended this session');
            setShowSessionEndDialog(true);
            
            // Clean up video session
            if (isVideoActive) {
              setIsVideoActive(false);
              cleanupCameraAccess();
            }
          }
        })
        .subscribe();
      
      return () => {
        clearInterval(intervalId);
        supabase.removeChannel(sessionChannel);
        
        // Clean up camera access when leaving the page
        cleanupCameraAccess();
        
        // Mark that we're no longer on the session page when component unmounts
        setIsOnSessionPage(false);
      };
    }
    
    return () => {
      // Clean up camera access when leaving the page
      cleanupCameraAccess();
      
      // Ensure we mark that we're not on the session page when component unmounts
      setIsOnSessionPage(false);
    };
  }, [appointmentId, setIsOnSessionPage, isSessionActiveForAppointment]);
  
  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      if (!appointmentId) {
        toast.error('No appointment ID provided');
        navigate('/patient-dashboard/appointments');
        return;
      }
      
      // Fetch appointment details from the patient_appointments_view
      const { data, error } = await supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('id', appointmentId)
        .single();
        
      if (error) {
        console.error('Error fetching appointment details:', error);
        toast.error('Failed to load appointment details');
        navigate('/patient-dashboard/appointments');
        return;
      }
      
      if (!data) {
        toast.error('Appointment not found');
        navigate('/patient-dashboard/appointments');
        return;
      }
      
      // Check if user is the patient for this appointment
      if (user?.id !== data.patient_id) {
        // Before denying access, check if there's an active session for this appointment
        // This helps with minimized/maximized video windows
        if (isSessionActiveForAppointment(appointmentId)) {
          console.log('Patient has active session for this appointment, allowing access despite ID mismatch');
          // Allow access if there's already an active session
        } else {
          toast.error('You are not authorized to view this appointment session');
          navigate('/patient-dashboard/appointments');
          return;
        }
      }
      
      // For chat appointments, redirect to the messages page
      if (data.meeting_type?.toLowerCase() === 'chat') {
        navigate(`/patient-dashboard/messages/${data.mentor_id}`);
        return;
      }
      
      setAppointment(data);
      
      // Check if the session has been started by the mentor
      if (data.status === 'scheduled') {
        setSessionStarted(true);
        setSessionData({ meetingLink: data.meeting_link });
      }
      
      // Try to get additional mentor details if available
      if (data.mentor_id) {
        const { data: mentorData, error: mentorError } = await supabase
          .from('mood_mentor_profiles')
          .select('*')
          .eq('user_id', data.mentor_id)
          .single();
          
        if (!mentorError && mentorData) {
          setMentor(mentorData);
        } else {
          // Fallback to auth.users if profiles table doesn't exist
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(data.mentor_id);
            if (authUser?.user) {
              setMentor({
                id: authUser.user.id,
                full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Mentor',
                email: authUser.user.email,
                avatar_url: authUser.user.user_metadata?.avatar_url,
                specialty: authUser.user.user_metadata?.specialty || 'Mental Health Professional'
              });
            }
          } catch (adminError) {
            console.warn('Could not fetch mentor details from auth admin:', adminError);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchAppointmentDetails:', error);
      toast.error('An error occurred while loading appointment details');
    } finally {
      setLoading(false);
    }
  };
  
  const checkAppointmentStatus = async () => {
    try {
      if (!appointmentId) return;
      
      // Check appointment status
      const { data, error } = await supabase
        .from('appointments')
        .select('status, meeting_link')
        .eq('id', appointmentId)
        .single();
        
      if (error) {
        console.error('Error checking appointment status:', error);
        return;
      }
      
      // If appointment status is scheduled and we haven't started yet, enable join button
      if (data && data.status === 'scheduled' && !sessionStarted) {
        console.log('Mentor has started the session, enabling join button');
        setSessionStarted(true);
        setSessionData({ meetingLink: data.meeting_link });
        toast.success('Your mentor has started the session. You can join now!');
      } 
      // If appointment is completed and we're still in a session, end it
      else if (data && data.status === 'completed' && (sessionStarted || isVideoActive)) {
        console.log('Session marked as completed, ending patient side');
        
        // Show end dialog
        setSessionEndReason('This session has been completed by the mentor.');
        setShowSessionEndDialog(true);
        
        // Clean up video session
        if (isVideoActive) {
          setIsVideoActive(false);
        }
      }
      
      // Check for recent session events
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('session_events')
          .select('*')
          .eq('appointment_id', appointmentId)
          .eq('event_type', 'session_ended')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!eventError && eventData && eventData.length > 0) {
          // There's a session_ended event
          const event = eventData[0];
          
          // Only process if we haven't already handled this event
          if ((sessionStarted || isVideoActive) && !sessionData?.sessionEndedHandled) {
            console.log('Found session_ended event, ending patient side');
            
            // Show end dialog
            setSessionEndReason(event.message || 'The mentor has ended this session');
            setShowSessionEndDialog(true);
            
            // Clean up video session
            if (isVideoActive) {
              setIsVideoActive(false);
            }
            
            setSessionData({
              ...sessionData,
              sessionEndedHandled: true
            });
          }
        }
      } catch (eventError) {
        // Ignore errors from session_events table if it doesn't exist yet
        console.warn('Error checking session events:', eventError);
      }
    } catch (error) {
      console.error('Error checking appointment status:', error);
    }
  };
  
  const handleJoinSession = async () => {
    if (sessionStarted) {
      console.log('Patient joining session:', appointmentId);
      
      // Set video as active - this will enable the camera
      setIsVideoActive(true);
      
      // Start persistent video session
      startVideoSession({
        appointmentId: appointmentId || '',
        patientName: appointment.mentor_name || mentor?.full_name || 'Mentor',
        isAudioOnly: appointment.meeting_type?.toLowerCase() === 'audio'
      });
      
      // Log that patient has joined
      try {
        await supabase
          .from('session_events')
          .insert({
            appointment_id: appointmentId,
            event_type: 'patient_joined',
            initiated_by: 'patient',
            message: 'Patient has joined the session'
          });
      } catch (error) {
        console.warn('Error logging patient join event:', error);
        // Continue anyway as this is not critical
      }
    } else {
      toast.error('Please wait for your mood mentor to start the session before joining.');
    }
  };
  
  const handleMessageMentor = () => {
    if (appointment?.mentor_id) {
      navigate(`/patient-dashboard/messages/${appointment.mentor_id}`);
    }
  };
  
  // Get status badge with appropriate styling
  const getStatusBadge = () => {
    if (!appointment) return null;
    
    switch (appointment.status) {
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
            <Video className="mr-1.5 h-3.5 w-3.5" /> In Progress
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="mr-1 h-3 w-3" /> Upcoming
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" /> {appointment.status}
          </Badge>
        );
    }
  };
  
  // Add SessionEndDialog component
  const SessionEndDialog = () => {
    // Start countdown when dialog opens
    useEffect(() => {
      if (showSessionEndDialog && countdown === null) {
        setCountdown(5);
        
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(timer);
              // Redirect when countdown reaches 0
              setTimeout(() => {
                navigate('/patient-dashboard/appointments');
              }, 500);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      }
    }, [showSessionEndDialog]);

    return (
      <Dialog open={showSessionEndDialog} onOpenChange={setShowSessionEndDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Session Ended</DialogTitle>
            <DialogDescription>
              Your session with {appointment.mentor_name || mentor?.full_name || 'your mentor'} has ended.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p>{sessionEndReason}</p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Thank you for attending your session!</h3>
              <p className="text-blue-700 text-sm">
                We hope it was helpful. Remember that emotional well-being is a journey, 
                and each session is a step forward. Continue practicing the techniques discussed today.
              </p>
            </div>
            
            {countdown !== null && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">Redirecting to appointments in</p>
                <p className="text-2xl font-bold text-blue-600">{countdown}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/patient-dashboard/appointments')}
            >
              View Appointments
            </Button>
            <Button
              onClick={() => {
                setShowSessionEndDialog(false);
                navigate(`/patient-dashboard/messages/${appointment.mentor_id}`);
              }}
            >
              Message Your Mentor
            </Button>
            <Button
              onClick={() => {
                setShowSessionEndDialog(false);
                navigate('/booking');
              }}
            >
              Book New Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // Render error state if appointment not found
  if (!appointment) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
            <p className="text-gray-600 mb-4">
              The appointment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/patient-dashboard/appointments')}>
              Return to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0" 
          onClick={() => navigate('/patient-dashboard/appointments')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Appointments
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Session Details</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                Appointment information and mentor details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date and time */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">
                    {format(parseISO(appointment.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
              </div>
              
              {/* Meeting type */}
              <div className="flex items-center">
                <div className="font-medium text-gray-700 w-24">Type:</div>
                <div className="text-gray-600">{appointment.meeting_type}</div>
              </div>
              
              {/* Meeting title */}
              <div className="flex items-center">
                <div className="font-medium text-gray-700 w-24">Title:</div>
                <div className="text-gray-600">{appointment.title}</div>
              </div>
              
              {/* Mentor information */}
              <div className="border rounded-lg p-4 mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Mood Mentor</h3>
                <div className="flex items-center space-x-3 mb-3">
                  <FallbackAvatar
                    src={appointment.mentor_avatar_url || mentor?.avatar_url}
                    name={appointment.mentor_name || mentor?.full_name || 'Mentor'}
                    className="h-12 w-12"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {appointment.mentor_name || mentor?.full_name || 'Mentor'}
                    </h4>
                    <div className="text-sm text-gray-500">
                      {mentor?.specialty || appointment.mentor_specialty || 'Mental Health Professional'}
                    </div>
                  </div>
                </div>
                
                {/* Mentor contact info */}
                <div className="space-y-2 text-sm">
                  {(appointment.mentor_email || mentor?.email) && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {appointment.mentor_email || mentor?.email}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description if available */}
              {appointment.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Description:</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {appointment.description}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleMessageMentor}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message Mentor
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:w-2/3">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Appointment Session</CardTitle>
              <CardDescription>
                {sessionStarted ? 'Your session with the mentor is ready to join' : 'Waiting for your mentor to start the session'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {sessionStarted ? (
                <div className="h-full flex flex-col">
                  {/* Meeting section based on type */}
                  <div className="rounded-lg flex-grow">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-blue-800">
                        {appointment.meeting_type?.toLowerCase() === 'video' ? 'Video Meeting' : 'Audio Call'}
                      </h3>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        <Video className="mr-1.5 h-3.5 w-3.5" /> In Progress
                      </Badge>
                    </div>
                    
                    <p className="text-blue-700 mb-4">
                      Your mentor has started the {appointment.meeting_type?.toLowerCase()} session.
                    </p>
                    
                    <div className="w-full h-[500px] bg-gray-900 rounded-lg overflow-hidden">
                      {activeSession?.appointmentId === appointmentId || isVideoActive ? (
                        <AppointmentCall
                          appointmentId={appointmentId || ''}
                          isAudioOnly={appointment.meeting_type?.toLowerCase() === 'audio'}
                          isMentor={false}
                          redirectPath="/patient-dashboard/appointments"
                          mentorName={appointment.mentor_name || mentor?.full_name || 'Mentor'}
                          onEndCall={() => {
                            console.log('Call ended from AppointmentCall component');
                            setIsVideoActive(false);
                            setShowSessionEndDialog(true);
                            setSessionEndReason('The session has ended.');
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Button 
                            size="lg" 
                            onClick={handleJoinSession}
                            className="w-full max-w-xs"
                          >
                            {appointment.meeting_type?.toLowerCase() === 'video' ? (
                              <><Video className="mr-2 h-5 w-5" /> Join Video Session</>
                            ) : (
                              <><Phone className="mr-2 h-5 w-5" /> Join Audio Call</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Feedback section could be added here for completed sessions */}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-blue-50 p-6 rounded-lg text-center mb-6 w-full max-w-md">
                    {appointment.meeting_type?.toLowerCase() === 'video' ? (
                      <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    ) : appointment.meeting_type?.toLowerCase() === 'audio' ? (
                      <Phone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    ) : (
                      <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    )}
                    <h2 className="text-xl font-semibold text-blue-800 mb-2">Waiting for Mentor</h2>
                    <p className="text-blue-700 mb-6">
                      Your mood mentor hasn't started the session yet. Once they start the session, you'll be able to join.
                    </p>
                    <Button 
                      size="lg" 
                      disabled={true}
                      className="w-full opacity-50 cursor-not-allowed"
                    >
                      {appointment.meeting_type?.toLowerCase() === 'video' ? (
                        <><Video className="mr-2 h-5 w-5" /> Waiting for Mentor</>
                      ) : appointment.meeting_type?.toLowerCase() === 'audio' ? (
                        <><Phone className="mr-2 h-5 w-5" /> Waiting for Mentor</>
                      ) : (
                        <><MessageCircle className="mr-2 h-5 w-5" /> Waiting for Mentor</>
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-amber-600 flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Please wait for your mentor to start the session.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Session End Dialog */}
      <SessionEndDialog />
    </div>
  );
} 