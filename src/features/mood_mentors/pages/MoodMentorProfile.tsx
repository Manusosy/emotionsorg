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
  bio?: string;
  education: Education[];
  experience: Experience[];
  awards: Award[];
  services: string[];
  specializations: string[];
  phoneNumber: string;
  availability: TimeSlot[];
  nameSlug: string;
};

const MoodMentorProfile = () => {
  // Get both URL params and query params
  const { name } = useParams<{ name: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mentorId = queryParams.get('id');
  
  // Priority: query ID first (from name-based URLs), then param ID
  const moodMentorId = mentorId;
  
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
  const [error, setError] = useState<string | null>(null);
  
  // Use the auth hook to check authentication
  const { isAuthenticated, user } = useAuth();
  
  // Fetch mood mentor data
  useEffect(() => {
    const fetchMoodMentorData = async () => {
      try {
        setLoading(true);
        const nameSlug = name || "";

        // Debug the nameSlug we're looking up
        console.log(`Fetching mood mentor profile for slug: ${nameSlug}`);
        
        // Get mood mentor by slug
        const response = await moodMentorService.getMoodMentorBySlug(nameSlug);
        
        if (response.success && response.data) {
          console.log("API Response Data:", response.data);
          
          // Map API response to the UI model with more detailed mapping
          const mentorData: MoodMentorProfileData = {
            id: response.data.id || "",
            name: response.data.name || response.data.full_name || "",
            credentials: response.data.credentials || response.data.title || "",
            specialty: response.data.specialty || "",
            rating: response.data.rating || 0,
            totalRatings: response.data.reviewCount || 0,
            feedback: response.data.reviewCount || 0,
            location: response.data.location || "",
            isFree: response.data.hourlyRate === 0,
            
            // Enhanced mapping for therapy types with better type safety
            therapyTypes: Array.isArray(response.data.therapyTypes) 
              ? response.data.therapyTypes.map((type: string) => ({
                  name: type,
                  icon: '/therapy-icon.svg' // Default icon path
                }))
              : [],
              
            image: response.data.avatarUrl || response.data.avatar_url || '/default-avatar.png',
            galleryImages: [],
            satisfaction: response.data.satisfaction || 0,
            
            // Detailed bio mapping with fallbacks - but no generic text
            about: response.data.about || response.data.bio || response.data.description || "",
                
            // Carefully map education with null checks and defaults
            education: (() => {
              console.log("DEBUG: Raw education data:", response.data.education);
              
              if (Array.isArray(response.data.education) && response.data.education.length > 0) {
                return response.data.education.map(edu => ({
                  university: edu.institution || "",
                  degree: edu.degree || "",
                  period: edu.year || ""
                }));
              }
              return [];
            })(),
            
            // Carefully map experience with null checks and defaults
            experience: (() => {
              console.log("DEBUG: Raw experience data:", 
                response.data.experience_details || response.data.experience);
              
              if (Array.isArray(response.data.experience_details) && response.data.experience_details.length > 0) {
                return response.data.experience_details.map(exp => ({
                  company: exp.place || exp.title || "",
                  period: exp.duration || "",
                  duration: exp.duration || ""
                }));
              } else if (Array.isArray(response.data.experience) && response.data.experience.length > 0) {
                return response.data.experience.map(exp => ({
                  company: exp.place || exp.title || "",
                  period: exp.duration || "",
                  duration: exp.duration || ""
                }));
              }
              
              // If experience is just a number, only create an entry if it's a valid number
              if (typeof response.data.experience === 'number' && response.data.experience > 0) {
                return [{
                  company: "Mental Health Professional",
                  period: `${response.data.experience} years of experience`,
                  duration: `${response.data.experience} years`
                }];
              }
              
              return [];
            })(),
            
            awards: [], // Not implemented yet
            
            // Services - Use specialties if available
            services: Array.isArray(response.data.specialties) ? response.data.specialties : [],
            
            // Specializations - Use specialties as a fallback
            specializations: Array.isArray(response.data.specialties) ? response.data.specialties : 
              (response.data.specialty ? [response.data.specialty] : []),
            
            phoneNumber: "",
            availability: [], // Will implement later
            nameSlug: response.data.nameSlug || response.data.name_slug || nameSlug
          };
          
          console.log("Mentor profile data mapped to UI model:", mentorData);
          setMoodMentor(mentorData);
        } else {
          console.error("Error fetching mood mentor:", response.error);
          setError(response.error || "Failed to load mentor profile");
          
          // Don't set any mock data as fallback
          setMoodMentor(null);
        }
      } catch (error) {
        console.error("Error in fetchMoodMentorData:", error);
        setError("An unexpected error occurred");
        setMoodMentor(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMoodMentorData();
  }, [name]);
  
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
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-indigo-50">
      {/* Debug indicator - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 p-4 z-50">
          <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg shadow text-xs">
            <h3 className="font-bold mb-1">Debug Mode</h3>
            <div className="mb-1"><strong>Name:</strong> {moodMentor?.name}</div>
            <div className="mb-1"><strong>Slug:</strong> {moodMentor?.nameSlug}</div>
            <div className="mb-1"><strong>Specialty:</strong> {moodMentor?.specialty}</div>
            <div className="mb-1"><strong>Bio:</strong> {moodMentor?.about?.substring(0, 20)}...</div>
            <div className="mb-1"><strong>Education:</strong> {moodMentor?.education?.length || 0} items</div>
            <div className="mb-1"><strong>Experience:</strong> {moodMentor?.experience?.length || 0} items</div>
            
            <div className="flex gap-1 mt-1">
              <button 
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                onClick={async () => {
                  try {
                    await moodMentorService.syncTestMentorProfile();
                    toast.success("Profile data synced and refreshing...");
                    setTimeout(() => window.location.reload(), 500);
                  } catch (e) {
                    console.error("Error syncing profile:", e);
                    toast.error("Error syncing profile");
                  }
                }}
              >
                Sync & Refresh
              </button>
              
              <button 
                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                onClick={() => {
                  console.log("Full mentor data:", moodMentor);
                  
                  // Check both localStorage keys
                  try {
                    const testProfile = localStorage.getItem('test_mentor_profile');
                    const mentorProfile = localStorage.getItem('mentor_profile_data');
                    
                    if (testProfile) {
                      const testData = JSON.parse(testProfile);
                      console.log("test_mentor_profile:", {
                        name: testData.name || testData.full_name,
                        bio: testData.bio?.substring(0, 30) + "..." || "missing",
                        about: testData.about?.substring(0, 30) + "..." || "missing",
                        education: testData.education?.length || 0,
                        experience: testData.experience_details?.length || 0
                      });
                    }
                    
                    if (mentorProfile) {
                      const profileData = JSON.parse(mentorProfile);
                      console.log("mentor_profile_data:", {
                        name: profileData.name || profileData.full_name,
                        bio: profileData.bio?.substring(0, 30) + "..." || "missing",
                        about: profileData.about?.substring(0, 30) + "..." || "missing",
                        education: profileData.education?.length || 0,
                        experience: profileData.experience_details?.length || 0
                      });
                    }
                  } catch (e) {
                    console.error("Error parsing localStorage data:", e);
                  }
                  
                  toast.success("Profile data logged to console");
                }}
              >
                Debug Data
              </button>
              
              <button 
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                onClick={async () => {
                  try {
                    // This will completely reset all profile data and create a fresh profile
                    await moodMentorService.completeResetAndCreateTestProfile();
                    toast.success("Profile completely reset. Refreshing...");
                    setTimeout(() => window.location.reload(), 800);
                  } catch (e) {
                    console.error("Error resetting profile:", e);
                    toast.error("Error resetting profile");
                  }
                }}
              >
                Reset Profile
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto py-12 px-4 md:px-6">
        {/* Back button */}
        <div className="mb-8">
          <Link to="/mood-mentors" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Mood Mentors
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading profile information...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md overflow-hidden sticky top-8">
                {/* Profile image and basic info */}
                <div className="p-6 text-center border-b">
                  <div className="relative mx-auto w-40 h-40 mb-4">
                    <img 
                      src={moodMentor?.image || "/default-avatar.png"} 
                      alt={moodMentor?.name}
                      className="w-full h-full object-cover rounded-full ring-4 ring-blue-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/default-avatar.png";
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{moodMentor?.name}</h1>
                  <p className="text-blue-600 font-medium mb-1">{moodMentor?.credentials}</p>
                  <p className="text-gray-500 text-sm mb-3 flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-1" /> 
                    {moodMentor?.location || "Remote"}
                  </p>
                  
                  {/* Rating */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-5 h-5 ${i < Math.floor(moodMentor?.rating || 0) ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-gray-600 text-sm">{moodMentor?.rating?.toFixed(1)} ({moodMentor?.totalRatings} reviews)</span>
                  </div>
                </div>
                
                {/* Quick stats */}
                <div className="grid grid-cols-3 text-center border-b">
                  <div className="p-4 border-r">
                    <p className="text-2xl font-bold text-blue-600">{moodMentor?.satisfaction || 98}%</p>
                    <p className="text-xs text-gray-500">Satisfaction</p>
                  </div>
                  <div className="p-4 border-r">
                    <p className="text-2xl font-bold text-blue-600">{typeof moodMentor?.experience === 'number' ? moodMentor?.experience : 5}+</p>
                    <p className="text-xs text-gray-500">Years Exp</p>
                  </div>
                  <div className="p-4">
                    <p className="text-2xl font-bold text-blue-600">{moodMentor?.feedback || 0}</p>
                    <p className="text-xs text-gray-500">Feedback</p>
                  </div>
                </div>
                
                {/* Specialties */}
                <div className="p-6 border-b">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {moodMentor?.specializations?.map((specialty, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Contact options */}
                <div className="p-6">
                  <BookingButton 
                    moodMentorId={moodMentor?.id || "2"} 
                    moodMentorName={moodMentor?.name}
                    nameSlug={moodMentor?.nameSlug}
                    className="w-full mb-3" 
                    buttonText="Book Appointment"
                    variant="default"
                  />
                  <Button 
                    onClick={handleChat} 
                    variant="outline" 
                    className="w-full flex items-center justify-center"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About section */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </span>
                    About Me
                  </h2>
                  
                  {/* Bio */}
                  <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed">
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-yellow-50 border border-yellow-200 p-2 mb-3 text-xs rounded">
                        <div><strong>Bio source:</strong> {moodMentor?.about ? 'about field' : (moodMentor?.bio ? 'bio field' : 'none')}</div>
                        <div><strong>Bio length:</strong> {(moodMentor?.bio || moodMentor?.about || '').length}</div>
                      </div>
                    )}
                    
                    <p className="whitespace-pre-line">{moodMentor?.about || moodMentor?.bio || 'No bio information available'}</p>
                  </div>
                </div>
                
                {/* Therapy approaches */}
                <div className="bg-blue-50 p-6 border-t border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-3">Therapy Approaches</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {moodMentor?.therapyTypes?.map((type, index) => (
                      <div key={index} className="flex items-center">
                        <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
                        <span className="text-sm text-gray-700">{type.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Education section */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                    </span>
                    Education
                  </h2>
                  
                  {/* Display education */}
                  <div className="space-y-6">
                    {moodMentor?.education && moodMentor.education.length > 0 ? (
                      moodMentor.education.map((edu, index) => (
                        <div key={index} className="flex">
                          <div className="relative flex-shrink-0 w-12 flex justify-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center z-10">
                              <span className="text-blue-600 font-medium">{index + 1}</span>
                            </div>
                            {index < moodMentor.education.length - 1 && (
                              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-blue-100"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 pb-6">
                            <h4 className="text-lg font-medium text-gray-900">{edu.degree}</h4>
                            <p className="text-gray-600">{edu.university}</p>
                            <p className="text-sm text-gray-500">{edu.period}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">Education details not available</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Experience section */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                      </svg>
                    </span>
                    Work Experience
                  </h2>
                  
                  {/* Display experience */}
                  <div className="space-y-6">
                    {moodMentor?.experience && moodMentor.experience.length > 0 ? (
                      moodMentor.experience.map((exp, index) => (
                        <div key={index} className="flex">
                          <div className="relative flex-shrink-0 w-12 flex justify-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center z-10">
                              <span className="text-blue-600 font-medium">{index + 1}</span>
                            </div>
                            {index < moodMentor.experience.length - 1 && (
                              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-blue-100"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 pb-6">
                            <h4 className="text-lg font-medium text-gray-900">{exp.company}</h4>
                            <p className="text-sm text-gray-600">{exp.period} {exp.duration ? `(${exp.duration})` : ''}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">Experience details not available</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Services section */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Services Offered
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(moodMentor?.services && moodMentor.services.length > 0) ? (
                      moodMentor.services.map((service, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="ml-2 text-gray-700">{service}</span>
                        </div>
                      ))
                    ) : (
                      // If no services, show therapy types as services
                      moodMentor?.therapyTypes?.map((type, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="ml-2 text-gray-700">{type.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-600">Chat with {moodMentor?.name}</DialogTitle>
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
                          ? 'bg-blue-600 text-white rounded-tr-none' 
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
                className="bg-blue-600 hover:bg-blue-700"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Authentication Dialog for non-authenticated users */}
      <Dialog open={showChatAuthDialog} onOpenChange={setShowChatAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-600">Authentication Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to chat with {moodMentor?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-center">
            <p className="mb-4">Please log in to start a conversation with this mood mentor.</p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setShowChatAuthDialog(false)}>Cancel</Button>
              <Link to="/login">
                <Button className="bg-blue-600 hover:bg-blue-700">Log In</Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MoodMentorProfile; 


