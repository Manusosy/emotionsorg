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
import {
  BookOpen,
  Calendar,
  Plus,
  Search,
  Star,
  Goal,
  PenTool,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  mood_type?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  user_id: string;
  is_shared?: boolean;
  share_code?: string;
  tomorrows_intention?: string;
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries');
  const [journalStats, setJournalStats] = useState<any>(null);

  // Fetch journal entries and favorites
  useEffect(() => {
    const fetchJournalData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch journal entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (entriesError) {
          console.error('Error fetching journal entries:', entriesError);
          toast.error('Failed to load journal entries');
        } else {
          setJournalEntries(entriesData || []);
          setFilteredEntries(entriesData || []);
        }
        
        // Fetch favorites
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('journal_favorites')
          .select('journal_entry_id')
          .eq('user_id', user.id);
          
        if (favoritesError) {
          console.error('Error fetching favorites:', favoritesError);
        } else if (favoritesData && favoritesData.length > 0) {
          const favoriteIds = favoritesData.map(fav => fav.journal_entry_id);
          
          // Fetch the actual favorite entries
          const { data: favoriteEntries, error: favEntriesError } = await supabase
            .from('journal_entries')
            .select('*')
            .in('id', favoriteIds)
            .order('created_at', { ascending: false });
          
          if (favEntriesError) {
            console.error('Error fetching favorite entries:', favEntriesError);
          } else {
            setFavoriteEntries(favoriteEntries || []);
          }
        }
        
        // Calculate basic stats
        if (entriesData && entriesData.length > 0) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          
          const entriesThisMonth = entriesData.filter(
            entry => new Date(entry.created_at) >= startOfMonth
          ).length;
          
          const entriesThisWeek = entriesData.filter(
            entry => new Date(entry.created_at) >= startOfWeek
          ).length;
          
          // Find most common mood
          const moodCounts: Record<string, number> = {};
          entriesData.forEach(entry => {
            if (entry.mood) {
              moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            }
          });
          
          let mostCommonMood: string | null = null;
          let maxCount = 0;
          
          Object.entries(moodCounts).forEach(([mood, count]) => {
            if (count > maxCount) {
              mostCommonMood = mood;
              maxCount = count;
            }
          });
          
          const statsData = {
            total_entries: entriesData.length,
            entries_this_month: entriesThisMonth,
            entries_this_week: entriesThisWeek,
            most_common_mood: mostCommonMood,
            avg_entries_per_week: entriesData.length / 4 // Simple approximation
          };
          
          setJournalStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching journal data:', error);
        toast.error('Something went wrong. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJournalData();
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
  
  // Helper functions
  const formatPreview = (content: string) => {
    const textOnly = content.replace(/<[^>]*>/g, "");
    return textOnly.length > 100 ? textOnly.substring(0, 100) + "..." : textOnly;
  };
  
  const formatDate = (dateStr: string) => {
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
    navigate(`/dashboard/journal/${entryId}`);
  };

  const toggleFavorite = async (entryId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigating to entry detail

    if (!user?.id) {
      toast.error("You must be logged in to favorite entries");
      return;
    }

    try {
      // Check if entry is already a favorite
      const { data: existingFavorite, error: checkError } = await supabase
        .from('journal_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('journal_entry_id', entryId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking favorite status:', checkError);
        toast.error('Failed to update favorite status');
        return;
      }
      
      if (existingFavorite) {
        // Remove from favorites
        const { error: removeError } = await supabase
          .from('journal_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('journal_entry_id', entryId);
          
        if (removeError) {
          console.error('Error removing favorite:', removeError);
          toast.error('Failed to remove from favorites');
          return;
        }
        
        // Update UI
        setFavoriteEntries(favoriteEntries.filter(entry => entry.id !== entryId));
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error: addError } = await supabase
          .from('journal_favorites')
          .insert({
            user_id: user.id,
            journal_entry_id: entryId
          });
          
        if (addError) {
          console.error('Error adding favorite:', addError);
          toast.error('Failed to add to favorites');
          return;
        }
        
        // Find the entry to add to favorites
        const entryToAdd = journalEntries.find(entry => entry.id === entryId);
        if (entryToAdd) {
          setFavoriteEntries([entryToAdd, ...favoriteEntries]);
        }
        
        toast.success('Added to favorites');
      }
      
      // Update the UI to reflect the change
      setJournalEntries(journalEntries.map(entry => {
        if (entry.id === entryId) {
          const isFavorite = favoriteEntries.some(fav => fav.id === entryId);
          return { ...entry, is_favorite: !isFavorite };
        }
        return entry;
      }));
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  // Check if an entry is a favorite
  const isEntryFavorite = (entryId: string) => {
    return favoriteEntries.some(entry => entry.id === entryId);
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
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading entries...</span>
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
                        <CardTitle className="text-lg">{entry.title || "Untitled Entry"}</CardTitle>
                        <button 
                          onClick={(e) => toggleFavorite(entry.id, e)}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={`h-4 w-4 ${isEntryFavorite(entry.id) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        </button>
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
                          <Badge variant="secondary" className={getMoodColor(entry.mood)}>
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
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading favorites...</span>
              </div>
            ) : favoriteEntries.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Star className="h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium mb-1">No Favorite Entries</h3>
                    <p className="text-slate-500">Click the star icon on any journal entry to add it to your favorites.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteEntries.map(entry => (
                  <Card 
                    key={entry.id} 
                    className="hover:shadow-md transition cursor-pointer"
                    onClick={() => handleViewEntryClick(entry.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg">{entry.title || "Untitled Entry"}</CardTitle>
                        <button 
                          onClick={(e) => toggleFavorite(entry.id, e)}
                          className="focus:outline-none"
                        >
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </button>
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
                          <Badge variant="secondary" className={getMoodColor(entry.mood)}>
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
          
          {/* Insights Tab */}
          <TabsContent value="insights">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading insights...</span>
              </div>
            ) : !journalStats || journalEntries.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Goal className="h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium mb-1">No Journal Insights Yet</h3>
                    <p className="text-slate-500">Start journaling to see insights about your emotional patterns and journaling habits.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Journal Activity</CardTitle>
                    <CardDescription>Your journaling patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total entries</span>
                        <span className="font-semibold">{journalStats.total_entries}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">This month</span>
                        <span className="font-semibold">{journalStats.entries_this_month}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">This week</span>
                        <span className="font-semibold">{journalStats.entries_this_week}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Average entries per week</span>
                        <span className="font-semibold">{journalStats.avg_entries_per_week.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Mood Patterns</CardTitle>
                    <CardDescription>Your emotional trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Most common mood</span>
                        <Badge variant="secondary" className={getMoodColor(journalStats.most_common_mood)}>
                          {journalStats.most_common_mood || "None recorded"}
                        </Badge>
                      </div>
                      
                      <div className="pt-4">
                        <h4 className="text-sm font-medium mb-3">Recent moods</h4>
                        <div className="flex flex-wrap gap-2">
                          {journalEntries.slice(0, 5).map(entry => (
                            entry.mood && (
                              <Badge key={entry.id} variant="secondary" className={getMoodColor(entry.mood)}>
                                {entry.mood}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


