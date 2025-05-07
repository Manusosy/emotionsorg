import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isAfter, startOfDay, differenceInDays } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Smile, 
  Frown, 
  Meh,
  TrendingUp,
  Calendar,
  BarChart,
  Download,
  FileDown,
  Share,
  ChevronDown
} from "lucide-react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MoodEntry {
  id: string;
  created_at: string;
  mood_score: number;
  assessment_result: string;
  user_id?: string;
}

interface MoodStats {
  averageScore: number;
  totalAssessments: number;
  mostFrequentMood: string;
  recentTrend: 'improving' | 'declining' | 'stable';
  lastUpdated: string;
}

interface MoodAnalyticsProps {
  timeRange: 'week' | 'month' | 'year';
}

export default function MoodAnalytics({ timeRange = 'week' }: MoodAnalyticsProps) {
  const { user } = useAuth();
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [filteredData, setFilteredData] = useState<MoodEntry[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch mood data from session storage (test mode)
  const fetchTestMoodEntries = () => {
    try {
      const entriesString = sessionStorage.getItem('test_mood_entries');
      if (entriesString) {
        const entries = JSON.parse(entriesString);
        // Ensure all entries have proper date format
        const formattedEntries = entries.map((entry: any) => ({
          id: entry.id || `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: entry.created_at || new Date().toISOString(),
          mood_score: entry.mood_score || 5,
          assessment_result: entry.assessment_result || 'Neutral',
          user_id: user?.id || 'test-user'
        }));
        
        // Sort by created_at in ascending order for proper trend analysis
        formattedEntries.sort((a: MoodEntry, b: MoodEntry) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        return formattedEntries;
      }
      return [];
    } catch (error) {
      console.error("Error reading test mood entries:", error);
      return [];
    }
  };

  // Apply time range filter to mood data
  const applyTimeRangeFilter = (entries: MoodEntry[], range: 'week' | 'month' | 'year') => {
    if (!entries.length) return [];
    
    const today = new Date();
    const startDate = subDays(today, 
      range === 'week' ? 7 : 
      range === 'month' ? 30 : 365
    );
    
    // Filter entries by date range
    return entries.filter(entry => {
      const entryDate = parseISO(entry.created_at);
      return isAfter(entryDate, startDate) || differenceInDays(entryDate, startDate) === 0;
    });
  };

  // Initial data fetch
  useEffect(() => {
    const fetchMoodData = async () => {
      try {
        setIsLoading(true);
        
        // Get test data (in production this would use a real API)
        const entries = fetchTestMoodEntries();
        setMoodData(entries);
        
        // Apply time range filter
        const filtered = applyTimeRangeFilter(entries, timeRange);
        setFilteredData(filtered);
        
        // Calculate statistics
        if (filtered.length > 0) {
          const stats = calculateMoodStats(filtered);
          setMoodStats(stats);
        } else {
          setMoodStats({
            averageScore: 0,
            totalAssessments: 0,
            mostFrequentMood: 'No data',
            recentTrend: 'stable',
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error fetching mood data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodData();
  }, [user]);
  
  // Re-filter data when time range changes
  useEffect(() => {
    if (moodData.length > 0) {
      const filtered = applyTimeRangeFilter(moodData, timeRange);
      setFilteredData(filtered);
      
      // Recalculate statistics based on filtered data
      if (filtered.length > 0) {
        const stats = calculateMoodStats(filtered);
        setMoodStats(stats);
      } else {
        setMoodStats({
          averageScore: 0,
          totalAssessments: 0,
          mostFrequentMood: 'No data',
          recentTrend: 'stable',
          lastUpdated: new Date().toISOString()
        });
      }
    }
  }, [timeRange, moodData]);
  
  // Listen for mood assessment completed events
  useEffect(() => {
    const handleMoodAssessmentCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        moodScore: number;
        assessmentResult: string;
        timestamp: string;
      }>;
      
      // Create a new entry
      const newEntry: MoodEntry = {
        id: `generated_${Date.now()}`,
        mood_score: customEvent.detail.moodScore,
        assessment_result: customEvent.detail.assessmentResult,
        created_at: customEvent.detail.timestamp,
        user_id: user?.id || 'test-user'
      };
      
      // Update our data
      setMoodData(prev => {
        const updated = [...prev, newEntry];
        // Sort by date ascending
        updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updated;
      });
      
      // The filtered data will update via the dependency effect
    };
    
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    
    return () => {
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    };
  }, [user]);

  // Listen for export events
  useEffect(() => {
    const handleExportPdf = () => {
      if (filteredData.length > 0) {
        exportToPdf();
      } else {
        toast.error("No data to export");
      }
    };
    
    const handleExportCsv = () => {
      if (filteredData.length > 0) {
        exportToCsv();
      } else {
        toast.error("No data to export");
      }
    };
    
    window.addEventListener('export-mood-data-pdf', handleExportPdf);
    window.addEventListener('export-mood-data-csv', handleExportCsv);
    
    return () => {
      window.removeEventListener('export-mood-data-pdf', handleExportPdf);
      window.removeEventListener('export-mood-data-csv', handleExportCsv);
    };
  }, [filteredData]);

  const calculateMoodStats = (entries: MoodEntry[]): MoodStats => {
    if (!entries.length) {
      return {
        averageScore: 0,
        totalAssessments: 0,
        mostFrequentMood: 'No data',
        recentTrend: 'stable',
        lastUpdated: new Date().toISOString()
      };
    }

    // Calculate average score (with 1 decimal place)
    const totalScore = entries.reduce((acc, entry) => acc + entry.mood_score, 0);
    const averageScore = parseFloat((totalScore / entries.length).toFixed(1));

    // Count mood frequencies
    const moodFrequencies = entries.reduce((acc, entry) => {
      const mood = entry.assessment_result || 'Neutral';
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most frequent mood
    const frequencyEntries = Object.entries(moodFrequencies);
    const mostFrequentMood = frequencyEntries.length > 0 
      ? frequencyEntries.sort(([,a], [,b]) => b - a)[0][0]
      : 'Neutral';

    // Calculate trend - use at least the last 3 entries if available
    const trendSampleSize = Math.min(Math.max(3, Math.floor(entries.length / 2)), entries.length);
    const recentEntries = entries.slice(-trendSampleSize);
    
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (recentEntries.length >= 2) {
      // Split into first half and second half
      const midpoint = Math.floor(recentEntries.length / 2);
      const firstHalf = recentEntries.slice(0, midpoint);
      const secondHalf = recentEntries.slice(midpoint);
      
      // Calculate average for each half
      const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / secondHalf.length;
      
      // Determine trend with threshold of 0.5 for significance
      if (secondAvg > firstAvg + 0.5) {
        recentTrend = 'improving';
      } else if (secondAvg < firstAvg - 0.5) {
        recentTrend = 'declining';
      } else {
        recentTrend = 'stable';
      }
    }
    
    // Get the last updated date from the most recent entry
    const lastUpdated = entries[entries.length - 1].created_at;

    return {
      averageScore,
      totalAssessments: entries.length,
      mostFrequentMood,
      recentTrend,
      lastUpdated
    };
  };

  const getMoodIcon = (mood: string) => {
    const lowerMood = (mood || '').toLowerCase();
    
    if (lowerMood.includes('happy') || lowerMood.includes('great')) {
      return <Smile className="w-5 h-5 text-green-500" />;
    } else if (lowerMood.includes('sad') || lowerMood.includes('low') || lowerMood.includes('down')) {
      return <Frown className="w-5 h-5 text-red-500" />;
    } else {
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

  // Format chart data with consistent date formatting
  const chartData = filteredData.map(entry => ({
    date: format(parseISO(entry.created_at), 'MMM dd'),
    score: entry.mood_score
  }));
  
  // Export to PDF function
  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Mood Analytics Report', 14, 20);
      
      // Add time range info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Time Range: ${timeRange === 'week' ? 'Past 7 days' : timeRange === 'month' ? 'Past 30 days' : 'Past year'}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
      
      // Add summary stats section
      if (moodStats) {
        doc.setFontSize(14);
        doc.text('Mood Analytics Summary', 14, 50);
        
        doc.setFontSize(11);
        doc.text(`Average Mood Score: ${moodStats.averageScore.toFixed(1)}/10`, 16, 60);
        doc.text(`Total Assessments: ${moodStats.totalAssessments}`, 16, 66);
        doc.text(`Most Frequent Mood: ${moodStats.mostFrequentMood}`, 16, 72);
        doc.text(`Recent Trend: ${moodStats.recentTrend.charAt(0).toUpperCase() + moodStats.recentTrend.slice(1)}`, 16, 78);
        doc.text(`Last Updated: ${format(parseISO(moodStats.lastUpdated), 'MMM dd, yyyy')}`, 16, 84);
      }
      
      // Add mood data table
      if (filteredData.length > 0) {
        doc.setFontSize(14);
        doc.text('Mood History', 14, 100);
        
        const tableRows = filteredData.map(entry => [
          format(parseISO(entry.created_at), 'MMM dd, yyyy'),
          entry.mood_score.toFixed(1) + '/10',
          entry.assessment_result
        ]);
        
        (doc as any).autoTable({
          head: [['Date', 'Score', 'Mood']],
          body: tableRows,
          startY: 110,
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: { 
            fillColor: [38, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 247, 255]
          }
        });
      }
      
      // Save the PDF
      const fileName = `mood_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Mood analytics report has been downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export mood analytics");
    }
  };
  
  // Export to CSV function
  const exportToCsv = () => {
    try {
      if (filteredData.length === 0) {
        toast.error("No mood data to export");
        return;
      }
      
      // Create CSV content
      const headers = ['Date', 'Mood Score', 'Mood Assessment'];
      const rows = filteredData.map(entry => [
        format(parseISO(entry.created_at), 'yyyy-MM-dd'),
        entry.mood_score.toString(),
        entry.assessment_result
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mood_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Mood analytics data has been downloaded as CSV");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Failed to export mood analytics data");
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            <div className="text-slate-500 mb-4">No mood data for this time period</div>
            <p className="text-sm text-slate-400 mb-4">Complete a mood assessment to see analytics</p>
            <Button size="sm" onClick={() => {
              const viewAllEvent = new CustomEvent('view-all-time-mood-data');
              window.dispatchEvent(viewAllEvent);
            }}>
              View All Time
            </Button>
          </CardContent>
        </Card>
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
                    <Tooltip 
                      formatter={(value) => [`${value}/10`, 'Mood Score']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', r: 4 }}
                      activeDot={{ fill: '#2563eb', r: 6, strokeWidth: 2 }}
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


