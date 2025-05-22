import { authService, userService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Search, 
  BarChart3, 
  MessageSquare, 
  Bell, 
  ChevronRight,
  User,
  Clock,
  Video,
  Check,
  AlertCircle,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  BookOpen
} from "lucide-react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { AuthContext } from "@/contexts/authContext";
import { format, parseISO, subDays, getDaysInMonth, startOfMonth, getDay, addMonths } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { MoodMentorProfile } from "@/types/user";

// Add interface for dashboard Activities since we don't have a real activity service
interface Activity {
  id: string;
  activity_type: 'message' | 'appointment' | 'group' | 'profile' | 'other';
  title: string;
  created_at: string;
}

// Define the structure for statistics cards
interface StatCard {
  title: string;
  value: number | string;
  trend?: string;
  icon: React.ReactNode;
}

// Define appointment interface
interface Appointment {
  id: string;
  patient_name: string;
  date: string;
  time: string;
  type: 'video' | 'in-person' | 'chat';
  status: 'upcoming' | 'canceled' | 'completed';
}

// Note: We now use the imported MoodMentorProfile interface from @/types/user

// Define interface for recent activities
interface RecentActivity {
  id: string;
  title: string;
  time: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
}

// Interface for activity data from database
interface DbActivity {
  id: string;
  user_id: string;
  activity_type: 'message' | 'appointment' | 'group' | 'profile' | 'other';
  title: string;
  description?: string;
  created_at: string;
  metadata?: any;
}

// Define a local profile interface to match the component's needs
// This is separate from the database MoodMentorProfile
interface DashboardProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  specialties: string[];
  isProfileComplete: boolean;
  [key: string]: any;
}

