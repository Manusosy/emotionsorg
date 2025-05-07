import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart, FileText, Smile, Meh, Frown, Download, FileDown, Share, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from 'date-fns';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MoodEntry = {
  id: string;
  mood_score: number;
  assessment_result: string;
  created_at: string;
};

export default function MoodSummaryCard() {
  const { user } = useAuth();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch mood entries from session storage (test mode)
  const fetchTestMoodEntries = () => {
    try {
      const entriesString = sessionStorage.getItem('test_mood_entries');
      if (entriesString) {
        const entries = JSON.parse(entriesString);
        // Ensure all entries have proper date format
        const formattedEntries = entries.map((entry: any) => ({
          id: entry.id || `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          mood_score: entry.mood_score || 5,
          assessment_result: entry.assessment_result || 'Neutral',
          created_at: entry.created_at || new Date().toISOString()
        }));
        
        // Sort by created_at in descending order (newest first)
        formattedEntries.sort((a: MoodEntry, b: MoodEntry) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Only return most recent 7 entries for the chart
        return formattedEntries.slice(0, 7);
      }
      return [];
    } catch (error) {
      console.error("Error reading test mood entries:", error);
      return [];
    }
  };

  useEffect(() => {
    const loadMoodData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get data from sessionStorage in test mode
        const testEntries = fetchTestMoodEntries();
        setMoodEntries(testEntries);
      } catch (err: any) {
        console.error("Error fetching mood entries:", err);
        setError(err.message || "Failed to load mood data");
      } finally {
        setIsLoading(false);
      }
    };

    loadMoodData();
    
    // Listen for mood assessment completed events
    const handleMoodAssessmentCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{
        moodScore: number;
        assessmentResult: string;
        timestamp: string;
      }>;
      
      // Add the new entry to our state
      const newEntry = {
        id: `generated_${Date.now()}`,
        mood_score: customEvent.detail.moodScore,
        assessment_result: customEvent.detail.assessmentResult,
        created_at: customEvent.detail.timestamp
      };
      
      // Update entries list with new entry at the beginning and limit to 7 entries
      setMoodEntries(prev => [newEntry, ...prev].slice(0, 7));
    };
    
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    
    return () => {
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted as EventListener);
    };
  }, [user]);

  // Format data for chart - we need oldest to newest for proper display
  const chartData = [...moodEntries]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(entry => ({
      date: format(parseISO(entry.created_at), 'MMM dd'),
      score: entry.mood_score
    }));

  const getAverageMoodScore = (): string => {
    if (!moodEntries.length) return "N/A";
    
    const sum = moodEntries.reduce((acc, entry) => acc + entry.mood_score, 0);
    return (sum / moodEntries.length).toFixed(1);
  };

  const getLatestMood = (): string => {
    if (!moodEntries.length) return "No data";
    return moodEntries[0].assessment_result;
  };

  const getLatestMoodDate = (): string => {
    if (!moodEntries.length) return "";
    
    const date = parseISO(moodEntries[0].created_at);
    return format(date, 'MMM d');
  };

  const getMoodColor = (mood: string): string => {
    const lowerMood = (mood || '').toLowerCase();
    if (lowerMood.includes('happy') || lowerMood.includes('great')) return 'text-green-500';
    if (lowerMood.includes('neutral') || lowerMood.includes('calm')) return 'text-blue-500';
    if (lowerMood.includes('sad') || lowerMood.includes('low')) return 'text-red-500';
    return 'text-slate-700';
  };

  // Export functions
  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Mood Summary Report', 14, 20);
      
      // Add user info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Add summary info
      doc.setFontSize(14);
      doc.text('Mood Summary', 14, 45);
      
      doc.setFontSize(11);
      doc.text(`Latest Mood: ${getLatestMood()}`, 16, 55);
      doc.text(`Average Mood Score: ${getAverageMoodScore()}/10`, 16, 65);
      doc.text(`Total Entries: ${moodEntries.length}`, 16, 75);
      
      // Add table with mood data
      if (moodEntries.length > 0) {
        doc.setFontSize(14);
        doc.text('Mood History', 14, 95);
        
        const tableRows = moodEntries.map(entry => [
          format(parseISO(entry.created_at), 'MMM dd, yyyy'),
          entry.mood_score.toString() + '/10',
          entry.assessment_result
        ]);
        
        (doc as any).autoTable({
          head: [['Date', 'Score', 'Mood']],
          body: tableRows,
          startY: 105,
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: { 
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 255, 240]
          }
        });
      }
      
      // Save the PDF
      const fileName = `mood_summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Mood summary has been downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export mood summary");
    }
  };
  
  const exportToCsv = () => {
    try {
      if (moodEntries.length === 0) {
        toast.error("No mood data to export");
        return;
      }
      
      // Create CSV content
      const headers = ['Date', 'Mood Score', 'Mood'];
      const rows = moodEntries.map(entry => [
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
      link.setAttribute('download', `mood_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Mood data has been downloaded as CSV");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Failed to export mood data");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-medium">Mood Summary</CardTitle>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-slate-500" disabled={isLoading || moodEntries.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCsv}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" className="h-8 text-slate-500" disabled={isLoading || moodEntries.length === 0}>
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <Link to="/mood-check">
              <Button variant="ghost" size="sm" className="h-8 text-slate-500">
                <FileText className="h-4 w-4 mr-1" />
                Check-in
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-slate-500">Loading mood data...</div>
          </div>
        ) : error ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        ) : moodEntries.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center">
            <div className="text-slate-500 mb-4">No mood entries yet</div>
            <Link to="/mood-check">
              <Button size="sm">Log Your First Mood</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-slate-500">Recent Mood</div>
                <div className={`text-lg font-medium ${getMoodColor(getLatestMood())}`}>
                  {getLatestMood()}
                  <span className="text-xs text-slate-400 ml-2">
                    {getLatestMoodDate()}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Average</div>
                <div className="text-lg font-medium">
                  {getAverageMoodScore()}
                  <span className="text-xs text-slate-400">/10</span>
                </div>
              </div>
            </div>
            
            <div className="h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${value}`}
                    formatter={(value) => [`Mood: ${value}/10`, '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Link to="/mood-check">
                <Button size="sm" variant="outline" className="text-sm">
                  <BarChart className="h-4 w-4 mr-1" />
                  Log Mood
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 


