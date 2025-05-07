import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { useAuth } from "@/hooks/use-auth";
import MoodAnalytics from "../components/MoodAnalytics";
import MoodAssessment from "../components/MoodAssessment";
import MoodSummaryCard from "../components/MoodSummaryCard";
import EmotionalHealthWheel from "../components/EmotionalHealthWheel";
import { Appointment as DbAppointment, Message, UserProfile } from "../../../types/database.types";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import WelcomeDialog, { resetWelcomeDialog } from "@/components/WelcomeDialog";
import NotificationManager from '../components/NotificationManager';

// Define interfaces for appointment data
interface MoodMentor {
  name: string;
  specialization: string;
  avatar_url?: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  moodMentor?: MoodMentor;
  notes?: string;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([
    {
      id: 'EMHA01',
      date: '12 Nov 2023',
      time: '10:00 AM',
      type: 'Video Consultation',
      status: 'Upcoming',
      moodMentor: {
        name: 'Dr. Sophie Chen',
        specialization: 'Psychiatrist'
      },
      notes: 'Follow-up on medication efficacy'
    },
    {
      id: 'EMHA02',
      date: '18 Nov 2023',
      time: '2:30 PM',
      type: 'Phone Call',
      status: 'Upcoming',
      moodMentor: {
        name: 'Michael Roberts',
        specialization: 'Wellness Coach'
      },
      notes: 'Weekly check-in'
    },
    {
      id: 'EMHA03',
      date: '25 Nov 2023',
      time: '11:15 AM',
      type: 'In-person',
      status: 'Upcoming',
      moodMentor: {
        name: 'Dr. James Wilson',
        specialization: 'Therapist'
      },
      notes: 'Therapy session'
    },
    {
      id: 'EMHA04',
      date: '30 Nov 2023',
      time: '4:00 PM',
      type: 'Video Consultation',
      status: 'Upcoming',
      moodMentor: {
        name: 'Emma Thompson',
        specialization: 'Nutritionist'
      },
      notes: 'Dietary plan review'
    }
  ]);
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
  const [appointmentReports, setAppointmentReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Set last check-in time to current time (for mood tracking)
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastCheckIn(timeString);
    
    // For the date display
    const today = new Date();
    setLastCheckInDate(`${today.toLocaleString('default', { month: 'short' })} ${today.getDate()}, ${today.getFullYear()}`);
    
    // Initialize last assessment date to "Not taken" by default
    setLastAssessmentDate("Not taken");

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await authService.getCurrentUser();
        
        // Check local storage for auth data when no session found
        if (!session) {
          const storedAuthState = localStorage.getItem('auth_state');
          if (storedAuthState) {
            try {
              const { isAuthenticated, userRole } = JSON.parse(storedAuthState);
              if (!isAuthenticated || userRole !== 'patient') {
                navigate('/login');
                return;
              }
              // Continue with stored auth - we'll use default/mock data
            } catch (e) {
              console.error("Error parsing stored auth state:", e);
              navigate('/login');
              return;
            }
          } else {
            navigate('/login');
            return;
          }
        }

        // Create profile from user metadata or use default data if not available
        const userProfile: UserProfile = {
          id: session?.user?.id || 'unknown',
          patient_id: session?.user?.user_metadata?.patient_id || 'EMHA01P',
          first_name: session?.user?.user_metadata?.first_name || 'Demo',
          last_name: session?.user?.user_metadata?.last_name || 'User',
          email: session?.user?.email || 'demo@example.com',
          phone_number: session?.user?.user_metadata?.phone_number || '',
          date_of_birth: session?.user?.user_metadata?.date_of_birth || '',
          country: session?.user?.user_metadata?.country || 'United States',
          address: session?.user?.user_metadata?.address || '',
          city: session?.user?.user_metadata?.city || '',
          state: session?.user?.user_metadata?.state || '',
          pincode: session?.user?.user_metadata?.pincode || '',
          avatar_url: session?.user?.user_metadata?.avatar_url || '',
          created_at: new Date().toISOString()
        };

        if (isMounted) {
          setProfile(userProfile);
        }

        // Fetch appointments
        try {
          const { data: appointmentsData, error: appointmentsError } = await appointmentService.getPatientAppointments(session.user.id);
          
          if (appointmentsError) {
            console.error("Error fetching appointments:", appointmentsError);
            // Use mock data instead
            const mockAppointments: Appointment[] = [
              {
                id: "1",
                date: "2023-10-15", // These properties are for mock appointments only
                time: "10:00 AM",
                type: "video",
                status: "upcoming",
                patient_id: session.user.id,
                moodMentor_id: "mood-mentor-123",
                notes: null,
                duration: "60 minutes"
              },
              {
                id: "2",
                date: "2023-10-20",
                time: "2:30 PM",
                type: "voice",
                status: "upcoming",
                patient_id: session.user.id,
                moodMentor_id: "mood-mentor-456",
                notes: null,
                duration: "45 minutes"
              }
            ] as any; // Type assertion to avoid properties mismatch
            
            if (isMounted) {
              setAppointments(mockAppointments);
            }
          } else {
            // Use the mapped appointments from the service
            if (isMounted) {
              setAppointments(appointmentsData);
            }
          }
        } catch (error) {
          console.error("Error fetching appointments:", error);
          if (isMounted) {
            setAppointments([]);
          }
        }
        
        // Fetch messages
        try {
          const { data: messagesData, error: messagesError } = await messageService.getMessages(session.user.id, 5);
          
          if (messagesError) {
            console.error("Error fetching messages:", messagesError);
            // Use mock data instead
            const mockMessages: Message[] = [
              {
                id: "1",
                sender: {
                  id: "1",
                  full_name: "Sarah Johnson (Mood Mentor)",
                  avatar_url: "/lovable-uploads/47ac3dae-2498-4dd3-a729-73086f5c34f8.png"
                },
                content: "Hi there! Just checking in on how you're feeling after our last session.",
                created_at: new Date().toISOString(),
                timestamp: "10:30 AM",
                unread: true
              },
              {
                id: "2",
                sender: {
                  id: "2",
                  full_name: "Michael Chen (Mood Mentor)",
                  avatar_url: ""
                },
                content: "Don't forget to complete your daily mood tracking exercise.",
                created_at: new Date().toISOString(),
                timestamp: "Yesterday",
                unread: false
              }
            ];
            
            if (isMounted) {
              setMessages(mockMessages);
            }
          } else if (messagesData) {
            if (isMounted) {
              setMessages(messagesData);
            }
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
          if (isMounted) {
            setMessages([]);
          }
        }

        // Fetch upcoming appointments
        try {
          const { data: upcomingAppointmentsData, error: upcomingAppointmentsError } = 
            await appointmentService.getUpcomingAppointments(session.user.id, 5);

          if (upcomingAppointmentsError) {
            console.error("Error fetching upcoming appointments:", upcomingAppointmentsError);
            setUpcomingAppointments([]);
          } else {
            setUpcomingAppointments(upcomingAppointmentsData || []);
          }
        } catch (error) {
          console.error("Error fetching upcoming appointments:", error);
          setUpcomingAppointments([]);
        }

        // Fetch user metrics and data
        try {
          // Get the patient's data including journal entries, support groups, and metrics
          const { data: patientData, error: patientError } = await patientService.getPatientDashboardData(session.user.id);
          
          if (patientError) {
            console.error("Error fetching patient data:", patientError);
          } else if (patientData) {
            setSupportGroups(patientData.supportGroups || []);
            setRecentJournalEntries(patientData.journalEntries || []);
            
            if (patientData.metrics) {
              setUserMetrics({
                moodScore: patientData.metrics.moodScore || 0,
                stressLevel: patientData.metrics.stressLevel || 0,
                consistency: patientData.metrics.consistency || 0,
                lastCheckInStatus: patientData.metrics.lastCheckInStatus || "No check-ins yet",
                streak: patientData.metrics.streak || 0,
                firstCheckInDate: patientData.metrics.firstCheckInDate || ""
              });
              
              setLastCheckIn(patientData.metrics.lastCheckInTime || timeString);
              setLastCheckInDate(patientData.metrics.lastCheckInDate || `${today.toLocaleString('default', { month: 'short' })} ${today.getDate()}, ${today.getFullYear()}`);
              setLastAssessmentDate(patientData.metrics.lastAssessmentDate || "Not taken");
              setHasAssessments(patientData.metrics.hasAssessments || false);
            }
          }
        } catch (error) {
          console.error("Error fetching patient dashboard data:", error);
        }

        // Fetch appointment reports using patientService
        setReportsLoading(true);
        try {
          const { success, data, error } = await patientService.getAppointmentReports(
            session.user.id, 
            appointmentFilter
          );
          
          if (success && data) {
            setAppointmentReports(data);
          } else if (error) {
            console.error("Error fetching appointment reports:", error);
            // Fall back to mock reports if real data fetch fails
            setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
          } else {
            // If no data or empty array, use mock data
            setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
          }
        } catch (err) {
          console.error("Exception in appointment reports fetch:", err);
          setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
        } finally {
          setReportsLoading(false);
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (isMounted) {
          toast.error(error.message || "Failed to load dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Update appointment reports when filter changes
  useEffect(() => {
    const updateAppointmentReports = async () => {
      if (!user?.id) return;
      
      setReportsLoading(true);
      try {
        const { success, data, error } = await patientService.getAppointmentReports(
          user.id, 
          appointmentFilter
        );
        
        if (success && data) {
          setAppointmentReports(data);
        } else if (error) {
          console.error("Error fetching filtered appointment reports:", error);
          setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
        } else {
          setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
        }
      } catch (err) {
        console.error("Exception in filtered appointment reports fetch:", err);
        setAppointmentReports(patientService.getMockAppointmentReports(appointmentFilter));
      } finally {
        setReportsLoading(false);
      }
    };
    
    updateAppointmentReports();
  }, [user, appointmentFilter]);

  // Add testing mode listener for stress assessment completion
  useEffect(() => {
    // Check if there's test data in session storage on component mount
    try {
      const testDataString = sessionStorage.getItem('test_stress_assessment');
      if (testDataString) {
        const testData = JSON.parse(testDataString);
        
        // Update UI with test data
        setUserMetrics(prevMetrics => ({
          ...prevMetrics,
          stressLevel: testData.stressLevel || prevMetrics.stressLevel,
          lastCheckInStatus: "Completed",
          // Streak is no longer incremented here - will be managed in the day tracking logic
        }));
        
        setHasAssessments(true);
        setLastAssessmentDate(new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }));
      }
    } catch (error) {
      console.error("Error reading test data from session storage:", error);
    }
    
    // Listen for custom event from stress assessment
    const handleStressAssessmentCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        stressLevel: number;
        score: number;
        status: string;
      }>;
      
      // Update UI immediately with the assessment data
      setUserMetrics(prevMetrics => ({
        ...prevMetrics,
        stressLevel: customEvent.detail.stressLevel || prevMetrics.stressLevel,
        lastCheckInStatus: "Completed",
        // Streak is no longer incremented here - will be managed in the day tracking logic
      }));
      
      setHasAssessments(true);
      setLastAssessmentDate(new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      // Check for day tracking and increment streak if it's a new day
      updateDayStreak();
      
      // Show a toast notification
      toast.success("Dashboard updated with new assessment data", {
        duration: 3000
      });
    };
    
    window.addEventListener('stress-assessment-completed', handleStressAssessmentCompleted as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('stress-assessment-completed', handleStressAssessmentCompleted as EventListener);
    };
  }, []);

  // Add listener for mood assessment completion
  useEffect(() => {
    // Check if there's test mood data in session storage on component mount
    try {
      const moodEntriesStr = sessionStorage.getItem('test_mood_entries');
      if (moodEntriesStr) {
        const moodEntries = JSON.parse(moodEntriesStr);
        if (moodEntries && moodEntries.length > 0) {
          // Get the most recent mood entry
          const latestEntry = moodEntries[moodEntries.length - 1];
          
          // Update UI with mood data
          setUserMetrics(prevMetrics => ({
            ...prevMetrics,
            moodScore: latestEntry.mood_score || prevMetrics.moodScore,
            lastCheckInStatus: "Completed",
            // Streak is no longer incremented here - will be managed in the day tracking logic
          }));
          
          // Update last check-in date
          const entryDate = new Date(latestEntry.created_at);
          setLastCheckInDate(entryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }));
          
          const timeString = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastCheckIn(timeString);
        }
      }
    } catch (error) {
      console.error("Error reading test mood data from session storage:", error);
    }
    
    // Listen for custom event from mood assessment
    const handleMoodAssessmentCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        moodScore: number;
        assessmentResult: string;
        timestamp: string;
      }>;
      
      // Update UI immediately with the mood assessment data
      setUserMetrics(prevMetrics => ({
        ...prevMetrics,
        moodScore: customEvent.detail.moodScore || prevMetrics.moodScore,
        lastCheckInStatus: "Completed",
        // Streak is no longer incremented here - will be managed in the day tracking logic
      }));
      
      // Update last check-in time
      const entryDate = new Date(customEvent.detail.timestamp);
      setLastCheckInDate(entryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      const timeString = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastCheckIn(timeString);
      
      // Check for day tracking and increment streak if it's a new day
      updateDayStreak();
      
      // Show a toast notification
      toast.success("Dashboard updated with new mood data", {
        duration: 3000
      });
    };
    
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    };
  }, []);

  // Function to manage the day-based streak counter
  const updateDayStreak = () => {
    try {
      // Get or initialize the streak record from sessionStorage
      const streakDataStr = sessionStorage.getItem('test_streak_data');
      let streakData = streakDataStr 
        ? JSON.parse(streakDataStr) 
        : { 
            days: [], // Array of date strings that have been logged
            currentStreak: 0,
            lastUpdated: ''
          };
      
      // Get today's date in YYYY-MM-DD format for consistent comparison
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Check if we already logged today
      if (!streakData.days.includes(todayStr)) {
        // Today hasn't been logged yet, add it
        streakData.days.push(todayStr);
        
        // Determine if this continues a streak by checking if yesterday was logged
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (streakData.days.includes(yesterdayStr) || streakData.currentStreak === 0) {
          // Either yesterday was logged, or this is the first day (start streak)
          streakData.currentStreak += 1;
        } else {
          // Gap detected, reset streak to 1 (today)
          streakData.currentStreak = 1;
        }
        
        // Update the last updated date
        streakData.lastUpdated = todayStr;
        
        // Save back to sessionStorage
        sessionStorage.setItem('test_streak_data', JSON.stringify(streakData));
        
        // Update the UI
        setUserMetrics(prevMetrics => ({
          ...prevMetrics,
          streak: streakData.currentStreak,
          // Update any other metrics as needed
        }));
      }
      // If today is already logged, no need to update streak
      
    } catch (error) {
      console.error("Error updating streak data:", error);
    }
  };
  
  // Check initial streak on component mount
  useEffect(() => {
    try {
      const streakDataStr = sessionStorage.getItem('test_streak_data');
      if (streakDataStr) {
        const streakData = JSON.parse(streakDataStr);
        
        // Update UI with existing streak data
        setUserMetrics(prevMetrics => ({
          ...prevMetrics,
          streak: streakData.currentStreak || 0
        }));
        
        // If there are days logged, we have assessments
        if (streakData.days && streakData.days.length > 0) {
          setHasAssessments(true);
        }
      }
    } catch (error) {
      console.error("Error reading streak data:", error);
    }
  }, []);

  // Update checkInDates whenever assessments are completed
  useEffect(() => {
    // Add check-in dates from sessionStorage
    const loadCheckInDates = () => {
      try {
        // Get stress assessment dates
        const stressDataString = sessionStorage.getItem('test_stress_assessment');
        const stressDates: Date[] = [];
        
        if (stressDataString) {
          const stressData = JSON.parse(stressDataString);
          if (stressData.created_at) {
            stressDates.push(new Date(stressData.created_at));
          }
        }
        
        // Get mood assessment dates
        const moodEntriesString = sessionStorage.getItem('test_mood_entries');
        const moodDates: Date[] = [];
        
        if (moodEntriesString) {
          const entries = JSON.parse(moodEntriesString);
          if (Array.isArray(entries)) {
            entries.forEach(entry => {
              if (entry.created_at) {
                moodDates.push(new Date(entry.created_at));
              }
            });
          }
        }
        
        // Combine all dates
        setCheckInDates([...stressDates, ...moodDates]);
      } catch (error) {
        console.error("Error loading check-in dates:", error);
      }
    };
    
    // Load initial check-in dates
    loadCheckInDates();
    
    // Listen for new check-ins to update dates
    const handleStressAssessment = (e: CustomEvent) => {
      const newDate = new Date();
      setCheckInDates(prev => [...prev, newDate]);
    };
    
    const handleMoodAssessment = (e: CustomEvent) => {
      const newDate = new Date();
      setCheckInDates(prev => [...prev, newDate]);
    };
    
    // Add event listeners
    window.addEventListener('stress-assessment-completed', handleStressAssessment as EventListener);
    window.addEventListener('mood-assessment-completed', handleMoodAssessment as EventListener);
    
    return () => {
      // Remove event listeners
      window.removeEventListener('stress-assessment-completed', handleStressAssessment as EventListener);
      window.removeEventListener('mood-assessment-completed', handleMoodAssessment as EventListener);
    };
  }, []);

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      if (!profile?.id) return;

      const { data, error } = await userService.updateUserProfile(profile.id, updatedData);

      if (error) throw error;

      if (data) {
        setProfile(data);
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
      await authService.signOut();
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
        report.moodMentor?.name,
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
      doc.text(`Mood Mentor: ${appointment.moodMentor?.name}`, 14, 45);
      doc.text(`Specialization: ${appointment.moodMentor?.specialization}`, 14, 55);
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

  // Function to show welcome dialog for testing
  const handleShowWelcomeDialog = () => {
    resetWelcomeDialog(); // Reset the localStorage flag
    setShowWelcomeDialog(true);
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

      <div className="space-y-6">
        {/* Title and User Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-slate-500">
              Welcome back, {profile?.first_name || "User"}
            </p>
          </div>
          {/* Testing Controls */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowWelcomeDialog}
            className="sm:self-start"
          >
            <div className="flex items-center gap-1">
              <HeartHandshake className="w-4 h-4" />
              <span>Show Welcome Dialog</span>
            </div>
          </Button>
        </div>

        {/* Welcome Dialog for testing */}
        {showWelcomeDialog && <WelcomeDialog forceShow={true} />}

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
                      {Math.round(userMetrics.stressLevel * 10)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500 ease-in-out"
                        style={{ 
                          width: `${Math.round(userMetrics.stressLevel * 10)}%`,
                          backgroundColor: userMetrics.stressLevel < 3 ? '#4ade80' : 
                                           userMetrics.stressLevel < 5 ? '#a3e635' : 
                                           userMetrics.stressLevel < 7 ? '#facc15' : 
                                           userMetrics.stressLevel < 8 ? '#fb923c' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Based on your recent assessment
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      <span className="opacity-70">—</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="h-2 rounded-full bg-gray-300 w-0"></div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Complete your first assessment
                    </p>
                  </>
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
                                {report.moodMentor?.avatar_url ? (
                                  <Avatar className="h-10 w-10 relative">
                                    <AvatarImage 
                                      src={report.moodMentor?.avatar_url}
                                      alt={report.moodMentor?.name}
                                      className="object-cover"
                                    />
                                    <AvatarFallback>
                                      {(report.moodMentor?.name || "").split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span className="text-blue-500 font-medium">
                                    {(report.moodMentor?.name || "").split(' ').map(n => n[0]).join('')}
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium">{report.moodMentor?.name}</div>
                                  <div className="text-xs text-slate-500">{report.moodMentor?.specialization}</div>
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
            {isLoading ? (
              // Loading skeletons for journal entries
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="hover:border-blue-200 cursor-pointer transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : recentJournalEntries.length === 0 ? (
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



