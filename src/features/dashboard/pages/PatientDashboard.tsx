import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { Loader2 } from "lucide-react";
import { 
  Calendar, 
  MessageSquare, 
  Phone, 
  Book, 
  Settings, 
  LogOut,
  User,
  Clock,
  Video,
  UserPlus,
  Users,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  BadgeHelp,
  LineChart,
  Heart,
  ExternalLink,
  BookOpen,
  FileText,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart,
  HeartPulse,
  Download,
  HeartHandshake
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthContext } from "@/contexts/authContext";
import MoodAnalytics from "../components/MoodAnalytics";
import MoodSummaryCard from "../components/MoodSummaryCard";
import EmotionalHealthWheel from "../components/EmotionalHealthWheel";
import { Appointment as DbAppointment, Message, UserProfile } from "../../../types/database.types";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { WelcomeDialog } from "@/components/WelcomeDialog";
import NotificationManager from '../components/NotificationManager';
import StressAssessmentModal from "../components/StressAssessmentModal";
import { PostgrestSingleResponse } from '@supabase/supabase-js';

// Define interfaces for appointment data
interface MoodMentor {
  id: string;
  name: string;
  specialization: string;
  avatar_url?: string;
}

interface AppointmentWithMentor extends DbAppointment {
  mood_mentor?: MoodMentor;
  time?: string;
  type?: string;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithMentor[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithMentor[]>([]);
  const [supportGroups, setSupportGroups] = useState<any[]>([]);
  const [recentJournalEntries, setRecentJournalEntries] = useState<any[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<string>("all");
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [lastCheckInDate, setLastCheckInDate] = useState<string>("");
  const [lastAssessmentDate, setLastAssessmentDate] = useState<string>("");
  const [userMetrics, setUserMetrics] = useState({
    moodScore: 0,
    stressLevel: 0,
    consistency: 0,
    lastCheckInStatus: "No check-ins yet",
    streak: 0,
    firstCheckInDate: ""
  });
  const [hasAssessments, setHasAssessments] = useState(false);
  const [appointmentReports, setAppointmentReports] = useState<AppointmentWithMentor[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);
  const [isStressModalOpen, setIsStressModalOpen] = useState(false);
  // Extract user's first name for display
  const firstName = user?.user_metadata?.first_name || 
                    user?.user_metadata?.name?.split(' ')[0] || 
                    user?.email?.split('@')[0] || 
                    'User';

  // Add code to skip any loading states
  const skipLoadingStates = () => {
    setReportsLoading(false);
  };

  useEffect(() => {
    skipLoadingStates();
    let isMounted = true;
    
    // Initialize with empty values - we'll only set real values if we have data
    setLastCheckIn("");
    setLastCheckInDate("Not available");
    setLastAssessmentDate("Not taken");
    setHasAssessments(false);

    const fetchDashboardData = async () => {
      try {
        console.log('PatientDashboard: Fetching dashboard data...');
        
        if (!user) {
          console.log("No authenticated user found, redirecting to login");
          navigate('/patient-signin');
          return;
        }
        
        console.log("Fetching dashboard data for user:", user.id);

        // Create profile from user metadata
        const userProfileData: UserProfile = {
          id: user?.id || '',
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          email: user?.email || '',
          phone_number: user?.user_metadata?.phone_number || '',
          country: user?.user_metadata?.country || '',
          address: user?.user_metadata?.address || '',
          city: user?.user_metadata?.city || '',
          state: user?.user_metadata?.state || '',
          pincode: user?.user_metadata?.pincode || '',
          avatar_url: user?.user_metadata?.avatar_url || '',
          created_at: new Date().toISOString(),
          name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
          role: user?.user_metadata?.role || 'patient',
          updated_at: new Date().toISOString()
        };

        if (isMounted) {
          setProfile(userProfileData);
        }

        // Fetch most critical data in parallel - mood entries and appointments
        const criticalDataPromises = [
          // Fetch mood entries (critical)
          supabase
            .from('mood_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10), // Limit to 10 most recent entries for faster load
            
          // Fetch appointments (critical)
          fetchAppointments(user.id)
        ];
        
        // Execute critical data fetch in parallel
        const [moodEntriesResult, appointmentsResult] = await Promise.all(criticalDataPromises);
        
        // Process mood entries
        const { data: moodEntriesData, error: moodError } = moodEntriesResult;
        if (moodError) {
          console.error("Error fetching mood entries:", moodError);
        } else if (moodEntriesData && moodEntriesData.length > 0) {
          // User has mood entries
          setHasAssessments(true);
          
          // Calculate average mood score
          const moodValues = moodEntriesData.map(entry => Number(entry.mood));
          const avgMood = moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length;
          
          // Update user metrics
          setUserMetrics(prev => ({
            ...prev,
            moodScore: parseFloat(avgMood.toFixed(1)),
            lastCheckInStatus: "Completed",
            firstCheckInDate: format(parseISO(moodEntriesData[moodEntriesData.length - 1].created_at), 'MMM d, yyyy')
          }));
          
          // Set last assessment date
          if (moodEntriesData[0]) {
            setLastAssessmentDate(format(parseISO(moodEntriesData[0].created_at), 'MMM d, yyyy'));
            setLastCheckIn(format(parseISO(moodEntriesData[0].created_at), 'h:mm a'));
            setLastCheckInDate(format(parseISO(moodEntriesData[0].created_at), 'MMM d, yyyy'));
          }
          
          // Calculate streak
          const dates = moodEntriesData.map(entry => new Date(entry.created_at));
          setCheckInDates(dates);
          
          if (dates.length > 0) {
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const hasCheckInToday = dates.some(date => {
              const checkInDate = new Date(date);
              checkInDate.setHours(0, 0, 0, 0);
              return checkInDate.getTime() === today.getTime();
            });
            
            if (hasCheckInToday) {
              streak = 1;
              
              let currentDate = new Date(today);
              currentDate.setDate(currentDate.getDate() - 1);
              
              let streakContinues = true;
              while (streakContinues) {
                const hasCheckIn = dates.some(date => {
                  const checkInDate = new Date(date);
                  checkInDate.setHours(0, 0, 0, 0);
                  return checkInDate.getTime() === currentDate.getTime();
                });
                
                if (hasCheckIn) {
                  streak++;
                  currentDate.setDate(currentDate.getDate() - 1);
                } else {
                  streakContinues = false;
                }
              }
              
              // Update user metrics with streak
              setUserMetrics(prev => ({
                ...prev,
                streak: streak
              }));
            }
          }
        }
        
        // Process appointments
        if (appointmentsResult?.error) {
          console.error("Error fetching appointments:", appointmentsResult.error);
          setAppointments([]);
          setUpcomingAppointments([]);
        } else {
          if (isMounted) {
            setAppointments(appointmentsResult?.data || []);
            
            // Filter for upcoming appointments
            const upcoming = appointmentsResult?.data?.filter(
              (apt: any) => apt.status.toLowerCase() === 'upcoming' || apt.status.toLowerCase() === 'scheduled'
            ) || [];
            setUpcomingAppointments(upcoming);
          }
        }
        
        // Load non-critical data in parallel after critical data is processed
        // This allows the UI to be responsive while less important data loads
        Promise.all([
          // Fetch messages (non-critical)
          fetchMessages(user.id),
          
          // Fetch journal entries (non-critical)
          supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
            
          // Fetch stress assessments (non-critical)
          supabase
            .from('stress_assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
        ]).then(([messagesResult, journalResult, stressResult]) => {
          // Process messages
          if (messagesResult?.error) {
            console.error("Error fetching messages:", messagesResult.error);
          } else {
            setMessages(messagesResult?.data || []);
          }
          
          // Process journal entries
          if (journalResult.error) {
            console.error("Error fetching journal entries:", journalResult.error);
          } else {
            setRecentJournalEntries(journalResult.data || []);
          }
          
          // Process stress assessments
          if (stressResult.error) {
            console.error("Error fetching stress assessments:", stressResult.error);
          } else if (stressResult.data && stressResult.data.length > 0) {
            // User has stress assessments
            setHasAssessments(true);
            
            // Get the most recent assessment
            const latestAssessment = stressResult.data[0];
            
            // Format the date properly
            const assessmentDate = format(new Date(latestAssessment.created_at), "MMM d, yyyy");
            setLastAssessmentDate(assessmentDate);
            
            // Update user metrics with normalized stress level
            setUserMetrics(prev => ({
              ...prev,
              stressLevel: latestAssessment.raw_score,
              lastCheckInStatus: "Completed"
            }));
          }
        }).catch(error => {
          console.error("Error fetching secondary dashboard data:", error);
        }).finally(() => {
          console.timeEnd('dashboard-total-load');
        });
        
        // Lazy load appointment reports - this data is less critical
        const loadAppointmentReports = () => {
          setReportsLoading(true);
          fetchAppointmentReports(user.id)
            .then((result) => {
              const reportsData = (result as any)?.data || (Array.isArray(result) ? result : []);
              const reportsError = (result as any)?.error;

              if (reportsData && !(result as any)?.error) {
                setAppointmentReports(reportsData);
              } else if (reportsError) {
                console.error("Error fetching appointment reports:", reportsError);
                setAppointmentReports([]);
              } else {
                setAppointmentReports([]);
              }
            })
            .catch(error => {
              console.error("Exception in appointment reports fetch:", error);
              setAppointmentReports([]);
            })
            .finally(() => {
              setReportsLoading(false);
            });
        };
        
        // Delay loading reports to prioritize critical UI elements
        setTimeout(loadAppointmentReports, 1000);
        
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (isMounted) {
          toast.error(error.message || "Failed to load dashboard data");
        }
        if (isMounted) {
          setShowWelcomeDialog(false);
        }
      }
    };

    fetchDashboardData();

    // Set up listeners for mood assessment completion events
    const handleMoodAssessmentCompleted = () => {
      console.log('PatientDashboard: Mood assessment completed event received');
      // Use toast to notify user their assessment was received by the dashboard
      toast.success("Mood assessment recorded! Dashboard updating...");
      // Fetch fresh data
      fetchDashboardData();
    };
    
    const handleDashboardReloadNeeded = () => {
      console.log('PatientDashboard: Dashboard reload event received');
      // Fetch fresh data and show indicator
      fetchDashboardData();
    };
    
    // Check sessionStorage for recently saved mood assessments (backup mechanism)
    const checkForRecentAssessments = () => {
      try {
        const lastAssessmentStr = sessionStorage.getItem('last_mood_assessment');
        if (lastAssessmentStr) {
          const lastAssessment = JSON.parse(lastAssessmentStr);
          const saveTime = new Date(lastAssessment.saveTime || lastAssessment.timestamp);
          const now = new Date();
          const timeDiff = now.getTime() - saveTime.getTime();
          
          // If assessment was saved in the last 30 seconds and dashboard hasn't updated
          if (timeDiff < 30000) {
            console.log('PatientDashboard: Recent mood assessment found in storage, reloading data');
            // Show a message so the user knows the dashboard is updating
            toast.info("Updating dashboard with your latest mood assessment...");
            fetchDashboardData();
            // Clear it so we don't reload again
            sessionStorage.removeItem('last_mood_assessment');
          }
        }
      } catch (error) {
        console.error('Error checking for recent assessments:', error);
      }
    };
    
    // Listen for the events using addEventListener
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
    window.addEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
    
    // Check for recent assessments once
    checkForRecentAssessments();
    
    // Also check again in 3 seconds in case there are delays
    const checkTimeout = setTimeout(checkForRecentAssessments, 3000);
    
    return () => {
      isMounted = false;
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
      window.removeEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
      clearTimeout(checkTimeout);
    };
  }, [user, navigate]);

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      if (!profile?.id) return;

      const result = await supabase
        .from('user_profiles')
        .update(updatedData)
        .eq('id', profile.id)
        .select('*')
        .single();

      if (result.error) throw result.error;

      if (result.data) {
        setProfile(result.data);
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleJournalClick = () => {
    navigate('/patient-dashboard/journal');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleSignout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Appointment Reports', 14, 20);

      // Add patient info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${profile?.first_name} ${profile?.last_name}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

      // Create data for table
      const tableRows = appointmentReports.map(report => [
        report.id, 
        report.mood_mentor?.name,
        `${report.date}, ${report.time}`,
        report.type,
        report.status
      ]);

      // Add table with appointment data
      (doc as any).autoTable({
        head: [['ID', 'Mood Mentor', 'Date', 'Type', 'Status']],
        body: tableRows,
        startY: 45,
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [32, 192, 243],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 247, 255]
        }
      });

      // Save the PDF
      const fileName = `appointment_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Appointment report has been downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export appointments");
    }
  };

  const handleExportAppointment = (appointmentId: string) => {
    try {
      // Find the appointment in the reports
      const appointment = appointmentReports.find(report => report.id === appointmentId);
      
      if (!appointment) {
        toast.error("Appointment not found");
        return;
      }
      
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Appointment Details', 14, 20);

      // Add appointment info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Appointment details
      doc.text(`ID: ${appointment.id}`, 14, 35);
      doc.text(`Mood Mentor: ${appointment.mood_mentor?.name}`, 14, 45);
      doc.text(`Specialization: ${appointment.mood_mentor?.specialization}`, 14, 55);
      doc.text(`Date: ${appointment.date}`, 14, 65);
      doc.text(`Time: ${appointment.time}`, 14, 75);
      doc.text(`Type: ${appointment.type}`, 14, 85);
      doc.text(`Status: ${appointment.status}`, 14, 95);
      
      // Add notes if available
      if (appointment.notes) {
        doc.text('Notes:', 14, 110);
        doc.setFontSize(10);
        
        // Split notes into multiple lines if needed
        const splitNotes = doc.splitTextToSize(appointment.notes, 180);
        doc.text(splitNotes, 14, 120);
      }

      // Save the PDF
      const fileName = `appointment_${appointmentId.replace('#', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Appointment details have been downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export appointment details");
    }
  };

  const handleShowWelcomeDialog = () => {
    setShowWelcomeDialog(true);
  };

  const getHealthStatus = (stressLevel: number): 'excellent' | 'good' | 'fair' | 'concerning' | 'worrying' => {
    // Convert raw stress score (1-5) to health percentage (0-100)
    const healthPercentage = Math.max(0, Math.min(100, ((5 - stressLevel) / 4) * 100));
    
    if (healthPercentage >= 80) return 'excellent';
    if (healthPercentage >= 60) return 'good';
    if (healthPercentage >= 40) return 'fair';
    if (healthPercentage >= 20) return 'concerning';
    return 'worrying';
  };

  // Replace appointmentService.getPatientAppointments with direct Supabase call
  const fetchAppointments = async (userId: string) => {
    return await supabase
      .from('appointments')
      .select(`
        *,
        mood_mentor:mood_mentors(*)
      `)
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });
  };

  // Replace messageService.getMessages with direct Supabase call
  const fetchMessages = async (userId: string) => {
    return await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
  };

  // Replace patientService.getAppointmentReports with direct Supabase call
  const fetchAppointmentReports = async (userId: string) => {
    return await supabase
      .from('appointments')
      .select(`
        *,
        mood_mentor:mood_mentors(*)
      `)
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });
  };

