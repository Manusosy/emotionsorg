import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Phone, 
  MessageSquare, 
  Filter, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone as PhoneIcon,
  CalendarClock,
  Star,
  Calendar,
  Info,
  FilterIcon,
  X,
  CalendarPlus,
  RefreshCw,
  CheckCircle2,
  GraduationCap,
  UserRound,
  CalendarRange
} from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, addDays, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from '../../../types/database.types';
import { supabase } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

// Define the Appointment type
interface Appointment {
  id: string;
  date: string;
  time: string;
  type: 'video' | 'audio' | 'chat';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  concerns?: string;
  notes?: string;
  duration?: string;
}

// Define the MoodMentorProfile type
interface MoodMentorProfile {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  rating?: number;
  reviews?: number;
  available?: boolean;
  nextAvailable?: string;
  email?: string;
  phone?: string;
  bio?: string;
  education?: string;
}

// Define the AppointmentWithMentor type
interface AppointmentWithMentor extends Appointment {
  mentor?: {
    id: string;
    name: string;
    specialty: string;
    avatar: string;
    email: string;
    phone: string;
  }
}

// Define the DateFilter type
interface DateFilter {
  label: string;
  startDate: Date;
  endDate: Date;
}

// Mock data for mentors since the original data doesn't include complete info
const mentorProfiles = [
  {
    id: "ment-123",
    name: "Dr. Edalin",
    specialty: "Mental Health Support",
    avatar: "/assets/doctor-1.jpg",
    email: "edalin@example.com",
    phone: "+1 504 368 6874"
  },
  {
    id: "ment-456",
    name: "Dr. Shanta",
    specialty: "Anxiety & Depression",
    avatar: "/assets/doctor-2.jpg",
    email: "shanta@example.com",
    phone: "+1 832 891 8403"
  },
  {
    id: "ment-789",
    name: "Dr. John",
    specialty: "Trauma Recovery",
    avatar: "/assets/doctor-3.jpg",
    email: "john@example.com",
    phone: "+1 749 104 6291"
  }
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState<AppointmentWithMentor[]>([]);
  const [moodMentors, setMoodMentors] = useState<MoodMentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Debug mode counter
  const [titleClicks, setTitleClicks] = useState(0);
  const handleTitleClick = () => {
    const newCount = titleClicks + 1;
    setTitleClicks(newCount);
    
    // Enable debug mode after 5 clicks
    if (newCount === 5) {
      localStorage.setItem('debug_mode', 'true');
      toast.success('Debug mode enabled');
    }
  };
  
  // Update page title
  useEffect(() => {
    document.title = "My Appointments | Emotions Health";
  }, []);

  // Current date
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(addDays(today, 6));
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // Appointment counts
  const [counts, setCounts] = useState({
    upcoming: 0,
    cancelled: 0,
    completed: 0
  });

  // Date filter options
  const dateFilters: DateFilter[] = [
    {
      label: "Today",
      startDate: today,
      endDate: today
    },
    {
      label: "Yesterday",
      startDate: subDays(today, 1),
      endDate: subDays(today, 1)
    },
    {
      label: "Last 7 Days",
      startDate: subDays(today, 7),
      endDate: today
    },
    {
      label: "Last 30 Days",
      startDate: subDays(today, 30),
      endDate: today
    },
    {
      label: "This Month",
      startDate: startOfMonth(today),
      endDate: endOfMonth(today)
    },
    {
      label: "Last Month",
      startDate: startOfMonth(subMonths(today, 1)),
      endDate: endOfMonth(subMonths(today, 1))
    }
  ];

  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');

  const [loadingMoodMentors, setLoadingMoodMentors] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchMoodMentors();
  }, [user?.id, activeTab, startDate, endDate]);

  const fetchAppointments = async () => {
    try {
      if (!user) {
        console.log("No authenticated user found");
        navigate('/signin');
        return;
      }

      setLoading(true);
      
      // Get the patient profile first
      const { data: patientProfile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching patient profile:', profileError);
        toast.error('Error loading appointments');
        return;
      }

      // Fetch appointments with mentor details
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          mentor:mentor_id (
            id,
            full_name,
            email,
            title,
            specialty,
            profile_image_url
          )
        `)
        .eq('patient_id', patientProfile.id)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Error loading appointments');
        return;
      }

      // Transform the data to match the expected format
      const transformedAppointments = data.map(apt => ({
        id: apt.id,
        date: apt.appointment_date,
        time: apt.appointment_time,
        type: apt.appointment_type,
        status: apt.status,
        mentor: apt.mentor ? {
          id: apt.mentor.id,
          name: apt.mentor.full_name,
          specialty: apt.mentor.specialty || 'General Mental Health',
          avatar: apt.mentor.profile_image_url || '/assets/default-avatar.png',
          email: apt.mentor.email,
          phone: apt.mentor.phone || ''
        } : undefined,
        concerns: apt.concerns,
        notes: apt.notes
      }));

      // Update appointment counts
      const counts = {
        upcoming: data.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
        cancelled: data.filter(a => a.status === 'cancelled').length,
        completed: data.filter(a => a.status === 'completed').length
      };

      setAppointments(transformedAppointments);
      setCounts(counts);
    } catch (error) {
      console.error('Error in fetchAppointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMoodMentors = async () => {
    try {
      setLoadingMoodMentors(true);
      
      // Use mood mentor service to get available mentors
      const result = await supabase.from('mood_mentors').select().eq('availability_status', 'Available').limit(5);
      
      if (result.data && result.data.length > 0) {
        const mappedMentors: MoodMentorProfile[] = result.data.map(mentor => ({
          id: mentor.id,
          name: mentor.name || mentor.full_name || 'Mood Mentor',
          specialty: mentor.specialty || 'Mental Health Support',
          avatar: mentor.avatar_url || mentor.avatar || mentor.image || '/default-avatar.png',
          rating: mentor.rating || 4.7,
          reviews: mentor.reviews || mentor.totalRatings || 10,
          available: true,
          email: mentor.email || 'contact@emotionsapp.com',
          phone: mentor.phone_number || mentor.phone || '+250 788 123 456',
          bio: mentor.bio || mentor.about || 'Experienced mental health professional',
          education: typeof mentor.education === 'string' ? mentor.education : 
            (mentor.education && mentor.education[0]?.degree) ? 
            `${mentor.education[0].degree} from ${mentor.education[0].university}` : 
            'Mental Health Professional'
        }));
        
        setMoodMentors(mappedMentors);
      } else {
        // Fallback to mock data
        console.log("No mood mentors found, using mock data");
        const mockMentors: MoodMentorProfile[] = [
          {
            id: "mm-1",
            name: "Dr. Sarah Johnson",
            specialty: "Anxiety & Depression",
            avatar: "/assets/mentor-1.jpg",
            rating: 4.9,
            reviews: 127,
            available: true,
            email: "sarah.johnson@example.com",
            phone: "+1 (555) 123-4567",
            bio: "Specialized in anxiety and depression treatment with over 10 years of experience.",
            education: "PhD in Clinical Psychology, Stanford University"
          },
          {
            id: "mm-2",
            name: "Dr. Michael Chen",
            specialty: "Trauma Recovery",
            avatar: "/assets/mentor-2.jpg",
            rating: 4.8,
            reviews: 93,
            available: true,
            email: "michael.chen@example.com",
            phone: "+1 (555) 987-6543",
            bio: "Helping people overcome trauma and build resilience through evidence-based approaches.",
            education: "PsyD in Clinical Psychology, Columbia University"
          },
          {
            id: "mm-3",
            name: "Dr. Olivia Martinez",
            specialty: "Relationship Counseling",
            avatar: "/assets/mentor-3.jpg",
            rating: 4.7,
            reviews: 156,
            available: false,
            email: "olivia.martinez@example.com",
            phone: "+1 (555) 456-7890",
            bio: "Specializes in relationship counseling and interpersonal communication.",
            education: "PhD in Counseling Psychology, UCLA"
          }
        ];
        
        setMoodMentors(mockMentors);
      }
    } catch (error) {
      console.error("Error fetching mood mentors:", error);
    } finally {
      setLoadingMoodMentors(false);
    }
  };

  const getAppointmentIdCode = (id: string) => {
    return `#Apt${id.substring(0, 4)}`;
  };

  const handleApplyDateFilter = (filter: DateFilter) => {
    setStartDate(filter.startDate);
    setEndDate(filter.endDate);
    setDateFilterOpen(false);
  };

  const handleCustomDateRange = () => {
    // This would open a date range picker
    toast.info("Custom date range picker will be implemented soon");
    setDateFilterOpen(false);
  };

  const handleBookWithMentor = (mentorId: string) => {
    navigate(`/booking?mentor=${mentorId}`);
  };

  const handleViewMentorProfile = (mentorId: string) => {
    const mentor = moodMentors.find(a => a.id === mentorId);
    if (mentor) {
      const nameSlug = mentor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      navigate(`/mood-mentor/${nameSlug}?id=${mentorId}`);
    } else {
      navigate(`/mood-mentor?id=${mentorId}`);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled', 
          cancellation_reason: cancellationReason || 'Cancelled by patient' 
        })
        .eq('id', appointmentId)
        .select();
      
      if (error) {
        throw error;
      }

      toast.success("Appointment cancelled successfully");
      fetchAppointments(); // Refresh appointments after cancellation
    } catch (error) {
      toast.error("An error occurred while cancelling the appointment");
      console.error("Error:", error);
    } finally {
      setCancelAppointmentId(null);
      setCancellationReason(''); // Reset the reason
    }
  };

  // Replace the renderAppointmentList function with a more modern design
  const renderAppointmentList = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6 py-16">
          <div className="flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-blue-600" />
            <p className="text-gray-500 mt-4">Loading your appointments...</p>
          </div>
        </div>
      );
    }

    if (appointments.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 rounded-full p-5 mb-6">
              <CalendarClock className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-medium mb-3">No {activeTab} appointments</h3>
            <p className="text-gray-500 mb-8 max-w-md">
              {activeTab === "upcoming" 
                ? "You don't have any upcoming appointments scheduled. Book an appointment with one of our mentors to get started with your mental health journey."
                : activeTab === "cancelled" 
                ? "You don't have any cancelled appointments. All your cancelled appointments will appear here for reference."
                : "You don't have any completed appointments yet. After completing sessions, they will appear here for your records."}
            </p>
            <Button 
              onClick={() => navigate("/booking")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-medium"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {appointments.map((appointment) => (
          <div 
            key={appointment.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md"
          >
            <div className={cn(
              "border-l-4 h-full", 
              activeTab === "upcoming" ? "border-blue-600" : 
              activeTab === "completed" ? "border-green-600" : "border-orange-600"
            )}>
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Left section: Mentor info */}
                  <div className="flex gap-4 items-center">
                    <Avatar className="h-16 w-16 rounded-full border-2 border-blue-100">
                      <AvatarImage src={appointment.mentor?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                        {appointment.mentor?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          className={cn(
                            "font-normal rounded-full text-xs",
                            activeTab === "upcoming" ? "bg-blue-50 text-blue-700" : 
                            activeTab === "completed" ? "bg-green-50 text-green-700" : 
                            "bg-orange-50 text-orange-700"
                          )}
                        >
                          {getAppointmentIdCode(appointment.id)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {appointment.mentor?.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">{appointment.mentor?.specialty}</p>
                    </div>
                  </div>

                  {/* Right section: Appointment details */}
                  <div className="flex flex-col sm:flex-row gap-5 mt-4 md:mt-0 md:ml-auto">
                    {/* Date and time */}
                    <div className="flex flex-col">
                      <p className="text-xs uppercase text-gray-500 font-medium mb-1">Date & Time</p>
                      <div className="flex items-center text-gray-800 font-medium">
                        <CalendarIcon className="h-4 w-4 text-blue-500 mr-2" />
                        <p>{format(new Date(appointment.date), "dd MMM yyyy")}</p>
                      </div>
                      <div className="flex items-center text-gray-800 mt-1">
                        <Clock className="h-4 w-4 text-blue-500 mr-2" />
                        <p>{appointment.time}</p>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex flex-col sm:ml-6">
                      <p className="text-xs uppercase text-gray-500 font-medium mb-1">Session Type</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-normal py-1">
                          {appointment.type === "video" ? (
                            <div className="flex items-center">
                              <Video className="h-3 w-3 mr-1.5" />
                              <span>Video Call</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1.5" />
                              <span>Audio Call</span>
                            </div>
                          )}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-gray-600 font-normal">
                          {appointment.duration || "30 min"}
                        </Badge>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex flex-col sm:ml-6">
                      <p className="text-xs uppercase text-gray-500 font-medium mb-1">Contact</p>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <p className="text-sm">{appointment.mentor?.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <PhoneIcon className="h-4 w-4 text-blue-500" />
                        <p className="text-sm">{appointment.mentor?.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
                  {activeTab === "upcoming" && (
                    <>
                      <Button 
                        variant="outline"
                        className="rounded-full"
                        onClick={() => navigate(`/messages/${appointment.mentor?.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat Now
                      </Button>
                      <Button 
                        variant="outline"
                        className="rounded-full text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => setCancelAppointmentId(appointment.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 rounded-full"
                        onClick={() => navigate(`/session/${appointment.id}`)}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Attend Session
                      </Button>
                    </>
                  )}
                  {activeTab === "cancelled" && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 rounded-full"
                      onClick={() => navigate("/booking")}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>
                  )}
                  {activeTab === "completed" && (
                    <>
                      <Button 
                        variant="outline"
                        className="rounded-full"
                        onClick={() => navigate(`/feedback/${appointment.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Leave Feedback
                      </Button>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 rounded-full"
                        onClick={() => navigate(`/booking?mentor=${appointment.mentor?.id}`)}
                      >
                        <CalendarPlus className="h-4 h-4 mr-2" />
                        Book Again
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add a button to book new appointments */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => navigate("/booking")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-medium"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Book New Appointment
          </Button>
        </div>
      </div>
    );
  };

  // Helper to render badge based on count
  const renderCountBadge = (count: number) => {
    if (count === 0) return null;
    return <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-white">{count}</Badge>;
  };

  const renderMoodMentorProfiles = () => {
    if (loadingMoodMentors) {
      return (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (moodMentors.length === 0) {
      return (
        <div className="text-center p-8">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No mood mentors</h3>
          <p className="mt-1 text-sm text-gray-500">
            No mood mentors are available at the moment.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {moodMentors.map((mentor) => (
          <Card 
            key={mentor.id}
            className={`overflow-hidden hover:shadow-md transition-shadow ${
              !mentor.available ? 'opacity-70' : ''
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={mentor.avatar} alt={mentor.name} />
                  <AvatarFallback>{mentor.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{mentor.name}</h3>
                      <p className="text-sm text-gray-500">{mentor.specialty}</p>
                    </div>
                    
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium ml-1">{mentor.rating}</span>
                      <span className="text-xs text-gray-500 ml-1">({mentor.reviews})</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-sm flex items-center space-x-1">
                      <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 truncate">{mentor.education}</span>
                    </div>
                    
                    <div className="mt-1 text-sm flex items-center space-x-1">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 truncate">{mentor.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleViewMentorProfile(mentor.id)}
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
                
                <Button
                  className="w-full justify-start"
                  onClick={() => handleBookWithMentor(mentor.id)}
                  disabled={!mentor.available}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {mentor.available ? 'Book Session' : 'Currently Unavailable'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <AlertDialog open={!!cancelAppointmentId} onOpenChange={(open) => {
        if (!open) {
          setCancelAppointmentId(null);
          setCancellationReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for cancellation (optional)
            </label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please provide a reason for cancelling this appointment"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => cancelAppointmentId && handleCancelAppointment(cancelAppointmentId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 
              className="text-2xl font-bold text-gray-900 cursor-default" 
              onClick={handleTitleClick}
            >
              My Appointments
            </h1>
            <p className="text-slate-500 mt-1">
              Manage your appointments with mental health mentors
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            onClick={() => navigate("/booking")}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
        </div>

        {/* Status tabs and Filter section */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 pb-4">
          {/* Left side: Status tabs */}
          <div className="flex items-center space-x-4 overflow-x-auto pb-1">
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "upcoming" 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("upcoming")}
            >
              <CalendarClock className="h-4 w-4" />
              <span>Upcoming</span>
              {counts.upcoming > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.upcoming}
                </span>
              )}
            </button>
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "completed" 
                  ? "bg-green-50 text-green-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("completed")}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed</span>
              {counts.completed > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-green-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.completed}
                </span>
              )}
            </button>
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "cancelled" 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("cancelled")}
            >
              <X className="h-4 w-4" />
              <span>Cancelled</span>
              {counts.cancelled > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-orange-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.cancelled}
                </span>
              )}
            </button>
          </div>

          {/* Right side: Date picker styled like calendar */}
          <div className="mt-4 sm:mt-0">
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border rounded-lg bg-white shadow-sm"
                >
                  <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="whitespace-nowrap">
                    {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto min-w-[240px]" align="end">
                <div className="bg-white rounded-md shadow-md overflow-hidden">
                  {dateFilters.map((filter, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                      onClick={() => handleApplyDateFilter(filter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <hr className="border-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                    onClick={handleCustomDateRange}
                  >
                    Custom Range
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Main content - full width without mentor sidebar */}
        <div className="w-full">
          {/* Appointments section */}
          <div className="mb-10">
            {renderAppointmentList()}
          </div>
          
          {/* Mentor profiles section */}
          <div>
            {renderMoodMentorProfiles()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}



