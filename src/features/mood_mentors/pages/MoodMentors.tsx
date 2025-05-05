import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, ThumbsUp, MessageSquare, DollarSign, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import BookingButton from "@/features/booking/components/BookingButton"

// Mock mood mentor service
const moodMentorService = {
  async getAvailableMoodMentors(limit = 10) {
    console.log("Using mock mood mentor service");
    // Return empty data that will fall back to mock data
    return { success: false, error: new Error("Mock service"), data: [] };
  }
};

type MoodMentor = {
  id: string
  name: string
  credentials: string
  specialty: string
  rating: number
  totalRatings: number
  feedback: number
  location: string
  isFree: boolean
  therapyTypes: string[]
  image: string
  satisfaction: number
}

const MoodMentors = () => {
  const [selectedDate, setSelectedDate] = useState("")
  const [gender, setGender] = useState<string[]>(["Male"])
  const [specialties, setSpecialties] = useState<string[]>(["Depression & Anxiety", "Trauma & PTSD"])
  const [filteredMoodMentors, setFilteredMoodMentors] = useState<MoodMentor[]>([])
  const [loading, setLoading] = useState(true)
  const [realMoodMentors, setRealMoodMentors] = useState<MoodMentor[]>([])
  // Add debug toggle button
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  
  // Sample mood mentor data as fallback
  const mockMoodMentors: MoodMentor[] = [
    {
      id: "1",
      name: "Dr. Ruby Perrin",
      credentials: "PhD in Psychology, Mental Health Specialist",
      specialty: "Depression & Anxiety Specialist",
      rating: 5,
      totalRatings: 17,
      feedback: 17,
      location: "Kigali, Rwanda",
      isFree: true,
      therapyTypes: ["Cognitive Behavioral Therapy", "Mindfulness", "Stress Management"],
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      satisfaction: 98
    },
    {
      id: "2",
      name: "Dr. Darren Elder",
      credentials: "MSc in Clinical Psychology, Certified Counselor",
      specialty: "Trauma & PTSD Specialist",
      rating: 5,
      totalRatings: 35,
      feedback: 35,
      location: "Musanze, Rwanda",
      isFree: true,
      therapyTypes: ["EMDR Therapy", "Trauma-Focused CBT", "Group Therapy"],
      image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      satisfaction: 96
    },
    {
      id: "3",
      name: "Dr. Deborah Angel",
      credentials: "MA in Counseling Psychology, Mental Health Mood Mentor",
      specialty: "Relationship & Family Specialist",
      rating: 4,
      totalRatings: 27,
      feedback: 27,
      location: "Kigali, Rwanda",
      isFree: true,
      therapyTypes: ["Couples Therapy", "Family Counseling", "Child Psychology"],
      image: "https://images.unsplash.com/photo-1614608997588-8173059e05e6?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      satisfaction: 97
    },
    {
      id: "4",
      name: "Dr. Sofia Brient",
      credentials: "PhD in Clinical Psychology, Addiction Specialist",
      specialty: "Addiction & Recovery Specialist",
      rating: 4,
      totalRatings: 4,
      feedback: 4,
      location: "Rubavu, Rwanda",
      isFree: true,
      therapyTypes: ["Substance Abuse", "Behavioral Addiction", "Recovery Support"],
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      satisfaction: 94
    }
  ]

  // Fetch real mood mentors from service
  useEffect(() => {
    const fetchRealMoodMentors = async () => {
      if (!moodMentorService) {
        console.log("Mood mentor service not available, using mock data");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching mood mentors with mood mentor service...");
        const result = await moodMentorService.getAvailableMoodMentors(10);
        console.log("Mood mentor service response:", result);
        
        if (result.success && result.data && result.data.length > 0) {
          // Map to expected MoodMentor format
          const mappedMoodMentors = result.data.map((moodMentor: any) => {
            console.log("Processing mood mentor:", moodMentor.name || moodMentor.id);
            return {
              id: moodMentor.id || Math.random().toString(),
              name: moodMentor.name || "Mood Mentor",
              credentials: moodMentor.credentials || "Mood Mentor",
              specialty: moodMentor.specialty || "Mood Support",
              rating: moodMentor.rating || 4.5,
              totalRatings: moodMentor.reviews || 10,
              feedback: moodMentor.reviews || 10,
              location: moodMentor.location || "Remote",
              isFree: moodMentor.isFree !== false,
              therapyTypes: Array.isArray(moodMentor.services) ? moodMentor.services : 
                (moodMentor.specialty ? [moodMentor.specialty] : ["Mood Support"]),
              image: moodMentor.avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
              satisfaction: 95
            };
          });
          
          setRealMoodMentors(mappedMoodMentors);
          console.log("Successfully fetched real mood mentors:", mappedMoodMentors.length);
          console.log("Mood mentor details:", mappedMoodMentors);
        } else {
          console.log("No mood mentors returned from service or error in response");
        }
      } catch (error) {
        console.error("Error fetching mood mentors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealMoodMentors();
  }, []);
  
  // Combine real and mock mood mentors, ALWAYS show real mood mentors first
  const combinedMoodMentors = () => {
    if (realMoodMentors.length === 0) {
      console.log("No real mood mentors available, using mock data only");
      return mockMoodMentors;
    }
    
    console.log("Combining real mood mentors with mock data");
    // Always show real mood mentors first, then mock ones
    return [...realMoodMentors, ...mockMoodMentors.filter(mock => 
      !realMoodMentors.some(real => real.id === mock.id)
    )];
  };

  // Apply filters in real-time
  useEffect(() => {
    // Use the combined list of mood mentors
    const moodMentorsList = combinedMoodMentors();
    
    // Filter mood mentors based on selected specialties
    const filtered = moodMentorsList.filter(moodMentor => {
      // Check if mood mentor's specialty matches any selected specialty
      const hasSpecialty = specialties.some(specialty => {
        if (specialty === "Depression & Anxiety") {
          return moodMentor.specialty.includes("Depression") || moodMentor.specialty.includes("Anxiety");
        }
        if (specialty === "Trauma & PTSD") {
          return moodMentor.specialty.includes("Trauma") || moodMentor.specialty.includes("PTSD");
        }
        if (specialty === "Relationship Issues") {
          return moodMentor.specialty.includes("Relationship");
        }
        if (specialty === "Addiction & Recovery") {
          return moodMentor.specialty.includes("Addiction") || moodMentor.specialty.includes("Recovery");
        }
        return false;
      });
      
      return hasSpecialty;
    });
    
    setFilteredMoodMentors(filtered.length > 0 ? filtered : moodMentorsList);
  }, [specialties, gender, realMoodMentors]);

  const toggleSpecialty = (value: string) => {
    if (specialties.includes(value)) {
      setSpecialties(specialties.filter((v) => v !== value));
    } else {
      setSpecialties([...specialties, value]);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-1 text-center">Find Your Mood Mentor</h1>
      <p className="text-center text-gray-600 mb-10">Connect with qualified professionals who can support your emotional wellbeing</p>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters */}
        <div className="lg:w-1/4 space-y-6 order-2 lg:order-1">
          <Card className="p-4 shadow-sm border-gray-200">
            <h2 className="font-semibold text-lg mb-4">Specialty</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="depression-anxiety" 
                  checked={specialties.includes("Depression & Anxiety")}
                  onCheckedChange={() => toggleSpecialty("Depression & Anxiety")}
                />
                <label
                  htmlFor="depression-anxiety"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Depression & Anxiety
                </label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="trauma" 
                  checked={specialties.includes("Trauma & PTSD")}
                  onCheckedChange={() => toggleSpecialty("Trauma & PTSD")}
                />
                <label
                  htmlFor="trauma"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Trauma & PTSD
                </label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="relationship" 
                  checked={specialties.includes("Relationship Issues")}
                  onCheckedChange={() => toggleSpecialty("Relationship Issues")}
                />
                <label
                  htmlFor="relationship"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Relationship Issues
                </label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="addiction" 
                  checked={specialties.includes("Addiction & Recovery")}
                  onCheckedChange={() => toggleSpecialty("Addiction & Recovery")}
                />
                <label
                  htmlFor="addiction"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Addiction & Recovery
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:w-3/4 space-y-6 order-1 lg:order-2">
          {/* Date selector */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                type="date"
                placeholder="Select availability date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button variant="outline">Search</Button>
          </div>

          {/* Mood Mentors list */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-4 text-gray-600">Loading mood mentors...</p>
              </div>
            ) : filteredMoodMentors.length > 0 ? (
              filteredMoodMentors.map((moodMentor) => (
                <Card key={moodMentor.id} className="p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-gray-200">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={moodMentor.image}
                        alt={moodMentor.name}
                        className="w-32 h-32 object-cover rounded-lg shadow"
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-grow flex flex-col">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{moodMentor.name}</h3>
                          <p className="text-gray-600 text-sm">{moodMentor.credentials}</p>
                        </div>
                        <div className="flex items-center">
                          <div className="flex text-yellow-400 mr-1">
                            {[...Array(Math.floor(moodMentor.rating))].map((_, i) => (
                              <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            {moodMentor.rating % 1 !== 0 && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{moodMentor.rating.toFixed(1)}</span>
                          <span className="text-sm text-gray-500 ml-1">({moodMentor.totalRatings})</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-2 mt-1">
                        <Badge variant="outline" className="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200">
                          {moodMentor.specialty}
                        </Badge>
                        {moodMentor.isFree && (
                          <Badge variant="outline" className="text-green-700 bg-green-50 hover:bg-green-100 border-green-200">
                            <DollarSign className="h-3 w-3 mr-1" /> Free Service
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-2 text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{moodMentor.location}</span>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Specializes in: {moodMentor.therapyTypes.join(", ")}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-auto pt-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                          <span>{moodMentor.satisfaction}% Satisfaction</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MessageSquare className="h-4 w-4 mr-1 text-blue-600" />
                          <span>{moodMentor.feedback} Patient Reviews</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
                        <Link to={`/mood-mentor/${moodMentor.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View Profile
                        </Link>
                        <div className="flex gap-2">
                          <Button variant="outline">Message</Button>
                          <BookingButton moodMentorId={moodMentor.id} moodMentorName={moodMentor.name} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Info className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold">No mood mentors found</h3>
                <p className="mt-2 text-gray-600">Try adjusting your filters or check back later</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Debug toggle button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="bg-gray-100"
          >
            {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
          </Button>
          
          {showDebugInfo && (
            <div className="fixed bottom-16 right-4 bg-black text-white p-4 rounded-md shadow-lg max-w-md max-h-96 overflow-auto">
              <h4 className="font-mono text-xs mb-2">Debug Info:</h4>
              <pre className="text-xs">
                {JSON.stringify({
                  realMoodMentors: realMoodMentors.length,
                  filteredCount: filteredMoodMentors.length,
                  specialties,
                  gender,
                  selectedDate,
                  serviceAvailable: !!moodMentorService
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MoodMentors 