  return (
    <DashboardLayout>
      {/* Weekly notification manager */}
      <NotificationManager 
        checkInDates={checkInDates}
        userId={user?.id || 'test-user'}
        userEmail={user?.email || 'test@example.com'}
      />
      
      {showWelcomeDialog && (
        <WelcomeDialog 
          isOpen={showWelcomeDialog} 
          onClose={() => setShowWelcomeDialog(false)}
        />
      )}

      <StressAssessmentModal open={isStressModalOpen} onOpenChange={setIsStressModalOpen} />

      <div className="space-y-6">
        {/* Title and User Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-slate-500">
              Welcome back, {firstName}
            </p>
          </div>
          {/* Testing Controls */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowWelcomeDialog}
            className="sm:self-start"
          >
            Show Welcome Dialog
          </Button>
        </div>

        {/* Welcome Dialog for testing */}
        {showWelcomeDialog && (
          <WelcomeDialog 
            isOpen={showWelcomeDialog} 
            onClose={() => setShowWelcomeDialog(false)}
          />
        )}

        {/* Health Records Overview */}
        <div>
          <h2 className="text-xl font-medium mb-4">Emotional Health Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Mood Score */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-50 to-pink-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <HeartPulse className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium">Mood Score</span>
                  </div>
                  {hasAssessments && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Active</span>
                  )}
                </div>
                <div className="text-3xl font-bold">{userMetrics.moodScore.toFixed(1)}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasAssessments ? "Average from recent check-ins" : "Start your first check-in"}
                </p>
              </CardContent>
            </Card>

            {/* Stress Level */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium">Stress Level</span>
                  </div>
                  {hasAssessments && userMetrics.stressLevel > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Tracked</span>
                  )}
                </div>
                
                {userMetrics.stressLevel > 0 ? (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {Math.round(((5 - userMetrics.stressLevel) / 4) * 100)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500 ease-in-out"
                        style={{ 
                          width: `${((5 - userMetrics.stressLevel) / 4) * 100}%`,
                          backgroundColor: userMetrics.stressLevel < 2 ? '#4ade80' : 
                                         userMetrics.stressLevel < 3 ? '#a3e635' : 
                                         userMetrics.stressLevel < 4 ? '#facc15' : 
                                         userMetrics.stressLevel < 4.5 ? '#fb923c' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Based on your recent assessment
                    </p>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-slate-500">No assessment data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last Check-in */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-indigo-500 mr-2" />
                    <span className="text-sm font-medium">Last Check-in</span>
                  </div>
                </div>
                <div className="text-3xl font-bold">{hasAssessments ? "Today" : "None"}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasAssessments ? `${lastCheckIn}, ${lastCheckInDate}` : "Complete your first assessment"}
                </p>
              </CardContent>
            </Card>

            {/* Consistency */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <BarChart className="w-5 h-5 text-emerald-500 mr-2" />
                    <span className="text-sm font-medium">Consistency</span>
                  </div>
                  {hasAssessments && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      {userMetrics.streak > 0 ? `${userMetrics.streak} day${userMetrics.streak !== 1 ? 's' : ''} streak` : 'Active Streak'}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold">
                  {hasAssessments 
                    ? userMetrics.consistency > 0 
                      ? `${Math.round(userMetrics.consistency * 10)}%` 
                      : userMetrics.streak > 0 
                        ? `${userMetrics.streak} day${userMetrics.streak !== 1 ? 's' : ''}` 
                      : <span className="opacity-70 animate-pulse">—</span> 
                    : <span className="opacity-70">—</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasAssessments 
                    ? userMetrics.consistency > 0 
                      ? userMetrics.streak > 1 
                        ? `Keep your ${userMetrics.streak}-day streak going!` 
                        : "Keep showing up daily"
                      : <span className="flex items-center"><span className="text-xs inline-block text-emerald-600">Keep showing up daily</span></span>
                    : "Start tracking your mood"}
                  {userMetrics.firstCheckInDate && (
                    <span className="block mt-1 text-slate-400">Since {userMetrics.firstCheckInDate}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mood Check-in and Recent Assessments - 2 columns layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Emotional Health Wheel - replaces Daily Check-in */}
          <EmotionalHealthWheel 
            stressLevel={userMetrics.stressLevel} 
            lastCheckIn={lastAssessmentDate}
            onViewDetails={() => navigate('/patient-dashboard/reports')}
            hasAssessments={hasAssessments}
            statusText={getHealthStatus(userMetrics.stressLevel)}
            onTakeAssessment={() => {
              console.log("EmotionalHealthWheel onTakeAssessment clicked on PatientDashboard - opening modal.");
              setIsStressModalOpen(true);
            }}
          />

          {/* Mood Summary Card */}
          <Card className="h-full bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Recent Trend</CardTitle>
              <CardDescription>Based on recent assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <MoodSummaryCard />
            </CardContent>
          </Card>
        </div>

        {/* Appointment Section */}
        <div>
          {/* Reports Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Appointment Reports</h2>
              <div className="flex items-center mt-2 sm:mt-0 gap-2">
                <div className="relative">
                  <select 
                    className="appearance-none bg-white border border-slate-200 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={appointmentFilter}
                    onChange={(e) => {
                      setAppointmentFilter(e.target.value);
                      // Loading indicator will be shown by the useEffect that watches appointmentFilter
                    }}
                  >
                    <option value="all">All Appointments</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={reportsLoading || appointmentReports.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export All
                </Button>
              </div>
            </div>
          </div>

          {/* Appointments Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#20C0F3' }} className="rounded-t-lg">
                      <th className="text-left text-sm font-medium text-white p-4 first:rounded-tl-lg">ID</th>
                      <th className="text-left text-sm font-medium text-white p-4">Mood Mentor</th>
                      <th className="text-left text-sm font-medium text-white p-4">Date</th>
                      <th className="text-left text-sm font-medium text-white p-4">Type</th>
                      <th className="text-left text-sm font-medium text-white p-4 last:rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportsLoading ? (
                      // Loading skeleton
                      Array(4).fill(null).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="animate-pulse">
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-20"></div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-32"></div>
                                <div className="h-3 bg-slate-200 rounded w-24"></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-28"></div>
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-16"></div>
                          </td>
                          <td className="p-4">
                            <div className="h-6 bg-slate-200 rounded w-24"></div>
                          </td>
                        </tr>
                      ))
                    ) : appointmentReports.length === 0 ? (
                      // No appointments found
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No appointments found matching your filter criteria
                        </td>
                      </tr>
                    ) : (
                      // Render actual appointment data
                      appointmentReports.map((report) => {
                        // Determine status badge styling
                        const getBadgeClasses = (status: string) => {
                          if (!status) return "bg-slate-100 text-slate-700 hover:bg-slate-200";
                          
                          switch(status.toLowerCase()) {
                            case 'upcoming':
                              return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";
                            case 'completed':
                              return "bg-purple-100 text-purple-700 hover:bg-purple-200";
                            case 'cancelled':
                              return "bg-red-100 text-red-700 hover:bg-red-200";
                            default:
                              return "bg-slate-100 text-slate-700 hover:bg-slate-200";
                          }
                        };

                        // Determine badge dot color
                        const getDotColor = (status: string) => {
                          if (!status) return "bg-slate-500";
                          
                          switch(status.toLowerCase()) {
                            case 'upcoming':
                              return "bg-indigo-500";
                            case 'completed':
                              return "bg-purple-500";
                            case 'cancelled':
                              return "bg-red-500";
                            default:
                              return "bg-slate-500";
                          }
                        };

                        return (
                          <tr key={report.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4">
                              <span className="text-blue-600 font-medium">{report.id}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {report.mood_mentor?.avatar_url ? (
                                  <Avatar className="h-10 w-10 relative">
                                    <AvatarImage 
                                      src={report.mood_mentor?.avatar_url}
                                      alt={report.mood_mentor?.name}
                                      className="object-cover"
                                    />
                                    <AvatarFallback>
                                      {(report.mood_mentor?.name || "").split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span className="text-blue-500 font-medium">
                                    {(report.mood_mentor?.name || "").split(' ').map(n => n[0]).join('')}
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium">{report.mood_mentor?.name}</div>
                                  <div className="text-xs text-slate-500">{report.mood_mentor?.specialization}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm">{`${report.date}, ${report.time}`}</td>
                            <td className="p-4 text-sm">{report.type}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge className={`${getBadgeClasses(report.status)} font-medium px-3 py-1 rounded-full`}>
                                  <span className="flex items-center">
                                    <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(report.status)} mr-1.5`}></span>
                                    {report.status}
                                  </span>
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  onClick={() => handleExportAppointment(report.id)}
                                >
                                  <FileText className="h-3.5 w-3.5 text-slate-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Journal Entries</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600"
              onClick={() => navigate('/patient-dashboard/journal')}
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentJournalEntries.length === 0 ? (
              // No entries message
              <Card className="col-span-full p-5 text-center">
                <CardContent>
                  <p className="text-slate-500 mb-3">No journal entries yet</p>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/patient-dashboard/journal/new')}
                  >
                    Create Your First Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Display actual journal entries
              recentJournalEntries.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="hover:border-blue-200 cursor-pointer transition-colors"
                  onClick={() => navigate(`/patient-dashboard/journal/${entry.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className={
                        !entry.mood ? "bg-slate-50 border-slate-200 text-slate-700" :
                        entry.mood === 'Happy' || entry.mood === 'Grateful' ? "bg-green-50 border-green-200 text-green-700" :
                        entry.mood === 'Calm' ? "bg-blue-50 border-blue-200 text-blue-700" :
                        entry.mood === 'Anxious' || entry.mood === 'Worried' ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                        entry.mood === 'Sad' || entry.mood === 'Overwhelmed' ? "bg-red-50 border-red-200 text-red-700" :
                        "bg-slate-50 border-slate-200 text-slate-700"
                      }>
                        {entry.mood || 'Neutral'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-medium mb-2 line-clamp-1">{entry.title || 'Untitled Entry'}</h3>
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {entry.content ? entry.content.replace(/<[^>]*>/g, '') : 'No content'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}




