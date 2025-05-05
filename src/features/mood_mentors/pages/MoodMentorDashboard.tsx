import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState, useRef } from "react";
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
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
// Supabase import removed
import { format, parseISO, subDays, getDaysInMonth, startOfMonth, getDay, addMonths } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
// Supabase import removed
// Supabase import removed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

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

interface MoodMentorProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string;
  avatar_url: string;
  specialties: string[];
  [key: string]: any;
}

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

export default function MoodMentorDashboard() {
  const { user, getFullName } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profileCompletionPercentage, setProfileCompletionPercentage] = useState(0);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [profile, setProfile] = useState<MoodMentorProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
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
  
  // Fetch calendar appointments
  useEffect(() => {
    const fetchCalendarAppointments = async () => {
      if (!user) return;
      
      setCalendarLoading(true);
      try {
        // Get the start and end of the current month
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
        
        // Fetch all appointments for the current month
        const { data, error } = await supabase
          .from('appointments')
          .select('date')
          .eq('mood_mentor_id', user.id)
          .gte('date', firstDay)
          .lte('date', lastDay);
          
        if (error) {
          console.error('Error fetching calendar data:', error);
          setAppointmentDates([]);
        } else if (data && data.length > 0) {
          // Extract the days with appointments
          const daysWithAppointments = data.map(apt => {
            const date = new Date(apt.date);
            return date.getDate(); // Get day of month (1-31)
          });
          
          setAppointmentDates(daysWithAppointments);
        } else {
          // No appointments this month
          setAppointmentDates([]);
        }
      } catch (error) {
        console.error('Error in calendar fetch:', error);
        setAppointmentDates([]);
      } finally {
        setCalendarLoading(false);
      }
    };
    
    fetchCalendarAppointments();
  }, [user, currentDate]);
  
  // Navigate to previous/next month
  const changeMonth = (increment: number) => {
    setCurrentDate(prevDate => addMonths(prevDate, increment));
  };
  
  // Helper function to determine if a day has appointments
  const hasDayAppointment = (day: number) => {
    return appointmentDates.includes(day);
  };
  
  // Fetch real appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('mood_mentor_id', user.id)
          .gt('date', new Date().toISOString()) // Only future appointments
          .order('date', { ascending: true })
          .limit(5);
          
        if (error) {
          console.error('Error fetching appointments:', error);
          toast.error('Failed to load your appointments');
          
          // Fallback to mock data if the query fails
          setAppointments(getMockAppointments());
        } else if (data && data.length > 0) {
          // Format the real data to match our appointment interface
          const formattedAppointments = data.map(apt => ({
            id: apt.id,
            patient_name: apt.patient_name || 'Unknown Patient',
            date: apt.date,
            time: format(new Date(apt.date), 'h:mm a'),
            type: apt.type || 'video',
            status: apt.status || 'upcoming'
          }));
          
          setAppointments(formattedAppointments);
        } else {
          // No appointments found, use mock data for now
          setAppointments(getMockAppointments());
        }
      } catch (error) {
        console.error('Error in appointment fetch:', error);
        setAppointments(getMockAppointments());
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user]);
  
  // Helper function for mock appointments (as fallback)
  const getMockAppointments = (): Appointment[] => {
    return [
      {
        id: '1',
        patient_name: 'Emma Thompson',
        date: '2023-06-15',
        time: '10:00 AM',
        type: 'video',
        status: 'upcoming'
      },
      {
        id: '2',
        patient_name: 'Michael Davis',
        date: '2023-06-16',
        time: '2:30 PM',
        type: 'in-person',
        status: 'upcoming'
      },
      {
        id: '3',
        patient_name: 'Sophia Rodriguez',
        date: '2023-06-18',
        time: '11:15 AM',
        type: 'chat',
        status: 'upcoming'
      }
    ];
  };
  
  // Check if user is new and show welcome dialog if needed
  useEffect(() => {
    checkUserStatus();
  }, [user]);
  
  // Function to check user's status and profile
  const checkUserStatus = async () => {
    if (!user) return;
    
    try {
      // Check if the user exists in mood_mentor_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching mood mentor profile:', profileError);
        return;
      }
      
      // If no profile exists or it's new, set isNewUser flag
      if (!profileData) {
        setIsNewUser(true);
        setShowWelcomeDialog(true);
      } else {
        setProfile(profileData);
        
        // Calculate profile completion percentage
        const completionPercentage = calculateProfileCompletion(profileData);
        setProfileCompletionPercentage(completionPercentage);
        
        // If profile is less than 50% complete, show welcome dialog
        if (completionPercentage < 50) {
          setShowWelcomeDialog(true);
        }
      }
      
      // Fetch dashboard stats and activities
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivities()
      ]);
      
    } catch (error) {
      console.error('Error in checking user status:', error);
    }
  };
  
  // Calculate profile completion percentage
  const calculateProfileCompletion = (profile: MoodMentorProfile) => {
    const requiredFields = [
      'full_name',
      'email',
      'bio',
      'specialties',
      'education',
      'experience',
      'phone_number',
      'address',
      'working_hours',
      'avatar_url'
    ];
    
    let completedFields = 0;
    
    requiredFields.forEach(field => {
      if (profile[field] && 
          // Check if array is not empty
          ((!Array.isArray(profile[field]) || profile[field].length > 0) &&
           // Check if string is not empty
           (typeof profile[field] !== 'string' || profile[field].trim() !== ''))) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / requiredFields.length) * 100);
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
  
  // Fetch stats for the dashboard
  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      // Use the mood mentor service to get all dashboard stats
      const dashboardStats = await moodMentorService.getDashboardStats(user.id);
      
      if (dashboardStats) {
        setStats([
          {
            title: "Total Patients",
            value: dashboardStats.totalPatients || 0,
            trend: "+5% from last month",
            icon: <Users className="h-5 w-5 text-blue-500" />
          },
          {
            title: "Upcoming Appointments",
            value: dashboardStats.upcomingAppointments || 0,
            icon: <Calendar className="h-5 w-5 text-purple-500" />
          },
          {
            title: "Support Groups",
            value: dashboardStats.supportGroups || 0,
            icon: <Users className="h-5 w-5 text-amber-500" />
          },
          {
            title: "Patient Satisfaction",
            value: `${dashboardStats.patientSatisfaction || 0}%`,
            trend: "+2% from last month",
            icon: <BarChart3 className="h-5 w-5 text-green-500" />
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Keep the default stats
    }
  };
  
  // Fetch recent activities
  const fetchRecentActivities = async () => {
    if (!user) return;
    
    setActivitiesLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        console.error('Error fetching activities:', error);
        // Use mock data as fallback
        setRecentActivities(getMockActivities());
      } else if (data && data.length > 0) {
        // Transform the data to our RecentActivity format
        const formattedActivities = data.map((item: DbActivity) => {
          let iconComponent;
          let iconBgClass = 'bg-gray-100';
          let iconColorClass = 'text-gray-600';
          
          // Determine icon and colors based on activity type
          switch (item.activity_type) {
            case 'appointment':
              iconComponent = <Calendar className="h-5 w-5" />;
              iconBgClass = 'bg-blue-100';
              iconColorClass = 'text-blue-600';
              break;
            case 'message':
              iconComponent = <MessageSquare className="h-5 w-5" />;
              iconBgClass = 'bg-green-100';
              iconColorClass = 'text-green-600';
              break;
            case 'group':
              iconComponent = <Users className="h-5 w-5" />;
              iconBgClass = 'bg-amber-100';
              iconColorClass = 'text-amber-600';
              break;
            case 'profile':
              iconComponent = <User className="h-5 w-5" />;
              iconBgClass = 'bg-purple-100';
              iconColorClass = 'text-purple-600';
              break;
            default:
              iconComponent = <Bell className="h-5 w-5" />;
          }
          
          return {
            id: item.id,
            title: item.title,
            time: formatActivityTime(item.created_at),
            icon: iconComponent,
            iconBgClass,
            iconColorClass
          };
        });
        
        setRecentActivities(formattedActivities);
      } else {
        // No activities found, use mock data
        setRecentActivities(getMockActivities());
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setRecentActivities(getMockActivities());
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
  
  // Generate mock activities for demo/fallback
  const getMockActivities = (): RecentActivity[] => {
    return [
      {
        id: '1',
        title: 'New appointment scheduled with Emma Thompson',
        time: '2 hours ago',
        icon: <Calendar className="h-5 w-5" />,
        iconBgClass: 'bg-blue-100',
        iconColorClass: 'text-blue-600'
      },
      {
        id: '2',
        title: 'Message received from Michael Davis',
        time: '4 hours ago',
        icon: <MessageSquare className="h-5 w-5" />,
        iconBgClass: 'bg-green-100',
        iconColorClass: 'text-green-600'
      },
      {
        id: '3',
        title: 'New group therapy session added',
        time: '1 day ago',
        icon: <Users className="h-5 w-5" />,
        iconBgClass: 'bg-amber-100',
        iconColorClass: 'text-amber-600'
      },
      {
        id: '4',
        title: 'Profile information updated',
        time: '2 days ago',
        icon: <User className="h-5 w-5" />,
        iconBgClass: 'bg-purple-100',
        iconColorClass: 'text-purple-600'
      },
      {
        id: '5',
        title: 'New review from Sophia Rodriguez',
        time: '3 days ago',
        icon: <MessageSquare className="h-5 w-5" />,
        iconBgClass: 'bg-pink-100',
        iconColorClass: 'text-pink-600'
      }
    ];
  };
  
  // Handle welcome dialog close
  const handleCloseWelcomeDialog = () => {
    setShowWelcomeDialog(false);
    
    // If profile is incomplete, redirect to profile page
    if (profileCompletionPercentage < 100) {
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
  
  // Get random positive message for the dashboard
  const getRandomPositiveMessage = () => {
    const messages = [
      "You're making a difference in your patients' lives today!",
      "Your expertise helps people find their emotional balance.",
      "Today is a great day to inspire positive change!",
      "Remember, your guidance matters more than you know.",
      "Your support creates ripples of wellness in many lives."
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  return (
    <DashboardLayout>
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
                Your profile is {profileCompletionPercentage}% complete. Completing your profile will help patients find and connect with you.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Profile completion</span>
                  <span>{profileCompletionPercentage}%</span>
                </div>
                <Progress value={profileCompletionPercentage} className="h-2" />
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
            {getTimeBasedGreeting()}, {getFullName()}
          </h1>
          <p className="text-gray-600">{getRandomPositiveMessage()}</p>
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
      </div>
    </DashboardLayout>
  );
} 


