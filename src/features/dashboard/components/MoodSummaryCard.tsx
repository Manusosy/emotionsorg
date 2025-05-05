import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { 
  Smile, 
  Frown, 
  Meh, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Calendar,
  HeartPulse,
  Activity,
  BarChart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";

interface MoodSummary {
  totalEntries: number;
  averageScore: number;
  lastAssessment: string | null;
  mostFrequentMood: string;
  streakDays: number;
}

// Function to interpret mood score
const getMoodDescription = (score: number): string => {
  if (score >= 8) return 'Very Happy';
  if (score >= 6) return 'Happy';
  if (score >= 5) return 'Neutral';
  if (score >= 3) return 'Sad';
  return 'Very Sad';
};

// Function to get color based on mood score
const getMoodColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-green-500';
  if (score >= 5) return 'text-yellow-500';
  if (score >= 3) return 'text-orange-500';
  return 'text-red-500';
};

export default function MoodSummaryCard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create a memoized function to fetch mood summary data
  const fetchMoodSummary = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Fetch mood entries
      const { data: moodEntries, error } = await dataService.getMoodEntries(user.id);

      if (error) throw error;

      if (moodEntries && moodEntries.length > 0) {
        // Calculate average score
        const averageScore = moodEntries.reduce((acc, entry) => acc + entry.mood_score, 0) / moodEntries.length;
        
        // Calculate last assessment date
        const lastAssessment = moodEntries[0]?.created_at || null;
        
        // Calculate streak
        let streakDays = 0;
        if (moodEntries.length > 0) {
          // Sort entries by date (newest first)
          const sortedEntries = [...moodEntries].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Check if latest entry is from today or yesterday
          const latestDate = parseISO(sortedEntries[0].created_at);
          const today = new Date();
          const daysDifference = differenceInDays(today, latestDate);
          
          if (daysDifference <= 1) {
            // Start counting streak
            streakDays = 1;
            let previousDate = latestDate;
            
            // Loop through other entries to find consecutive days
            for (let i = 1; i < sortedEntries.length; i++) {
              const currentDate = parseISO(sortedEntries[i].created_at);
              // If entries are from consecutive days
              if (differenceInDays(previousDate, currentDate) === 1) {
                streakDays++;
                previousDate = currentDate;
              } else {
                break;
              }
            }
          }
        }

        // Count mood frequencies
        const moodFrequencies = moodEntries.reduce((acc, entry) => {
          acc[entry.assessment_result] = (acc[entry.assessment_result] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find most frequent mood
        const mostFrequentMood = Object.entries(moodFrequencies)
          .sort(([,a], [,b]) => b - a)[0][0];

        setSummary({
          totalEntries: moodEntries.length,
          averageScore,
          lastAssessment,
          mostFrequentMood,
          streakDays
        });
      } else {
        // No entries found
        setSummary({
          totalEntries: 0,
          averageScore: 0,
          lastAssessment: null,
          mostFrequentMood: 'No data',
          streakDays: 0
        });
      }
    } catch (error) {
      console.error('Error fetching mood summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchMoodSummary();
  }, [fetchMoodSummary]);

  // Setup subscription to mood entries changes
  useEffect(() => {
    if (!user) return;

    // Setup subscription to mood_entries changes using the data service
    const unsubscribe = dataService.subscribeMoodEntries(user.id, () => {
      // Refresh data when changes are detected for this user
      fetchMoodSummary();
    });

    // Also set up a periodic refresh every 30 seconds
    const intervalId = setInterval(fetchMoodSummary, 30000);

    return () => {
      // Clean up subscription and interval on unmount
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      clearInterval(intervalId);
    };
  }, [user, fetchMoodSummary]);

  const formatLastAssessment = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = parseISO(dateString);
    const today = new Date();
    const daysDiff = differenceInDays(today, date);
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 7) return `${daysDiff} days ago`;
    
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">Your Mood Summary</CardTitle>
        <HeartPulse className="w-4 h-4 text-rose-500" />
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Emotion Status */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Current Mood</span>
                <span className={`text-base font-bold ${summary?.averageScore ? getMoodColor(summary.averageScore) : 'text-slate-500'}`}>
                  {summary?.averageScore ? getMoodDescription(summary.averageScore) : 'No data'}
                </span>
              </div>
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                {summary?.averageScore ? (
                  summary.averageScore >= 6 ? (
                    <Smile className="w-6 h-6 text-green-500" />
                  ) : summary.averageScore >= 4 ? (
                    <Meh className="w-6 h-6 text-yellow-500" />
                  ) : (
                    <Frown className="w-6 h-6 text-red-500" />
                  )
                ) : (
                  <Meh className="w-6 h-6 text-slate-300" />
                )}
              </div>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Check-ins */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Check-ins</span>
                </div>
                <div className="text-lg font-bold text-blue-900">{summary?.totalEntries || 0}</div>
              </div>
              
              {/* Streak */}
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Streak</span>
                </div>
                <div className="text-lg font-bold text-green-900">{summary?.streakDays || 0} days</div>
              </div>
            </div>
            
            {/* More Details */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-sm text-slate-600">Average Mood</span>
                <div className="flex items-center">
                  <span className={`text-sm font-semibold ${summary?.averageScore ? getMoodColor(summary.averageScore) : ''}`}>
                    {summary?.averageScore ? summary.averageScore.toFixed(1) : '0'}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/10</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm text-slate-600">Last Check-in</span>
                </div>
                <span className="text-sm font-medium">{formatLastAssessment(summary?.lastAssessment || null)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Frequent Mood</span>
                <Badge variant="outline" className={`font-medium ${
                  summary?.mostFrequentMood?.toLowerCase().includes('happy') 
                    ? 'text-green-600 border-green-200 bg-green-50' 
                    : summary?.mostFrequentMood?.toLowerCase().includes('sad')
                    ? 'text-red-600 border-red-200 bg-red-50'
                    : 'text-yellow-600 border-yellow-200 bg-yellow-50'
                }`}>
                  {summary?.mostFrequentMood || 'No data'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 


