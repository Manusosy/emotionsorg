import { useState, useEffect } from "react";
import { Star, MapPin, Clock, Globe2, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BookingButton from "@/features/booking/components/BookingButton";
import { toast } from "sonner";

// Mock service implementation
const moodMentorService = {
  getAvailableMoodMentors: async (limit = 10) => {
    console.log("Using mock mood mentor service");
    return { success: false, error: new Error("Mock service"), data: [] };
  }
};

interface MoodMentor {
  id: string;
  full_name: string;
  avatar_url: string;
  specialties: string[];
  location: string;
  duration: string;
  rating: number;
  available: boolean;
  languages: string[];
  education: string;
  experience: string;
}

// Sample mock data to use as fallback when API calls fail
const mockMoodMentors: MoodMentor[] = [
  {
    id: "mock-1",
    full_name: "Dr. Sarah Johnson",
    avatar_url: "/lovable-uploads/7d02b0da-dd91-4635-8bc4-6df39dffd0f1.png",
    specialties: ["Depression", "Anxiety", "Relationships"],
    location: "New York, US",
    duration: "45 Min",
    rating: 4.9,
    available: true,
    languages: ["English", "Spanish"],
    education: "PhD Psychology, Harvard",
    experience: "10+ years"
  },
  {
    id: "mock-2",
    full_name: "Dr. Michael Chen",
    avatar_url: "/lovable-uploads/a299cbd8-711d-4138-b99d-eec11582bf18.png",
    specialties: ["Stress Management", "Trauma", "Grief"],
    location: "London, UK",
    duration: "60 Min",
    rating: 4.8,
    available: true,
    languages: ["English", "Mandarin"],
    education: "MD Psychiatry, Oxford",
    experience: "8 years"
  },
  {
    id: "mock-3",
    full_name: "Dr. Olivia Rodriguez",
    avatar_url: "/lovable-uploads/557ff7f5-9815-4228-b935-0fb6a858cc65.png",
    specialties: ["Family Therapy", "ADHD", "Addiction"],
    location: "Toronto, CA",
    duration: "30 Min",
    rating: 4.7,
    available: false,
    languages: ["English", "French"],
    education: "PhD Clinical Psychology, Toronto",
    experience: "12 years"
  }
];

export default function MoodMentorGrid() {
  const navigate = useNavigate();
  const [moodMentors, setMoodMentors] = useState<MoodMentor[]>(mockMoodMentors);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a timeout to ensure page doesn't appear to hang when loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    fetchMoodMentors();
    
    return () => clearTimeout(timeoutId);
  }, []);

  const fetchMoodMentors = async () => {
    try {
      // Wrap in setTimeout to prevent blocking the UI
      setTimeout(async () => {
        try {
          // Use mood mentor service to get available mentors
          const result = await moodMentorService.getAvailableMoodMentors(10);
          
          if (result.success && result.data && result.data.length > 0) {
            // Map to the expected MoodMentor interface format
            const mappedMoodMentors = result.data.map(mentor => ({
              id: mentor.id,
              full_name: mentor.name || mentor.full_name || 'Mood Mentor',
              avatar_url: mentor.avatar_url || mentor.avatar || '/default-avatar.png',
              specialties: mentor.specialty ? 
                (typeof mentor.specialty === 'string' ? mentor.specialty.split(',') : [mentor.specialty]) : 
                ['Mental Health Support'],
              location: mentor.location || 'Remote',
              duration: mentor.session_duration || '30 Min',
              rating: mentor.rating || 4.7,
              available: mentor.availability_status === 'Available', 
              languages: mentor.languages && Array.isArray(mentor.languages) ? 
                mentor.languages : ['English'],
              education: (typeof mentor.education === 'string') ? 
                mentor.education : 
                (mentor.education && mentor.education[0]?.degree) || 'Mental Health Professional',
              experience: (typeof mentor.experience === 'string') ? 
                mentor.experience : 
                `${mentor.experience || 3}+ years`
            }));
            
            setMoodMentors(mappedMoodMentors);
          } else {
            // Fallback to mock data if no real data available
            console.log("No mood mentor data returned, using mock data");
            setMoodMentors(mockMoodMentors);
          }
        } catch (error: any) {
          console.error("Failed to fetch mood mentors:", error);
          // Silently fallback to mock data
          setMoodMentors(mockMoodMentors);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    } catch (error: any) {
      console.error("Error in fetching mood mentors:", error);
      setIsLoading(false);
    }
  };

  const viewMoodMentorProfile = (mentorId: string, mentorName: string) => {
    // Create a URL-friendly version of the name
    const nameSlug = mentorName.toLowerCase().replace(/ /g, '-');
    // Navigate to the mood mentor profile with the name-based URL and ID as a query parameter
    navigate(`/mood-mentors/${nameSlug}?id=${mentorId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-4">
            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
            <span className="font-medium text-sm">Meet Our Team</span>
            <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001A41]">Our Mood Mentors</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="overflow-hidden animate-pulse">
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-4">
          <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
          <span className="font-medium text-sm">Meet Our Team</span>
          <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#001A41]">Our Mood Mentors</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moodMentors.map((mentor) => (
          <Card key={mentor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => viewMoodMentorProfile(mentor.id, mentor.full_name)}>
                <img
                  src={mentor.avatar_url || '/default-avatar.png'}
                  alt={mentor.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback image if the avatar URL fails to load
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{mentor.full_name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{mentor.rating || 5.0}</span>
                  </div>
                </div>
              </div>

              {mentor.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.location}</span>
                </div>
              )}

              {mentor.specialties && mentor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mentor.specialties.map((specialty, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              {mentor.languages && mentor.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {mentor.languages.join(", ")}
                  </span>
                </div>
              )}

              {mentor.education && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.education}</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.duration || '30 Min'}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  mentor.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {mentor.available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              <BookingButton
                moodMentorId={parseInt(mentor.id) || 0}
                className="text-white bg-blue-600 hover:bg-blue-700"
                buttonText={mentor.available ? "Book Session" : "Unavailable"}
                disabled={!mentor.available}
                variant="default"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
