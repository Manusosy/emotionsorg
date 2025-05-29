import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, Trash2, Calendar, Clock, Smile, Star, Check } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { useAuth } from "@/contexts/authContext";
import { toast as sonnerToast } from "sonner";
import { userService } from "@/services";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  mood_type?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  tomorrows_intention?: string;
  is_shared?: boolean;
  share_code?: string;
}

export default function JournalEntryPage() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [isRoleChecking, setIsRoleChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if the user is a mood mentor
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      
      try {
        setIsRoleChecking(true);
        // Check if the user has a mentor profile
        const profileResponse = await userService.getProfile(user.id);
        
        if (profileResponse.error) throw profileResponse.error;
        
        if (profileResponse.data?.role === 'mood_mentor') {
          setIsMentor(true);
          sonnerToast.error("Mood mentors do not have access to the journaling feature");
          navigate('/mood-mentor-dashboard');
          return;
        }
        
        setIsMentor(false);
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setIsRoleChecking(false);
      }
    };
    
    checkUserRole();
  }, [user, navigate]);
  
  // If still checking role, show loading state
  if (isRoleChecking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-slate-500">Checking access...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
      case 'hopeful':
        return 'bg-cyan-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  // Check if entry is a favorite
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user?.id || !entryId) return;
      
      try {
        const { data: existingFavorite, error: checkError } = await supabase
          .from('journal_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('journal_entry_id', entryId)
          .maybeSingle();
        
        if (checkError) throw checkError;
        setIsFavorite(!!existingFavorite);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };
    
    checkFavoriteStatus();
  }, [user, entryId]);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!entryId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch directly from Supabase
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('id', entryId)
          .single();

        if (error) throw error;

        if (data) {
          setEntry(data as JournalEntry);
        } else {
          setError("Journal entry not found");
        }
      } catch (err: any) {
        console.error("Error fetching journal entry:", err);
        setError(err.message || "Failed to load journal entry");
        toast({
          title: "Error",
          description: "Failed to load journal entry",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntry();
  }, [entryId, toast]);

  const handleDelete = async () => {
    if (!entryId || !entry) return;

    if (window.confirm("Are you sure you want to delete this journal entry? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', entryId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Journal entry deleted successfully",
        });

        navigate("/dashboard/journal");
      } catch (err: any) {
        console.error("Error deleting journal entry:", err);
        toast({
          title: "Error",
          description: "Failed to delete journal entry",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = () => {
    // Redirect to the journal page for editing
    navigate('/journal');
  };

  const toggleFavorite = async () => {
    if (!user?.id || !entryId) return;
    
    try {
      // Check if entry is already a favorite
      const { data: existingFavorite, error: checkError } = await supabase
        .from('journal_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('journal_entry_id', entryId)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking favorite status:", checkError);
        toast({
          title: "Error",
          description: "Failed to update favorite status",
          variant: "destructive",
        });
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
          console.error("Error removing favorite:", removeError);
          toast({
            title: "Error",
            description: "Failed to remove from favorites",
            variant: "destructive",
          });
          return;
        }
        
        setIsFavorite(false);
        toast({
          title: "Removed from favorites",
          description: "Entry removed from favorites",
        });
      } else {
        // Add to favorites
        const { error: addError } = await supabase
          .from('journal_favorites')
          .insert({
            user_id: user.id,
            journal_entry_id: entryId
          });
          
        if (addError) {
          console.error("Error adding favorite:", addError);
          toast({
            title: "Error",
            description: "Failed to add to favorites",
            variant: "destructive",
          });
          return;
        }
        
        setIsFavorite(true);
        toast({
          title: "Added to favorites",
          description: "Entry added to favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to load journal entry</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate("/dashboard/journal")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Journal
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If no entry found, show not found message
  if (!entry) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not Found</CardTitle>
              <CardDescription>Journal entry not found</CardDescription>
            </CardHeader>
            <CardContent>
              <p>The journal entry you're looking for doesn't exist or you don't have permission to view it.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate("/dashboard/journal")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Journal
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const formattedDate = entry.created_at 
    ? format(new Date(entry.created_at), "EEEE, MMMM d, yyyy")
    : "Date not available";
  
  // Extract potential gratitude items from content
  const extractGratitudeItems = (content: string): string[] => {
    // Simple extraction - look for lists or lines that might be gratitude items
    const textContent = content.replace(/<[^>]*>/g, '');
    const lines = textContent.split(/\n|\./).filter(line => 
      line.trim().length > 0 && 
      (line.toLowerCase().includes('grateful') || 
       line.toLowerCase().includes('thankful') ||
       line.toLowerCase().includes('appreciate') ||
       line.toLowerCase().includes('blessing'))
    );
    
    // If we found potential gratitude items, return them
    if (lines.length > 0) {
      return lines.map(line => line.trim());
    }
    
    // Otherwise, check for bullet points or numbered lists
    const listItems = textContent.split(/•|-|\d+\./).filter(item => 
      item.trim().length > 0 && item.trim().length < 100
    );
    
    // Return up to 3 items that might be gratitude items
    return listItems.slice(0, 3).map(item => item.trim());
  };
  
  const gratitudeItems = extractGratitudeItems(entry.content);

  // Format content for display - remove HTML tags for simple display
  const formatContent = (content: string): string => {
    // Remove HTML tags and convert to plain text
    const textContent = content.replace(/<[^>]*>/g, '');
    
    // Split into paragraphs
    const paragraphs = textContent.split(/\n\n|\r\n\r\n/).filter(p => p.trim().length > 0);
    
    // Return first few paragraphs
    return paragraphs.join('\n\n');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate("/dashboard/journal")}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Journal
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleFavorite}>
              <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Button>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        <Card className="max-w-4xl mx-auto border border-slate-200 shadow-md rounded-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Header with date and mood */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2 sm:mb-0">{formattedDate}</h1>
              
              {entry.mood && (
                <Badge className="px-4 py-1.5 rounded-full text-sm font-medium" variant="secondary">
                  Feeling {entry.mood}
                </Badge>
              )}
            </div>
            
            {/* Journal content */}
            <div className="space-y-6">
              <div className="prose max-w-none">
                {entry.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-slate-700 leading-relaxed">
                    {paragraph.replace(/<[^>]*>/g, '')}
                  </p>
                ))}
              </div>
              
              {/* Gratitude section - if we can extract gratitude items */}
              {gratitudeItems.length > 0 && (
                <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-300 mt-6">
                  <h3 className="font-medium text-blue-800 mb-3 text-lg">Things I'm grateful for today:</h3>
                  <ul className="space-y-3">
                    {gratitudeItems.map((item, index) => (
                      <li key={index} className="flex items-center text-blue-700">
                        <div className="mr-2 bg-blue-200 p-1 rounded-full">
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Tomorrow's intention */}
              {entry.tomorrows_intention && (
                <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-400 mt-6">
                  <h3 className="font-medium text-amber-800 mb-2">Tomorrow's intention:</h3>
                  <p className="text-amber-800 font-bold">{entry.tomorrows_intention}</p>
                </div>
              )}
              
              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {entry.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-slate-100">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


