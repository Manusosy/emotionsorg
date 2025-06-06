import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { appointmentService } from '@/services';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
} from 'lucide-react';

interface AppointmentDetailProps {
  appointmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AppointmentDetailDialog({ 
  appointmentId, 
  isOpen, 
  onClose 
}: AppointmentDetailProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  
  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [isOpen, appointmentId]);
  
  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch appointment details from the mentor_appointments_view
      const { data, error } = await supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('id', appointmentId)
        .single();
        
      if (error) {
        console.error('Error fetching appointment details:', error);
        toast.error('Failed to load appointment details');
        return;
      }
      
      setAppointment(data);
      
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
  
  const handleStartSession = async () => {
    try {
      toast.loading('Preparing session...');
      
      const result = await appointmentService.startAppointmentSession(appointmentId);
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      // Navigate to the session page
      navigate(`/mood-mentor-dashboard/session/${appointmentId}`);
      onClose();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to start session');
      console.error('Error starting session:', error);
    }
  };
  
  const handleMessagePatient = () => {
    if (appointment?.patient_id) {
      navigate(`/mood-mentor-dashboard/messages/${appointment.patient_id}`);
      onClose();
    }
  };
  
  const handleCompleteAppointment = async () => {
    try {
      toast.loading('Updating appointment...');
      
      const result = await appointmentService.completeAppointment(appointmentId);
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment marked as completed');
      fetchAppointmentDetails();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to update appointment');
      console.error('Error completing appointment:', error);
    }
  };
  
  const handleCancelAppointment = async () => {
    try {
      toast.loading('Cancelling appointment...');
      
      const result = await appointmentService.cancelAppointment(appointmentId, 'Cancelled by mentor');
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment cancelled');
      fetchAppointmentDetails();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to cancel appointment');
      console.error('Error cancelling appointment:', error);
    }
  };
  
  // Check if appointment is starting within 5 minutes
  const isStartingSoon = () => {
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
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Video className="mr-1 h-3 w-3" /> In Progress
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
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : appointment ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Appointment Details</span>
                {getStatusBadge()}
              </DialogTitle>
              <DialogDescription>
                View appointment information and options
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Date and time */}
              <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">
                    {format(parseISO(appointment.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
              </div>
              
              {/* Patient information */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Patient Information</h3>
                <div className="flex items-center space-x-3">
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
                    {(appointment.patient_email || patient?.email) && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-3.5 w-3.5 mr-1" />
                        {appointment.patient_email || patient?.email}
                      </div>
                    )}
                    {patient?.phone_number && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        {patient.phone_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Appointment details */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Appointment Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <span className="text-sm text-gray-600 ml-2">{appointment.meeting_type}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Title:</span>
                    <span className="text-sm text-gray-600 ml-2">{appointment.title}</span>
                  </div>
                  {appointment.description && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Description:</span>
                      <p className="text-sm text-gray-600 mt-1">{appointment.description}</p>
                    </div>
                  )}
                  {appointment.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notes:</span>
                      <p className="text-sm text-gray-600 mt-1">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
              <div className="flex space-x-2 mt-3 sm:mt-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMessagePatient}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                {appointment.status === 'scheduled' || appointment.status === 'pending' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={handleCancelAppointment}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                ) : null}
                {(appointment.status === 'scheduled') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompleteAppointment}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                className={`${
                  isStartingSoon() 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleStartSession}
                disabled={
                  !isStartingSoon() || 
                  appointment.status === 'cancelled' || 
                  appointment.status === 'completed'
                }
              >
                <Video className="h-4 w-4 mr-2" />
                {isStartingSoon() ? 'Start Session' : 'Session Unavailable'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-2" />
            <h3 className="text-sm font-medium text-gray-900">Appointment Not Found</h3>
            <p className="text-sm text-gray-500 mt-1">
              This appointment may have been deleted or is no longer available.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 