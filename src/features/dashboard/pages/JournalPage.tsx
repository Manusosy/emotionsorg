import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookMarked,
  Calendar,
  Edit,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Clock,
  BookOpen,
  ArrowRight,
  Goal,
  History,
  PenTool
} from "lucide-react";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  mood_score?: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  user_id: string;
  is_favorite?: boolean;
  tomorrows_intention?: string;
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');

  // Fetch journal entries
  useEffect(() => {
    const fetchJournalEntries = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await dataService.getJournalEntries(user.id);
          
        if (error) throw error;
        
        setJournalEntries(data || []);
        setFilteredEntries(data || []);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
        toast.error("Failed to load journal entries");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJournalEntries();
    
    // Set up data refresher - polling instead of real-time subscription
    const intervalId = setInterval(() => {
      fetchJournalEntries();
    }, 60000); // Refresh every minute
      
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);
  
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
  
  // Extract most recent entry's tomorrow plan
  useEffect(() => {
    if (journalEntries.length > 0) {
      const mostRecentEntry = journalEntries[0];
      setTomorrowsPlan(mostRecentEntry.tomorrows_intention || '');
    }
  }, [journalEntries]);
  
  // Format content preview by removing HTML tags
  const formatPreview = (content: string) => {
    const textOnly = content.replace(/<[^>]*>/g, "");
    return textOnly.length > 100 ? textOnly.substring(0, 100) + "..." : textOnly;
  };
  
  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Get mood color based on mood name
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
  
  // Toggle favorite status
  const toggleFavorite = async (entryId: string, currentStatus: boolean) => {
    try {
      const { error } = await dataService.updateJournalEntry(entryId, {
        is_favorite: !currentStatus
      });
        
      if (error) throw error;
      
      // Update local state
      setJournalEntries(entries => 
        entries.map(entry => 
          entry.id === entryId 
            ? {...entry, is_favorite: !currentStatus}
            : entry
        )
      );
      
      toast.success(currentStatus ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      console.error('Error updating journal entry:', error);
      toast.error("Failed to update journal entry");
    }
  };
  
  // Delete journal entry
  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await dataService.deleteJournalEntry(entryId);
        
      if (error) throw error;
      
      // Update local state
      setJournalEntries(entries => entries.filter(entry => entry.id !== entryId));
      setSelectedEntryId(null);
      
      toast.success("Journal entry deleted");
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast.error("Failed to delete journal entry");
    }
  };
  
  // Save tomorrow's plan
  const saveTomorrowsPlan = async () => {
    if (!user || !journalEntries.length) return;
    
    try {
      setIsSavingPlan(true);
      const mostRecentEntryId = journalEntries[0].id;
      
      const { error } = await dataService.updateJournalEntry(mostRecentEntryId, {
        tomorrows_intention: tomorrowsPlan
      });
        
      if (error) throw error;
      
      toast.success("Plan saved successfully");
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error("Failed to save your plan");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleNewEntryClick = () => {
    navigate('/patient-dashboard/journal/new');
  };

  const handleViewEntryClick = (entryId: string) => {
    navigate(`/patient-dashboard/journal/${entryId}`);
  };

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

        {/* Journal Dashboard Tabs */}
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          {/* All Entries Tab */}
          <TabsContent value="entries" className="space-y-6">
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search journal entries..."
                className="pl-10 pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Recent Journal Entries */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="h-[300px]">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </CardContent>
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
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base font-medium line-clamp-1">
                            {entry.title}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {formatDate(entry.created_at)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className={`h-8 w-8 ${entry.is_favorite ? 'text-amber-500' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(entry.id, !!entry.is_favorite);
                            }}
                          >
                            {entry.is_favorite ? 
                              <Star className="h-4 w-4 fill-amber-500" /> : 
                              <Star className="h-4 w-4" />
                            }
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this journal entry? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEntry(entry.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {entry.mood && (
                        <Badge className={`mt-2 text-xs ${getMoodColor(entry.mood)}`}>
                          {entry.mood} {entry.mood_score ? `(${entry.mood_score}/10)` : ''}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-4">
                        {formatPreview(entry.content)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-[300px]">
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {journalEntries.filter(e => e.is_favorite).length === 0 ? (
                  <Card className="p-6 text-center">
                    <Star className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No favorite entries yet</h3>
                    <p className="text-slate-500 mb-4">
                      Mark entries as favorites to easily find your most meaningful reflections
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {journalEntries
                      .filter(entry => entry.is_favorite)
                      .map(entry => (
                        <Card 
                          key={entry.id} 
                          className="hover:shadow-md transition cursor-pointer"
                          onClick={() => handleViewEntryClick(entry.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-base font-medium line-clamp-1">
                                  {entry.title}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {formatDate(entry.created_at)}
                                </CardDescription>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-amber-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(entry.id, true);
                                  }}
                                >
                                  <Star className="h-4 w-4 fill-amber-500" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8 text-red-500"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this journal entry? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteEntry(entry.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            {entry.mood && (
                              <Badge className={`mt-2 text-xs ${getMoodColor(entry.mood)}`}>
                                {entry.mood} {entry.mood_score ? `(${entry.mood_score}/10)` : ''}
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600 line-clamp-4">
                              {formatPreview(entry.content)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tomorrow's Plan Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tomorrow's Plan</CardTitle>
                  <CardDescription>
                    Set your intentions for tomorrow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="What do you plan to accomplish tomorrow?"
                    className="min-h-[120px]"
                    value={tomorrowsPlan}
                    onChange={(e) => setTomorrowsPlan(e.target.value)}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={saveTomorrowsPlan} 
                    disabled={isSavingPlan}
                  >
                    {isSavingPlan ? 'Saving...' : 'Save Plan'}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Journal Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Journal Stats</CardTitle>
                  <CardDescription>
                    Your journaling activity at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookMarked className="h-5 w-5 text-blue-500 mr-2" />
                      <span>Total Entries</span>
                    </div>
                    <span className="font-semibold">{journalEntries.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-amber-500 mr-2" />
                      <span>Favorite Entries</span>
                    </div>
                    <span className="font-semibold">{journalEntries.filter(e => e.is_favorite).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
                      <span>This Month</span>
                    </div>
                    <span className="font-semibold">
                      {journalEntries.filter(e => {
                        const entryDate = new Date(e.created_at);
                        const now = new Date();
                        return entryDate.getMonth() === now.getMonth() && 
                               entryDate.getFullYear() === now.getFullYear();
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-purple-500 mr-2" />
                      <span>Last Entry</span>
                    </div>
                    <span className="font-semibold">
                      {journalEntries.length > 0 
                        ? formatDate(journalEntries[0].created_at) 
                        : 'No entries yet'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


