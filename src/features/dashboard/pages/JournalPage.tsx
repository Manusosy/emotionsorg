import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Calendar,
  Plus,
  Search,
  Star,
  Goal,
  PenTool
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { dataService, userService } from "@/services";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string | number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_shared?: boolean;
  share_code?: string;
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // All state declarations at the top
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries');
  const [isMentor, setIsMentor] = useState(false);

  // Check user role and fetch entries
  useEffect(() => {
    const checkUserAndFetchEntries = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Check if user is a mood mentor
        const profileResponse = await userService.getProfile(user.id);
        
        if (profileResponse.error) throw profileResponse.error;
        
        if (profileResponse.data?.role === 'mood_mentor') {
          setIsMentor(true);
          toast.error("Mood mentors do not have access to the journaling feature");
          navigate('/mood-mentor-dashboard');
          return;
        }

        // If not a mentor, fetch entries
        const response = await dataService.getJournalEntries(user.id);
        
        if (response.error) throw response.error;
        
        setJournalEntries(response.data || []);
        setFilteredEntries(response.data || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error("Failed to load journal entries");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndFetchEntries();
  }, [user, navigate]);
  
  // Filter entries when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEntries(journalEntries);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = journalEntries.filter(entry => 
      entry.title.toLowerCase().includes(term) || 
      entry.content.toLowerCase().includes(term) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(term))
    );
    
    setFilteredEntries(filtered);
  }, [searchTerm, journalEntries]);
  
  // Helper functions
  const formatPreview = (content: string) => {
    const textOnly = content.replace(/<[^>]*>/g, "");
    return textOnly.length > 100 ? textOnly.substring(0, 100) + "..." : textOnly;
  };
  
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Invalid date";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  const getMoodColor = (mood: string | undefined) => {
    if (!mood) return "";
    
    const moodLower = mood.toLowerCase();
    switch(moodLower) {
      case 'happy':
      case 'excited':
      case 'content':
        return 'bg-green-500 text-white';
      case 'calm':
      case 'relaxed':
        return 'bg-blue-500 text-white';
      case 'neutral':
      case 'okay':
        return 'bg-gray-500 text-white';
      case 'anxious':
      case 'worried':
        return 'bg-yellow-500 text-white';
      case 'sad':
      case 'depressed':  
        return 'bg-indigo-500 text-white';
      case 'angry':
      case 'frustrated':
        return 'bg-red-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const handleNewEntryClick = () => {
    navigate('/journal');
  };

  const handleViewEntryClick = (entryId: string) => {
    navigate(`/journal/${entryId}`);
  };

  // If user is a mentor, don't render the journal interface
  if (isMentor) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Journal</h1>
            <p className="text-slate-500">Track your thoughts and emotional journey</p>
          </div>
          <Button onClick={handleNewEntryClick}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search journal entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Journal Dashboard Tabs */}
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          {/* All Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            {isLoading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </Card>
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <Card className="p-6 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">No journal entries yet</h3>
                <p className="text-slate-500 mb-4">Start capturing your thoughts and feelings</p>
                <Button onClick={handleNewEntryClick}>
                  <PenTool className="mr-2 h-4 w-4" />
                  Write your first entry
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEntries.map(entry => (
                  <Card 
                    key={entry.id} 
                    className="hover:shadow-md transition cursor-pointer"
                    onClick={() => handleViewEntryClick(entry.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        {entry.is_shared && (
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(entry.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-3">
                        {formatPreview(entry.content)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {entry.mood && (
                          <Badge variant="secondary" className={getMoodColor(entry.mood.toString())}>
                            {entry.mood}
                          </Badge>
                        )}
                        {entry.tags?.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <Star className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium mb-1">Favorite Entries</h3>
                  <p className="text-slate-500">Coming soon! You'll be able to mark and filter your favorite entries.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <Goal className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium mb-1">Journal Insights</h3>
                  <p className="text-slate-500">Coming soon! Get insights about your journaling patterns and emotional trends.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


