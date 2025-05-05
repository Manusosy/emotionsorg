import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Smile, 
  Frown, 
  Meh,
  TrendingUp,
  Calendar,
  BarChart
} from "lucide-react";

interface MoodEntry {
  id: string;
  created_at: string;
  mood_score: number;
  assessment_result: string;
  user_id: string;
}

interface MoodStats {
  averageScore: number;
  totalAssessments: number;
  mostFrequentMood: string;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export default function MoodAnalytics() {
  const { user } = useAuth();
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const fetchMoodData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get date range
        const startDate = format(
          subDays(new Date(), 
            timeRange === 'week' ? 7 : 
            timeRange === 'month' ? 30 : 365
          ), 
          'yyyy-MM-dd'
        );

        // Fetch mood entries
        const { data: moodEntries, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (moodEntries) {
          setMoodData(moodEntries);
          
          // Calculate statistics
          const stats = calculateMoodStats(moodEntries);
          setMoodStats(stats);
        }
      } catch (error) {
        console.error('Error fetching mood data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodData();
  }, [user, timeRange]);

  const calculateMoodStats = (entries: MoodEntry[]): MoodStats => {
    if (!entries.length) {
      return {
        averageScore: 0,
        totalAssessments: 0,
        mostFrequentMood: 'No data',
        recentTrend: 'stable'
      };
    }

    // Calculate average score
    const averageScore = entries.reduce((acc, entry) => acc + entry.mood_score, 0) / entries.length;

    // Count mood frequencies
    const moodFrequencies = entries.reduce((acc, entry) => {
      acc[entry.assessment_result] = (acc[entry.assessment_result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most frequent mood
    const mostFrequentMood = Object.entries(moodFrequencies)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Calculate trend
    const recentEntries = entries.slice(-5);
    if (recentEntries.length < 2) return {
      averageScore,
      totalAssessments: entries.length,
      mostFrequentMood,
      recentTrend: 'stable'
    };

    const firstScores = recentEntries.slice(0, Math.floor(recentEntries.length / 2))
      .reduce((acc, entry) => acc + entry.mood_score, 0) / Math.floor(recentEntries.length / 2);
    const lastScores = recentEntries.slice(Math.floor(recentEntries.length / 2))
      .reduce((acc, entry) => acc + entry.mood_score, 0) / (recentEntries.length - Math.floor(recentEntries.length / 2));

    const trend: 'improving' | 'declining' | 'stable' = 
      lastScores > firstScores + 0.5 ? 'improving' :
      lastScores < firstScores - 0.5 ? 'declining' : 'stable';

    return {
      averageScore,
      totalAssessments: entries.length,
      mostFrequentMood,
      recentTrend: trend
    };
  };

  const getMoodIcon = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'happy':
      case 'very happy':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'sad':
      case 'very sad':
        return <Frown className="w-5 h-5 text-red-500" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />;
      default:
        return <TrendingUp className="w-5 h-5 text-yellow-500 transform rotate-90" />;
    }
  };

  const chartData = moodData.map(entry => ({
    date: format(new Date(entry.created_at), 'MMM dd'),
    score: entry.mood_score
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mood Analytics</h2>
        <div className="flex gap-2">
          <Button 
            variant={timeRange === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            Week
          </Button>
          <Button 
            variant={timeRange === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            Month
          </Button>
          <Button 
            variant={timeRange === 'year' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('year')}
          >
            Year
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </div>
        </div>
      ) : (
        <>
          {/* Mood Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Mood Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                      domain={[0, 10]}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Mood</span>
                    <span className="font-medium">
                      {moodStats?.averageScore.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assessments</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{moodStats?.totalAssessments}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Most Frequent</span>
                    <div className="flex items-center gap-2">
                      {getMoodIcon(moodStats?.mostFrequentMood || '')}
                      <span className="font-medium">{moodStats?.mostFrequentMood}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold capitalize">
                      {moodStats?.recentTrend}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Based on recent assessments
                    </p>
                  </div>
                  {getTrendIcon(moodStats?.recentTrend || 'stable')}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 


