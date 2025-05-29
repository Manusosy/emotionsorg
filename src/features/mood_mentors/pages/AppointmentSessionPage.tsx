import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { appointmentService } from '@/services';
import { AuthContext } from '@/contexts/authContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Icons
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  X,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

export default function AppointmentSessionPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  
  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    }
  }, [appointmentId]);
  
  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      if (!appointmentId) {
        toast.error('No appointment ID provided');
        navigate('/mood-mentor-dashboard');
        return;
      }
      
      // Fetch appointment details from the mentor_appointments_view
      const { data, error } = await supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('id', appointmentId)
        .single();
        
      if (error) {
        console.error('Error fetching appointment details:', error);
        toast.error('Failed to load appointment details');
        navigate('/mood-mentor-dashboard');
        return;
      }
      
      if (!data) {
        toast.error('Appointment not found');
        navigate('/mood-mentor-dashboard');
        return;
      }
      
      // Check if user is the mentor for this appointment
      if (user?.id !== data.mentor_id) {
        toast.error('You are not authorized to view this appointment session');
        navigate('/mood-mentor-dashboard');
        return;
      }
      
      // For chat appointments, redirect to the messages page
      if (data.meeting_type?.toLowerCase() === 'chat') {
        navigate(`/mood-mentor-dashboard/messages/${data.patient_id}`);
        return;
      }
      
      setAppointment(data);
      setNotes(data.notes || '');
      
      // Try to get additional patient details if available
      if (data.patient_id) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.patient_id)
          .single();
          
        if (!userError && userData) {
          setPatient(userData);
        } else {
          // Fallback to auth.users if profiles table doesn't exist
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(data.patient_id);
            if (authUser?.user) {
              setPatient({
                id: authUser.user.id,
                full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Patient',
                email: authUser.user.email,
                avatar_url: authUser.user.user_metadata?.avatar_url
              });
            }
          } catch (adminError) {
            console.warn('Could not fetch user details from auth admin:', adminError);
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
  
  const startSession = async () => {
    try {
      setSessionLoading(true);
      
      const result = await appointmentService.startAppointmentSession(appointmentId || '');
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setSessionData(result.data);
      setSessionStarted(true);
      toast.success('Session started successfully');
      
      // Update local appointment status if needed
      if (appointment && appointment.status !== 'in-progress') {
        setAppointment({
          ...appointment,
          status: 'in-progress'
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start appointment session');
    } finally {
      setSessionLoading(false);
    }
  };
  
  const completeSession = async () => {
    try {
      setSessionLoading(true);
      
      // First update notes if they've changed
      if (notes !== appointment.notes) {
        const { error: notesError } = await supabase
          .from('appointments')
          .update({ notes })
          .eq('id', appointmentId);
          
        if (notesError) {
          console.warn('Error updating appointment notes:', notesError);
        }
      }
      
      // Now complete the appointment
      const result = await appointmentService.completeAppointment(appointmentId || '');
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment completed successfully');
      
      // Update local appointment status
      setAppointment({
        ...appointment,
        status: 'completed',
        notes
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/mood-mentor-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete appointment session');
    } finally {
      setSessionLoading(false);
    }
  };
  
  const cancelSession = async () => {
    try {
      setSessionLoading(true);
      
      const result = await appointmentService.cancelAppointment(appointmentId || '', 'Cancelled by mentor');
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment cancelled successfully');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/mood-mentor-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setSessionLoading(false);
    }
  };
  
  const handleMessagePatient = () => {
    if (appointment?.patient_id) {
      navigate(`/mood-mentor-dashboard/messages/${appointment.patient_id}`);
    }
  };
  
  // Check if appointment is ready to start
  const canStartSession = () => {
    if (!appointment) return false;
    
    try {
      const now = new Date();
      const appointmentDate = parseISO(appointment.date);
      const [hours, minutes] = appointment.start_time.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Calculate difference in minutes
      const diffInMinutes = (appointmentDate.getTime() - now.getTime()) / (1000 * 60);
      
      // Return true if appointment is within 15 minutes (and not more than 60 min in the past)
      return diffInMinutes >= -60 && diffInMinutes <= 15;
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
  };
  
  // Get status badge with appropriate styling
  const getStatusBadge = () => {
    if (!appointment) return null;
    
    switch (appointment.status) {
      case 'scheduled':
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
      case 'in-progress':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Video className="mr-1 h-3 w-3" /> In Progress
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
            <Button onClick={() => navigate('/mood-mentor-dashboard')}>
              Return to Dashboard
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
          onClick={() => navigate('/mood-mentor-dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
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
                Appointment information and patient details
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
              
              {/* Patient information */}
              <div className="border rounded-lg p-4 mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Patient Information</h3>
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-12 w-12">
                    {appointment.patient_avatar_url || patient?.avatar_url ? (
                      <AvatarImage 
                        src={appointment.patient_avatar_url || patient?.avatar_url} 
                        alt={appointment.patient_name || patient?.full_name || 'Patient'} 
                      />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {(appointment.patient_name || patient?.full_name || 'P')
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {appointment.patient_name || patient?.full_name || 'Patient'}
                    </h4>
                  </div>
                </div>
                
                {/* Patient contact info */}
                <div className="space-y-2 text-sm">
                  {(appointment.patient_email || patient?.email) && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {appointment.patient_email || patient?.email}
                    </div>
                  )}
                  {patient?.phone_number && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {patient.phone_number}
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
                onClick={handleMessagePatient}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message Patient
              </Button>
              
              {appointment.status === 'scheduled' || appointment.status === 'pending' ? (
                <Button
                  variant="outline"
                  className="w-full text-red-500 border-red-200 hover:bg-red-50"
                  onClick={cancelSession}
                  disabled={sessionLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Appointment
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:w-2/3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Appointment Session</CardTitle>
              <CardDescription>
                {sessionStarted ? 'Your session is in progress' : 'Start your session with the patient'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sessionStarted ? (
                <div className="space-y-6">
                  {/* Meeting section based on type */}
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    {appointment.meeting_type?.toLowerCase() === 'video' && (
                      <>
                        <h3 className="font-medium text-blue-800 mb-3">Video Meeting</h3>
                        <p className="text-blue-700 mb-4">
                          Your video meeting is active. Use the button below to join the video call.
                        </p>
                        <Button 
                          size="lg"
                          onClick={() => window.open(sessionData?.meetingLink || '#', '_blank')}
                        >
                          <Video className="mr-2 h-5 w-5" />
                          Join Video Call
                        </Button>
                      </>
                    )}
                    
                    {appointment.meeting_type?.toLowerCase() === 'audio' && (
                      <>
                        <h3 className="font-medium text-blue-800 mb-3">Audio Call</h3>
                        <p className="text-blue-700 mb-4">
                          Your audio call is active. Use the button below to join the audio call.
                        </p>
                        <Button 
                          size="lg"
                          onClick={() => window.open(sessionData?.meetingLink || '#', '_blank')}
                        >
                          <Phone className="mr-2 h-5 w-5" />
                          Join Audio Call
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Session notes */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Session Notes</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Take notes during your session with the patient. These notes will be saved with the appointment record.
                    </p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter your session notes here..."
                      className="min-h-[200px]"
                    />
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
                    <h2 className="text-xl font-semibold text-blue-800 mb-2">Ready to Start?</h2>
                    <p className="text-blue-700 mb-6">
                      {canStartSession() 
                        ? `You can now start your ${appointment.meeting_type} session with the patient.`
                        : `This appointment is not yet ready to start. You can start the session 15 minutes before the scheduled time.`}
                    </p>
                    <Button 
                      size="lg" 
                      onClick={startSession}
                      disabled={!canStartSession() || sessionLoading || appointment.status === 'cancelled' || appointment.status === 'completed'}
                      className="w-full"
                    >
                      {appointment.meeting_type?.toLowerCase() === 'video' ? (
                        <><Video className="mr-2 h-5 w-5" /> Start Video Session</>
                      ) : appointment.meeting_type?.toLowerCase() === 'audio' ? (
                        <><Phone className="mr-2 h-5 w-5" /> Start Audio Call</>
                      ) : (
                        <><MessageCircle className="mr-2 h-5 w-5" /> Start Chat</>
                      )}
                    </Button>
                  </div>
                  
                  {!canStartSession() && (
                    <div className="text-amber-600 flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      You can start the session 15 minutes before the scheduled time.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-6">
              {sessionStarted && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/mood-mentor-dashboard')}
                    disabled={sessionLoading}
                  >
                    Save and Exit
                  </Button>
                  <Button 
                    onClick={completeSession}
                    disabled={sessionLoading || appointment.status === 'completed'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Session
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 