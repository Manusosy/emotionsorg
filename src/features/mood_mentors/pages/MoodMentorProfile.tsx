import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, ThumbsUp, MessageSquare, Clock, Video, Phone, CalendarDays, Info, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import BookingButton from '@/features/booking/components/BookingButton';
// Supabase import removed
import { Skeleton } from '@/components/ui/skeleton';

// Define types for the profile data
type Education = {
  university: string;
  degree: string;
  period: string;
};

type Experience = {
  company: string;
  period: string;
  duration: string;
};

type Award = {
  date: string;
  title: string;
  description: string;
};

// Add new types for availability and chat
type TimeSlot = {
  day: string;
  slots: string[];
};

type ChatMessage = {
  sender: 'user' | 'mood_mentor';
  message: string;
  time: string;
};

type MoodMentorProfileData = {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  rating: number;
  totalRatings: number;
  feedback: number;
  location: string;
  isFree: boolean;
  therapyTypes: {
    name: string;
    icon: string;
  }[];
  image: string;
  galleryImages: string[];
  satisfaction: number;
  about: string;
  education: Education[];
  experience: Experience[];
  awards: Award[];
  services: string[];
  specializations: string[];
  phoneNumber: string;
  availability: TimeSlot[];
};

const MoodMentorProfile = () => {
  // Get both URL params and query params
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryId = queryParams.get('id');
  
  // Priority: query ID first (from name-based URLs), then param ID
  const moodMentorId = queryId || id;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showAvailability, setShowAvailability] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showChatAuthDialog, setShowChatAuthDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moodMentor, setMoodMentor] = useState<MoodMentorProfileData | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState<{
    percentage: number;
    isComplete: boolean;
  } | null>(null);
  
  // Use the auth hook to check authentication
  const { isAuthenticated, user } = useAuth();
  
  // Fetch mood mentor data
  useEffect(() => {
    const fetchMoodMentorData = async () => {
      if (!moodMentorId) return;
      
      console.log(`Fetching mood mentor data for ID: ${moodMentorId}`);
      setLoading(true);
      try {
        const response = await moodMentorService.getFormattedMoodMentorData(moodMentorId);
        
        if (response.success && response.data) {
          console.log("Successfully fetched mood mentor data:", response.data.name);
          setMoodMentor(response.data);
          if (response.completeness) {
            setProfileCompleteness(response.completeness);
          }
        } else {
          console.error("Failed to load mood mentor profile:", response.error);
          toast.error("Failed to load mood mentor profile");
          // Fallback to mock data
          setMoodMentor({...mockMoodMentor, id: moodMentorId || "1"});
        }
      } catch (error) {
        console.error("Error fetching mood mentor data:", error);
        toast.error("An error occurred while loading the profile");
        // Fallback to mock data
        setMoodMentor({...mockMoodMentor, id: moodMentorId || "1"});
      } finally {
        setLoading(false);
      }
    };
    
    fetchMoodMentorData();
  }, [moodMentorId]);
  
  // Mock data for fallback if API fails
  const mockMoodMentor: MoodMentorProfileData = {
    id: moodMentorId || "2",
    name: "Dr. Darren Elder",
    credentials: "MSc in Clinical Psychology, Certified Counselor",
    specialty: "Trauma & PTSD Specialist",
    rating: 5,
    totalRatings: 35,
    feedback: 35,
    location: "Kigali, Rwanda",
    isFree: true,
    therapyTypes: [
      { name: "EMDR Therapy", icon: "https://img.icons8.com/color/96/000000/brain.png" },
      { name: "Trauma-Focused CBT", icon: "https://img.icons8.com/color/96/000000/psychological-process.png" },
      { name: "Group Therapy", icon: "https://img.icons8.com/color/96/000000/conference-call.png" },
      { name: "Mindfulness", icon: "https://img.icons8.com/color/96/000000/meditation-guru.png" }
    ],
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1535129219082-b51e1e10f47d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1559035636-a99258c3d1c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80"
    ],
    satisfaction: 96,
    about: "As a mental health professional with extensive experience working in Rwanda and across East Africa, I specialize in trauma recovery and PTSD treatment. My approach combines evidence-based therapeutic methods with cultural sensitivity to provide holistic mental health support for individuals and communities. I'm committed to making mental health care accessible to all Rwandans and contributing to the healing journey of our communities.",
    education: [
      {
        university: "University of Rwanda",
        degree: "MSc in Clinical Psychology",
        period: "1998 - 2003"
      },
      {
        university: "Makerere University",
        degree: "PhD in Psychology",
        period: "2003 - 2005"
      }
    ],
    experience: [
      {
        company: "Rwanda Healing Center",
        period: "2010 - Present",
        duration: "(5 years)"
      },
      {
        company: "Kigali Mental Health Institute",
        period: "2007 - 2010",
        duration: "(3 years)"
      },
      {
        company: "East African Trauma Recovery Program",
        period: "2005 - 2007",
        duration: "(2 years)"
      }
    ],
    awards: [
      {
        date: "July 2019",
        title: "Humanitarian Award - Rwanda Ministry of Health",
        description: "Recognized for exceptional contributions to mental health services in rural communities of Rwanda, particularly in trauma recovery programs."
      },
      {
        date: "March 2011",
        title: "Certificate for International Volunteer Service",
        description: "Awarded for providing pro bono mental health services to underserved communities across East Africa through Doctors Without Borders."
      },
      {
        date: "May 2008",
        title: "Mental Health Professional of The Year Award",
        description: "Presented by the Rwanda Psychological Association for pioneering trauma recovery protocols adapted to the cultural context of Rwanda."
      }
    ],
    services: [
      "Individual Therapy",
      "Trauma Counseling",
      "Anxiety Treatment",
      "Depression Therapy", 
      "Crisis Intervention",
      "Virtual Therapy Sessions"
    ],
    specializations: [
      "Trauma",
      "Depression & Anxiety",
      "PTSD Treatment",
      "Family Therapy",
      "Grief Counseling",
      "Youth Mental Health"
    ],
    phoneNumber: "+250 788 123 456",
    availability: [
      {
        day: "Monday",
        slots: ["10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"]
      },
      {
        day: "Tuesday",
        slots: ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM"]
      },
      {
        day: "Wednesday",
        slots: ["10:00 AM", "2:00 PM", "4:00 PM"]
      },
      {
        day: "Thursday",
        slots: ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM"]
      },
      {
        day: "Friday",
        slots: ["9:00 AM", "12:00 PM", "2:00 PM"]
      }
    ]
  };

  // Function to handle making a call
  const handleMakeCall = () => {
    if (isAuthenticated) {
      window.location.href = `tel:${moodMentor?.phoneNumber}`;
    } else {
      setShowCallDialog(true);
    }
  };

  // Function to handle video call
  const handleVideoCall = () => {
    if (isAuthenticated) {
      toast.success("Setting up video call with " + moodMentor?.name);
      // Implement your video call functionality here
    } else {
      setShowVideoDialog(true);
    }
  };

  // Function to show availability
  const handleShowAvailability = () => {
    if (isAuthenticated) {
      setShowAvailability(true);
    } else {
      setShowAvailabilityDialog(true);
    }
  };

  // Function to handle chat
  const handleChat = () => {
    if (isAuthenticated) {
      setShowChatDialog(true);
      // Add a welcome message if this is the first time opening the chat
      if (chatMessages.length === 0) {
        setChatMessages([
          {
            sender: 'mood_mentor',
            message: `Hello! I'm ${moodMentor?.name}. How can I help you today?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } else {
      setShowChatAuthDialog(true);
    }
  };

  // Function to send a chat message
  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', message: chatMessage, time }
    ]);
    
    // Clear input
    setChatMessage('');
    
    // Simulate mood mentor response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { sender: 'mood_mentor', message: 'Thank you for your message. I\'ll get back to you as soon as possible.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 1000);
  };

  // Function to book an appointment slot
  const bookAppointment = (day: string, time: string) => {
    toast.success(`Booking appointment with ${moodMentor?.name} on ${day} at ${time}`);
    setShowAvailability(false);
    // Implement your booking logic here
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF] opacity-80"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF] opacity-90"></div>
      
      {/* Content with relative positioning */}
      <div className="relative z-10">
        {/* Hero Section - Centered */}
        <div className="w-full flex justify-center items-center py-16">
          <div className="text-center max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6"
            >
              <span className="text-white">Professional Profile</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-[#001A41] mb-3 font-jakarta"
            >
              Mood Mentor Profile
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500"
            >
              View detailed information about your mental health mood mentor, their qualifications, experience, and 
              available appointment slots.
            </motion.p>
          </div>
        </div>
        
        {/* Profile card */}
        <div className="container mx-auto px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden mb-8"
          >
            <div className="p-6 flex flex-col md:flex-row gap-6">
              {/* Mood Mentor image and gallery */}
              <div className="flex-shrink-0">
                <div className="mb-3">
                  <img 
                    src={moodMentor?.image} 
                    alt={moodMentor?.name || "Mood Mentor"}
                    className="w-32 h-32 object-cover rounded-lg shadow-sm"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {moodMentor?.therapyTypes.map((type, index) => (
                    <div key={index} className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                      <img src={type.icon} alt={type.name} className="w-6 h-6" />
                    </div>
                  ))}
                </div>
                <div className="flex text-xs text-gray-500 mt-2 justify-between">
                  {moodMentor?.therapyTypes.map((type, index) => (
                    <div key={index} className="text-center w-12 overflow-hidden">
                      <span className="block truncate">{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Mood Mentor info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#001A41] text-left">{moodMentor?.name}</h2>
                    <p className="text-gray-600 text-sm text-left">{moodMentor?.credentials}</p>
                    <p className="text-[#007BFF] font-medium mb-2 text-left">{moodMentor?.specialty}</p>
                    
                    {/* Star rating */}
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < Math.floor(moodMentor?.rating) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                      ))}
                      <span className="ml-1 text-sm text-gray-500">({moodMentor?.totalRatings})</span>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center gap-1 text-gray-600 mb-2 text-left">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{moodMentor?.location}</span>
                      <span className="text-xs text-[#007BFF] ml-2 underline cursor-pointer">Get Directions</span>
                    </div>
                  </div>
                  
                  {/* Right side stats */}
                  <div className="mt-4 md:mt-0">
                    <div className="flex items-center justify-end mb-2">
                      <ThumbsUp className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-gray-900 font-semibold">{moodMentor?.satisfaction}%</span>
                    </div>
                    <div className="flex items-center justify-end mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-sm text-gray-600">{moodMentor?.feedback} Feedback</span>
                    </div>
                    <div className="flex items-center justify-end mb-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        <span className="bg-blue-100 text-blue-500 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <span className="mr-1">•</span> Free
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* CTA buttons - moved to the bottom right of the mood mentor info section */}
                <div className="flex flex-col md:flex-row gap-2 justify-start items-start md:items-end mt-4 md:justify-end">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full" 
                      title="Phone"
                      onClick={handleMakeCall}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full" 
                      title="Video Call"
                      onClick={handleVideoCall}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full" 
                      title="Message"
                      onClick={handleChat}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full" 
                      title="View Availability"
                      onClick={handleShowAvailability}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  </div>
                  <BookingButton 
                    moodMentorId={parseInt(moodMentor?.id || "2")} 
                    className="mt-2 md:mt-0 md:ml-2" 
                    buttonText={moodMentor?.isFree ? "BOOK APPOINTMENT" : "UNAVAILABLE"}
                    variant="default"
                    disabled={!moodMentor?.isFree}
                  />
                </div>
              </div>
            </div>
          </motion.div>
  
          {/* Tabs section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-white p-0 border-b border-gray-200 w-full mb-8 justify-start overflow-x-auto">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:text-[#007BFF] data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] rounded-none px-6 py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="locations" 
                  className="data-[state=active]:text-[#007BFF] data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] rounded-none px-6 py-3"
                >
                  Locations
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="data-[state=active]:text-[#007BFF] data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] rounded-none px-6 py-3"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger 
                  value="businessHours" 
                  className="data-[state=active]:text-[#007BFF] data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] rounded-none px-6 py-3"
                >
                  Business Hours
                </TabsTrigger>
              </TabsList>
              
              {/* Overview tab content */}
              <TabsContent value="overview" className="mt-0">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">About Me</h3>
                  <p className="text-gray-700">{moodMentor?.about}</p>
                </div>
                
                {/* Education */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Education</h3>
                  <div className="space-y-6">
                    {moodMentor?.education.map((edu, index) => (
                      <div key={index} className="relative pl-8 before:absolute before:left-2 before:top-2 before:w-3 before:h-3 before:bg-[#007BFF] before:rounded-full before:z-10 after:absolute after:left-3 after:top-5 after:bottom-0 after:w-0.5 after:bg-gray-200 after:-z-10">
                        <h4 className="font-medium">{edu.university}</h4>
                        <p className="text-sm text-gray-600">{edu.degree}</p>
                        <p className="text-xs text-gray-500">{edu.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Work Experience */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Work & Experience</h3>
                  <div className="space-y-6">
                    {moodMentor?.experience.map((exp, index) => (
                      <div key={index} className="relative pl-8 before:absolute before:left-2 before:top-2 before:w-3 before:h-3 before:bg-[#007BFF] before:rounded-full before:z-10 after:absolute after:left-3 after:top-5 after:bottom-0 after:w-0.5 after:bg-gray-200 after:-z-10">
                        <h4 className="font-medium">{exp.company}</h4>
                        <p className="text-sm text-gray-600">{exp.period} {exp.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Awards */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Awards</h3>
                  <div className="space-y-6">
                    {moodMentor?.awards.map((award, index) => (
                      <div key={index} className="relative pl-8 before:absolute before:left-2 before:top-2 before:w-3 before:h-3 before:bg-[#007BFF] before:rounded-full before:z-10 after:absolute after:left-3 after:top-5 after:bottom-0 after:w-0.5 after:bg-gray-200 after:-z-10">
                        <p className="text-sm text-gray-500">{award.date}</p>
                        <h4 className="font-medium">{award.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{award.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Services */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {moodMentor?.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-[#007BFF]">→</span>
                        <span className="text-gray-700">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Specializations */}
                <div className="bg-white rounded-lg shadow-sm p-6 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Specializations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {moodMentor?.specializations.map((specialization, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-[#007BFF]">→</span>
                        <span className="text-gray-700">{specialization}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              {/* Locations tab */}
              <TabsContent value="locations" className="mt-0">
                <div className="bg-white rounded-lg shadow-sm p-6 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Practice Locations</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Kigali Main Office</h4>
                      <p className="text-sm text-gray-600 mb-1">KG 567 St, Kimihurura, Kigali</p>
                      <p className="text-sm text-gray-600 mb-2">Rwanda</p>
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Primary Location</span>
                        <span className="text-xs text-[#007BFF] underline cursor-pointer">Get Directions</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Musanze Wellness Center</h4>
                      <p className="text-sm text-gray-600 mb-1">Musanze District, Northern Province</p>
                      <p className="text-sm text-gray-600 mb-2">Rwanda</p>
                      <div className="flex gap-2">
                        <span className="text-xs text-[#007BFF] underline cursor-pointer">Get Directions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Reviews tab */}
              <TabsContent value="reviews" className="mt-0">
                <div className="bg-white rounded-lg shadow-sm p-6 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Client Reviews</h3>
                  <div className="py-8">
                    <p className="text-gray-600">Reviews will be available soon.</p>
                  </div>
                </div>
              </TabsContent>
              
              {/* Business Hours tab */}
              <TabsContent value="businessHours" className="mt-0">
                <div className="bg-white rounded-lg shadow-sm p-6 text-left">
                  <h3 className="text-lg font-semibold mb-4 text-[#001A41]">Business Hours</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Monday</span>
                      <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Tuesday</span>
                      <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Wednesday</span>
                      <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Thursday</span>
                      <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Friday</span>
                      <span className="text-gray-600">9:00 AM - 3:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Saturday</span>
                      <span className="text-gray-600">10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium">Sunday</span>
                      <span className="text-gray-600">Closed</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Availability Dialog */}
        <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Available Appointment Slots</DialogTitle>
              <DialogDescription>
                Select an available time slot to book an appointment with {moodMentor?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {moodMentor?.availability.map((day, idx) => (
                <div key={idx} className="border-b pb-4 last:border-b-0">
                  <h4 className="font-medium mb-2">{day.day}</h4>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => bookAppointment(day.day, slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-xs text-gray-500">
                <Info className="h-3 w-3 mr-1" />
                <span>All times are in local time (CAT)</span>
              </div>
              <Button variant="ghost" onClick={() => setShowAvailability(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Call Dialog for non-authenticated users */}
        <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Authentication Required</DialogTitle>
              <DialogDescription>
                You need to be logged in to call {moodMentor?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className="mb-4">Please book an appointment first or log in to access direct calling.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setShowCallDialog(false)}>Cancel</Button>
                <Link to="/login">
                  <Button className="bg-[#007BFF] hover:bg-blue-600">Log In</Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video Call Dialog for non-authenticated users */}
        <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Authentication Required</DialogTitle>
              <DialogDescription>
                You need to be logged in to video call with {moodMentor?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className="mb-4">Please book an appointment first or log in to access video calling.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setShowVideoDialog(false)}>Cancel</Button>
                <Link to="/login">
                  <Button className="bg-[#007BFF] hover:bg-blue-600">Log In</Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Chat Dialog */}
        <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Chat with {moodMentor?.name}</DialogTitle>
              <DialogDescription>
                Send a message and get a quick response from your mental health mood mentor.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col h-80">
              {/* Chat messages area */}
              <ScrollArea className="flex-1 p-4 bg-gray-50 rounded-md mb-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.sender === 'user' 
                            ? 'bg-[#007BFF] text-white rounded-tr-none' 
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <span className="text-xs opacity-70 block text-right mt-1">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  className="bg-[#007BFF] hover:bg-blue-600"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Availability Dialog for non-authenticated users */}
        <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Authentication Required</DialogTitle>
              <DialogDescription>
                You need to be logged in to view availability for {moodMentor?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className="mb-4">Please log in to see available appointment slots.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>Cancel</Button>
                <Link to="/login">
                  <Button className="bg-[#007BFF] hover:bg-blue-600">Log In</Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Chat Authentication Dialog for non-authenticated users */}
        <Dialog open={showChatAuthDialog} onOpenChange={setShowChatAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#007BFF]">Authentication Required</DialogTitle>
              <DialogDescription>
                You need to be logged in to chat with {moodMentor?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-center">
              <p className="mb-4">Please log in to start a conversation with this mood mentor.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setShowChatAuthDialog(false)}>Cancel</Button>
                <Link to="/login">
                  <Button className="bg-[#007BFF] hover:bg-blue-600">Log In</Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MoodMentorProfile; 