export default function MoodMentorDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Initial stat cards with zero values - will be populated from database
  const [stats, setStats] = useState<StatCard[]>([
    {
      title: "Total Patients",
      value: 0,
      trend: "",
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    {
      title: "Upcoming Appointments",
      value: 0,
      icon: <Calendar className="h-5 w-5 text-purple-500" />
    },
    {
      title: "Support Groups",
      value: 0,
      icon: <Users className="h-5 w-5 text-amber-500" />
    },
    {
      title: "Patient Satisfaction",
      value: "0%",
      trend: "",
      icon: <BarChart3 className="h-5 w-5 text-green-500" />
    }
  ]);

  // Recent activities data - start with empty state
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointmentDates, setAppointmentDates] = useState<number[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  
  // Get calendar data
  const currentMonthName = format(currentDate, "MMMM yyyy");
  const daysInMonth = getDaysInMonth(currentDate);
  const startDay = getDay(startOfMonth(currentDate));
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Fetch calendar appointments using Supabase
  useEffect(() => {
    const fetchCalendarAppointments = async () => {
      if (!user) {
        console.log("No authenticated user found, redirecting to login");
        navigate('/mentor-signin');
        return;
      }

      setCalendarLoading(true);
      try {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Use try-catch to handle potential 404 errors
        try {
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('mentor_id', user.id)
            .gte('start_time', firstDay.toISOString())
            .lte('start_time', lastDay.toISOString())
            .neq('status', 'cancelled');
            
          if (error) {
            console.warn('Error fetching calendar appointments:', error);
            setAppointmentDates([]);
            return;
          }
          
          if (!appointments || appointments.length === 0) {
            setAppointmentDates([]);
          } else {
            const daysWithAppointments = appointments.map(apt => {
              const date = new Date(apt.start_time);
              return date.getDate();
            });
            
            setAppointmentDates(daysWithAppointments);
          }
        } catch (supabaseError) {
          console.warn('Supabase error (possibly 404):', supabaseError);
          // Gracefully handle missing tables
          setAppointmentDates([]);
          
          // Show a helpful message only once
          if (!localStorage.getItem('showed_db_missing_warning')) {
            toast.warning('Some database tables are not set up yet.');
            localStorage.setItem('showed_db_missing_warning', 'true');
          }
        }
      } catch (error) {
        console.error('Error in calendar fetch:', error);
        toast.error('Failed to load calendar appointments');
        setAppointmentDates([]);
      } finally {
        setCalendarLoading(false);
      }
    };
    
    fetchCalendarAppointments();
  }, [user, navigate, currentDate]);
  
  // Navigate to previous/next month
  const changeMonth = (increment: number) => {
    setCurrentDate(prevDate => addMonths(prevDate, increment));
  };
  
  // Helper function to determine if a day has appointments
  const hasDayAppointment = (day: number) => {
    return appointmentDates.includes(day);
  };
  
  // Fetch appointments using the appointment service
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) {
        console.log("No authenticated user found, redirecting to login");
        navigate('/mentor-signin');
        return;
      }
      
      setIsLoading(true);
      try {
        try {
          // Use appointmentService with correct method name
          const response = await appointmentService.getMoodMentorAppointments(
            user.id,
            { 
              status: 'scheduled',
              limit: 5
            }
          );
            
          if (!response || response.length === 0) {
            // No appointments found, return empty array
            setAppointments([]);
          } else {
            // Format the real data to match our appointment interface
            const formattedAppointments = response.map(apt => ({
              id: apt.id,
              patient_name: apt.title || 'Appointment', // Using title as patient name
              date: apt.date,
              time: apt.startTime,
              type: 'video' as 'video' | 'in-person' | 'chat', // Type assertion to match the interface
              status: apt.status === 'scheduled' ? 'upcoming' as const : 'completed' as const
            }));
            
            setAppointments(formattedAppointments);
          }
        } catch (serviceError) {
          console.warn('Error calling appointment service:', serviceError);
          setAppointments([]);
          
          // Show a helpful message only once for this specific error
          if (!localStorage.getItem('showed_appointment_missing_warning')) {
            toast.warning('Appointment data may be unavailable until the database is set up.');
            localStorage.setItem('showed_appointment_missing_warning', 'true');
          }
        }
      } catch (error) {
        console.error('Error in appointment fetch:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user, navigate]);
  
  // Check if user is new and show welcome dialog if needed
  useEffect(() => {
    checkUserStatus();
  }, [user]);
  
  // Function to check user's status and profile using the user service
  const checkUserStatus = async () => {
    if (!user) return;
    
    try {
      const response = await moodMentorService.getMoodMentorById(user.id);
      
      if (response.success && response.data) {
        // Data is already in camelCase thanks to our service updates
        const profileData = response.data;
        
        // Set profile data
        setProfile({
          id: profileData.id,
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatarUrl || '',
          specialties: profileData.specialties || [],
          isProfileComplete: profileData.isProfileComplete || false
        });
        
        // Check if profile is complete
        setIsProfileComplete(!!profileData.isProfileComplete);
        
        // If profile is not complete, show the welcome dialog
        if (!profileData.isProfileComplete) {
          setIsNewUser(true);
          setShowWelcomeDialog(true);
        }
      } else {
        // No profile found, create a basic one
        setProfile({
          id: user.id,
          fullName: user.user_metadata?.name || '',
          email: user.email || '',
          bio: '',
          avatarUrl: user.user_metadata?.avatar_url || '',
          specialties: [],
          isProfileComplete: false
        });
        
        setIsNewUser(true);
        setShowWelcomeDialog(true);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      toast.error('Error loading profile data');
    }
  };
  
  // Helper function to get appointment type badge
  const getAppointmentBadge = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Video className="mr-1 h-3 w-3" /> Video
          </Badge>
        );
      case 'in-person':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <User className="mr-1 h-3 w-3" /> In-person
          </Badge>
        );
      case 'chat':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <MessageSquare className="mr-1 h-3 w-3" /> Chat
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" /> Other
          </Badge>
        );
    }
  };
  
  // Fetch stats for the dashboard using the mood mentor service
  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      // Get total active patients
      const { data: patients, error: patientsError } = await supabase
        .from('appointments')
        .select('patient_id', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .gte('start_time', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .neq('status', 'cancelled');
      
      if (patientsError) throw patientsError;

      // Get upcoming appointments count
      const { data: upcomingApts, error: aptsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled');
        
      if (aptsError) throw aptsError;

      // Get active support groups count
      const { data: groups, error: groupsError } = await supabase
        .from('mentor_groups')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .eq('status', 'active');
        
      if (groupsError) throw groupsError;

      // Get average rating
      const { data: ratings, error: ratingsError } = await supabase
        .from('mentor_reviews')
        .select('rating')
        .eq('mentor_id', user.id);
      
      if (ratingsError) throw ratingsError;

      const averageRating = ratings && ratings.length > 0
        ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
        : 0;

      // Update stats
        setStats([
          {
            title: "Total Patients",
          value: patients?.count || 0,
            icon: <Users className="h-5 w-5 text-blue-500" />
          },
          {
            title: "Upcoming Appointments",
          value: upcomingApts?.count || 0,
            icon: <Calendar className="h-5 w-5 text-purple-500" />
          },
          {
            title: "Support Groups",
          value: groups?.count || 0,
            icon: <Users className="h-5 w-5 text-amber-500" />
          },
          {
            title: "Patient Satisfaction",
          value: `${averageRating}/5`,
            icon: <BarChart3 className="h-5 w-5 text-green-500" />
          }
        ]);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };
  
  // Fetch recent activities by mocking the function (no real activity service)
  const fetchRecentActivities = async () => {
    if (!user) return;
    
    setActivitiesLoading(true);
    try {
      // Get recent appointments
      const { data: recentAppointments, error: apptsError } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          patient:patient_id (
            name
          )
        `)
        .eq('mentor_id', user.id)
        .order('start_time', { ascending: false })
        .limit(5);
      
      if (apptsError) throw apptsError;

      // Get recent messages
      const { data: recentMessages, error: msgsError } = await supabase
        .from('messages')
        .select(`
          id,
          created_at,
          sender:sender_id (
            name
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (msgsError) throw msgsError;

      // Get recent group activities
      const { data: recentGroupActivities, error: groupsError } = await supabase
        .from('group_participants')
        .select(`
          group_id,
          joined_at,
          patient:patient_id (
            name
          ),
          group:group_id (
            name
          )
        `)
        .eq('group:mentor_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5);
      
      if (groupsError) throw groupsError;
          
      // Combine and sort all activities
      const allActivities = [
        ...(recentAppointments?.map(apt => ({
          id: apt.id,
          title: `Appointment with ${apt.patient.name}`,
          time: apt.start_time,
          icon: <Calendar className="h-4 w-4" />,
          iconBgClass: 'bg-blue-100',
          iconColorClass: 'text-blue-600'
        })) || []),
        ...(recentMessages?.map(msg => ({
          id: msg.id,
          title: `New message from ${msg.sender.name}`,
          time: msg.created_at,
          icon: <MessageSquare className="h-4 w-4" />,
          iconBgClass: 'bg-purple-100',
          iconColorClass: 'text-purple-600'
        })) || []),
        ...(recentGroupActivities?.map(activity => ({
          id: `${activity.group_id}-${activity.patient.id}`,
          title: `${activity.patient.name} joined ${activity.group.name}`,
          time: activity.joined_at,
          icon: <Users className="h-4 w-4" />,
          iconBgClass: 'bg-amber-100',
          iconColorClass: 'text-amber-600'
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
       .slice(0, 10);

      setRecentActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast.error('Failed to load recent activities');
    } finally {
      setActivitiesLoading(false);
    }
  };
  
  // Format the activity time in a user-friendly way
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 60) {
      return `${diffMin} min ago`;
    } else if (diffMin < 1440) {
      const hours = Math.floor(diffMin / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };
  
  // Handle welcome dialog close
  const handleCloseWelcomeDialog = () => {
    setShowWelcomeDialog(false);
    
    // If profile is incomplete, redirect to profile page
    if (!isProfileComplete) {
      navigate('/mood-mentor-dashboard/profile');
    }
  };
  
  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };
  
  // Get random positive message for the dashboard based on time of day
  const getMotivationalMessage = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      const morningMessages = [
        "A fresh start to positively impact your patients today.",
        "Begin your day by making a difference in someone's emotional wellbeing.",
        "Morning energy to guide others toward emotional balance.",
        "Early bird catches the opportunity to help others heal."
      ];
      return morningMessages[Math.floor(Math.random() * morningMessages.length)];
    } else if (hour < 18) {
      const afternoonMessages = [
        "Your guidance continues to create positive change this afternoon.",
        "Keep up the great work supporting your patients' journey.",
        "Your afternoon sessions help build emotional resilience.",
        "Your expertise is making a meaningful difference today."
      ];
      return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
    } else {
      const eveningMessages = [
        "Reflect on the positive impact you've made today.",
        "Your evening dedication helps patients find peace.",
        "Winding down after a day of meaningful connections.",
        "Your compassion has brightened someone's day."
      ];
      return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
    }
  };

  // Replace calculateProfileCompletion with a simple profile status component
  const ProfileStatusCard = () => {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 pb-2">
          <CardTitle className="text-lg">Profile Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isProfileComplete ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Your profile is complete</span>
              </div>
              <p className="text-sm text-gray-600">
                You can now be found by patients looking for mentors like you.
              </p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => navigate('/mood-mentor-dashboard/profile')}
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Your profile is incomplete</span>
              </div>
              <p className="text-sm text-gray-600">
                Complete your profile to be visible to patients looking for mood mentors.
              </p>
              <Button 
                className="mt-2"
                onClick={() => navigate('/mood-mentor-dashboard/profile')}
              >
                Complete Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout
      title={getTimeBasedGreeting()}
      subtitle={getMotivationalMessage()}
      userType="mentor"
    >
      {/* Welcome Dialog for new users */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Your Dashboard</DialogTitle>
            <DialogDescription>
              This is your professional workspace for managing patients, appointments, and resources.
            </DialogDescription>
          </DialogHeader>
          
          {isNewUser ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                To get started, please complete your profile information so patients can find you.
              </p>
              
              <div className="flex items-center p-3 bg-amber-50 text-amber-800 rounded-lg">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Your profile is not yet visible to patients until you complete the required information.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Your profile is {isProfileComplete ? 'complete' : 'incomplete'}. Completing your profile will help patients find and connect with you.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Profile completion</span>
                  <span>{isProfileComplete ? 'Complete' : 'Incomplete'}</span>
                </div>
                <Progress value={isProfileComplete ? 100 : 0} className="h-2" />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWelcomeDialog(false)}>
              Later
            </Button>
            <Button onClick={handleCloseWelcomeDialog}>
              Complete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dashboard Content */}
      <div className="space-y-6">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {getTimeBasedGreeting()}, {user?.fullName?.split(' ')[0]}
          </h1>
          <p className="text-gray-600">{getMotivationalMessage()}</p>
        </section>
        
        {/* Stats Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                      {stat.trend && (
                        <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
                      )}
                    </div>
                    <div className="p-2 rounded-full bg-gray-100">
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointments Section */}
          <section className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your schedule for the next few days</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/mood-mentor-dashboard/appointments')}
                >
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center p-3 rounded-lg border border-gray-100 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-4"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                        </div>
                        <div className="h-6 bg-gray-100 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <Avatar className="h-10 w-10 mr-4">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {appointment.patient_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {appointment.patient_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(appointment.date), 'MMM d')} • {appointment.time}
                          </p>
                        </div>
                        {getAppointmentBadge(appointment.type)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                    <h3 className="text-sm font-medium text-gray-900">No upcoming appointments</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your schedule is clear for now
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate('/mood-mentor-dashboard/availability')}
                    >
                      Manage Availability
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          
          {/* Calendar Section */}
          <section>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Your appointment schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => changeMonth(-1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-sm font-medium">{currentMonthName}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => changeMonth(1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {/* Day headers */}
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div
                        key={day}
                        className="h-8 text-xs font-medium text-gray-500 flex items-center justify-center"
                      >
                        {day}
                      </div>
                    ))}
                    
                    {/* Empty cells for previous month */}
                    {Array.from({ length: startDay }).map((_, index) => (
                      <div key={`empty-start-${index}`} className="h-8" />
                    ))}
                    
                    {/* Calendar days */}
                    {calendarDays.map((day) => (
                      <div
                        key={`day-${day}`}
                        className="relative h-8 flex items-center justify-center"
                      >
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs
                            ${hasDayAppointment(day) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-900'}
                          `}
                        >
                          {day}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center text-xs text-gray-500 pt-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100 mr-1"></div>
                    <span>Has appointments</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/mood-mentor-dashboard/appointments')}
                >
                  View Full Schedule
                </Button>
              </CardFooter>
            </Card>
          </section>
        </div>
        
        {/* Recent Activity Section */}
        <section>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-200 mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className={`w-8 h-8 rounded-full ${activity.iconBgClass} ${activity.iconColorClass} flex items-center justify-center mr-4 flex-shrink-0`}>
                        {activity.icon}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bell className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <h3 className="text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your activity feed will show up here
                  </p>
                </div>
              )}
            </CardContent>
            {recentActivities.length > 0 && (
              <CardFooter>
                <Button 
                  variant="ghost" 
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  View All Activity
                </Button>
              </CardFooter>
            )}
          </Card>
        </section>
        
        {/* Quick Actions Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center justify-center"
              onClick={() => navigate('/mood-mentor-dashboard/profile')}
            >
              <User className="h-6 w-6 mb-2 text-blue-600" />
              <span>Update Profile</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center justify-center"
              onClick={() => navigate('/mood-mentor-dashboard/resources')}
            >
              <BookOpen className="h-6 w-6 mb-2 text-purple-600" />
              <span>Manage Resources</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center justify-center"
              onClick={() => navigate('/mood-mentor-dashboard/messages')}
            >
              <MessageSquare className="h-6 w-6 mb-2 text-green-600" />
              <span>Check Messages</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center justify-center"
              onClick={() => navigate('/mood-mentor-dashboard/availability')}
            >
              <Calendar className="h-6 w-6 mb-2 text-amber-600" />
              <span>Set Availability</span>
            </Button>
          </div>
        </section>
        
        {/* Profile status card */}
        <ProfileStatusCard />
      </div>
    </DashboardLayout>
  );
} 


