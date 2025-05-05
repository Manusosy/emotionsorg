import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  LineChart, 
  BarChart3, 
  Download, 
  FileText, 
  ChevronLeft, 
  CalendarRange,
  Activity,
  Brain,
  HeartPulse,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Users
} from "lucide-react";
import { format, subDays, isValid } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
// Supabase import removed
import StressProgressChart from "../components/StressProgressChart";
import ConsistencyHeatmap from "../components/ConsistencyHeatmap";

// Custom error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error): void {
    console.error("Error caught in ErrorBoundary:", error);
  }
  
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Define types for our data
interface Assessment {
  id: string;
  user_id: string;
  stress_score: number;
  created_at: string;
}

interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number;
  created_at: string;
  assessment_result?: string;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("summary");
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [healthMetrics, setHealthMetrics] = useState({
    stressLevel: 0,
    moodScore: 0,
    weeklyStressAvg: 0,
    weeklyMoodAvg: 0,
    stressTrend: 'stable' as 'improving' | 'declining' | 'stable',
    moodTrend: 'stable' as 'improving' | 'declining' | 'stable',
    consistencyScore: 0,
    lastAssessmentDate: null as Date | null,
    lastMoodEntryDate: null as Date | null,
    healthPercentage: 0
  });
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);
  const [firstCheckInDate, setFirstCheckInDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, dateRange]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));
      
      // Fetch stress assessments using dataService
      const { data: assessmentsData, error: assessmentsError } = await dataService.getStressAssessmentsByDateRange(
        user.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
        
      if (assessmentsError) throw assessmentsError;
      
      // Fetch mood entries using dataService
      const { data: moodData, error: moodError } = await dataService.getMoodEntriesByDateRange(
        user.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
        
      if (moodError) throw moodError;
      
      // Set data
      setAssessments(assessmentsData || []);
      setMoodEntries(moodData || []);
      
      // Calculate metrics
      calculateMetrics(assessmentsData || [], moodData || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate all metrics based on fetched data
  const calculateMetrics = (assessments: Assessment[], moodEntries: MoodEntry[]) => {
    // Default values
    let metrics = {
      stressLevel: 0,
      moodScore: 0,
      weeklyStressAvg: 0,
      weeklyMoodAvg: 0,
      stressTrend: 'stable' as 'improving' | 'declining' | 'stable',
      moodTrend: 'stable' as 'improving' | 'declining' | 'stable',
      consistencyScore: 0,
      lastAssessmentDate: null as Date | null,
      lastMoodEntryDate: null as Date | null,
      healthPercentage: 0
    };
    
    // Process stress assessments if available
    if (assessments.length > 0) {
      const currentStress = assessments[0].stress_score;
      metrics.stressLevel = currentStress;
      
      // Calculate health percentage (inverse of stress)
      metrics.healthPercentage = Math.max(0, 100 - (currentStress * 10));
      
      // Set last assessment date
      const lastAssessmentDate = new Date(assessments[0].created_at);
      if (isValid(lastAssessmentDate)) {
        metrics.lastAssessmentDate = lastAssessmentDate;
      }
      
      // Calculate weekly average
      const oneWeekAgo = subDays(new Date(), 7);
      const weeklyAssessments = assessments.filter(a => {
        const date = new Date(a.created_at);
        return isValid(date) && date >= oneWeekAgo;
      });
      
      if (weeklyAssessments.length > 0) {
        metrics.weeklyStressAvg = weeklyAssessments.reduce((sum, a) => sum + a.stress_score, 0) / weeklyAssessments.length;
      }
      
      // Calculate trend
      if (weeklyAssessments.length >= 3) {
        const halfPoint = Math.floor(weeklyAssessments.length / 2);
        const firstHalf = weeklyAssessments.slice(halfPoint);
        const secondHalf = weeklyAssessments.slice(0, halfPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.stress_score, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.stress_score, 0) / secondHalf.length;
        
        // Lower stress = improved health
        if (secondHalfAvg < firstHalfAvg - 0.5) metrics.stressTrend = 'improving';
        else if (secondHalfAvg > firstHalfAvg + 0.5) metrics.stressTrend = 'declining';
      }
      
      // Calculate consistency score with safety check for date validity
      if (assessments.length > 0 && isValid(new Date(assessments[assessments.length - 1].created_at))) {
        const oldestAssessment = new Date(assessments[assessments.length - 1].created_at);
        const daysSinceFirstAssessment = Math.ceil(
          (new Date().getTime() - oldestAssessment.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        // More reasonable consistency calculation:
        // If it's been less than a week, we expect 1-2 check-ins
        // For longer periods, we aim for roughly 1-2 check-ins per week
        if (daysSinceFirstAssessment <= 7) {
          // For a short period, even a single check-in is good progress
          metrics.consistencyScore = Math.min(100, assessments.length * 50); // 50% for 1, 100% for 2+
        } else {
          // For longer periods, aim for 1-2 per week
          const expectedCheckins = Math.ceil(daysSinceFirstAssessment / 7 * 1.5); // Expect ~1.5 per week
          metrics.consistencyScore = Math.min(
            100, 
            Math.round((assessments.length / expectedCheckins) * 100)
          );
        }
        
        // Set the first check-in date
        setFirstCheckInDate(oldestAssessment);
      } else {
        // Default if we can't determine dates properly
        metrics.consistencyScore = assessments.length > 0 ? 100 : 0;
      }
      
      // Generate array of all check-in dates for the heatmap with safety check
      const dates = assessments.map(a => {
        const date = new Date(a.created_at);
        return isValid(date) ? date : null;
      }).filter(Boolean) as Date[]; // Filter out invalid dates
      
      setCheckInDates(dates);
    }
    
    // Process mood entries if available
    if (moodEntries.length > 0) {
      const currentMood = moodEntries[0].mood_score;
      metrics.moodScore = currentMood;
      
      // Set last mood entry date
      metrics.lastMoodEntryDate = new Date(moodEntries[0].created_at);
      
      // Calculate weekly average
      const oneWeekAgo = subDays(new Date(), 7);
      const weeklyMoods = moodEntries.filter(m => 
        new Date(m.created_at) >= oneWeekAgo
      );
      
      if (weeklyMoods.length > 0) {
        metrics.weeklyMoodAvg = weeklyMoods.reduce((sum, m) => sum + m.mood_score, 0) / weeklyMoods.length;
      }
      
      // Calculate trend
      if (weeklyMoods.length >= 3) {
        const halfPoint = Math.floor(weeklyMoods.length / 2);
        const firstHalf = weeklyMoods.slice(halfPoint);
        const secondHalf = weeklyMoods.slice(0, halfPoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.mood_score, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.mood_score, 0) / secondHalf.length;
        
        // Higher mood = improved mood
        if (secondHalfAvg > firstHalfAvg + 0.5) metrics.moodTrend = 'improving';
        else if (secondHalfAvg < firstHalfAvg - 0.5) metrics.moodTrend = 'declining';
      }
      
      // Add mood check-in dates to the heatmap data if they're valid dates
      const moodDates = moodEntries.map(m => {
        const date = new Date(m.created_at);
        return isValid(date) ? date : null;
      }).filter(Boolean) as Date[]; // Filter out any invalid dates
      
      setCheckInDates(prev => [...prev, ...moodDates]);
      
      // Update first check-in date if mood entries are older
      if (moodEntries.length > 0) {
        const oldestMoodEntry = new Date(moodEntries[moodEntries.length - 1].created_at);
        if (isValid(oldestMoodEntry) && (!firstCheckInDate || oldestMoodEntry < firstCheckInDate)) {
          setFirstCheckInDate(oldestMoodEntry);
        }
      }
    }
    
    setHealthMetrics(metrics);
  };

  // Helper functions
  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-lime-600";
    if (percentage >= 40) return "text-yellow-600";
    if (percentage >= 20) return "text-orange-600";
    return "text-red-600";
  };
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-lime-500";
    if (percentage >= 40) return "bg-yellow-500";
    if (percentage >= 20) return "bg-orange-500";
    return "bg-red-500";
  };
  
  const getMoodColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-lime-600";
    if (score >= 4) return "text-yellow-600";
    if (score >= 2) return "text-orange-600";
    return "text-red-600";
  };
  
  const getTrendIndicator = (trend: 'improving' | 'declining' | 'stable', isPositive = true) => {
    switch (trend) {
      case 'improving':
        return { 
          icon: <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />, 
          color: isPositive ? 'text-green-500' : 'text-red-500', 
          text: 'Improving', 
          badge: 'bg-green-100 text-green-800'
        };
      case 'declining':
        return { 
          icon: <TrendingUp className={`w-4 h-4 rotate-180 ${isPositive ? 'text-red-500' : 'text-green-500'}`} />, 
          color: isPositive ? 'text-red-500' : 'text-green-500', 
          text: 'Declining',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return { 
          icon: <TrendingUp className="w-4 h-4 rotate-45 text-yellow-500" />, 
          color: 'text-yellow-500', 
          text: 'Stable',
          badge: 'bg-yellow-100 text-yellow-800'
        };
    }
  };
  
  // Format date safely with fallback message
  const formatDate = (date: Date | null, fallback: string = "No data") => {
    return date && isValid(date) ? format(date, "MMMM d, yyyy") : fallback;
  };
  
  const stressTrend = getTrendIndicator(healthMetrics.stressTrend, false); // For stress, declining is positive
  const moodTrend = getTrendIndicator(healthMetrics.moodTrend, true); // For mood, improving is positive

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Emotional Health Reports</h1>
            <p className="text-slate-500">
              Track your mental wellbeing and stress levels over time
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <CalendarRange className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate("/patient-dashboard")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Tabs for different report views */}
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="stress">Stress Analytics</TabsTrigger>
            <TabsTrigger value="mood">Mood Tracking</TabsTrigger>
            <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
          </TabsList>
          
          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {isLoading ? (
              // Loading state
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-16 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Health Overview Card */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Stress Analytics</CardTitle>
                        <CardDescription>
                          {dateRange === "7" 
                            ? "Past 7 days" 
                            : dateRange === "30" 
                              ? "Past 30 days" 
                              : dateRange === "90" 
                                ? "Past 3 months" 
                                : dateRange === "180" 
                                  ? "Past 6 months" 
                                  : "Past year"}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export Report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* Emotional Health Score */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Emotional Health</p>
                              <p className={`text-2xl font-bold ${getHealthColor(healthMetrics.healthPercentage)}`}>
                                {healthMetrics.healthPercentage}%
                              </p>
                            </div>
                            <div className={`bg-${stressTrend.badge} p-2 rounded-full`}>
                              <Badge className={stressTrend.badge}>
                                {stressTrend.text}
                                {stressTrend.icon}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">Current Stress Level: {healthMetrics.stressLevel.toFixed(1)}/10</div>
                            <Progress 
                              value={healthMetrics.stressLevel * 10} 
                              className="h-2" 
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Last assessment: {formatDate(healthMetrics.lastAssessmentDate, "No assessments yet")}
                          </p>
                        </CardContent>
                      </Card>
                      
                      {/* Mood Score */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Mood Score</p>
                              <p className={`text-2xl font-bold ${getMoodColor(healthMetrics.moodScore)}`}>
                                {healthMetrics.moodScore.toFixed(1)}/10
                              </p>
                            </div>
                            <div className={`bg-${moodTrend.badge} p-2 rounded-full`}>
                              <Badge className={moodTrend.badge}>
                                {moodTrend.text}
                                {moodTrend.icon}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                                <div 
                                  key={value} 
                                  className={`h-1.5 w-2 rounded-full ${
                                    value <= healthMetrics.moodScore ? getMoodColor(value).replace('text-', 'bg-') : 'bg-slate-200'
                                  }`}
                                ></div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Last mood entry: {formatDate(healthMetrics.lastMoodEntryDate, "No mood entries yet")}
                          </p>
                        </CardContent>
                      </Card>
                      
                      {/* Consistency */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Assessment Consistency</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {healthMetrics.consistencyScore}%
                              </p>
                            </div>
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Activity className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">Tracking Regularity</div>
                            <Progress 
                              value={healthMetrics.consistencyScore} 
                              className="h-2" 
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Based on {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} and {moodEntries.length} mood entries
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Progress charts - Now separated into two graphs */}
                    {(assessments.length >= 2 || moodEntries.length >= 2) ? (
                      <div className="mt-6 space-y-6">
                        {/* Stress Level Chart */}
                        {assessments.length >= 2 && (
                          <div>
                            <h3 className="text-sm font-medium mb-3">Stress Level & Emotional Health</h3>
                            <div className="h-[260px] bg-slate-50 rounded-lg p-3 border">
                              <StressProgressChart 
                                assessments={assessments} 
                                moodEntries={[]} 
                                showMoodData={false}
                                singleDataView={true}
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500 text-center">
                              Chart shows your stress level (orange) and emotional health score (green)
                            </div>
                          </div>
                        )}
                        
                        {/* Mood Score Chart */}
                        {moodEntries.length >= 2 && (
                          <div>
                            <h3 className="text-sm font-medium mb-3">Mood Tracking</h3>
                            <div className="h-[260px] bg-slate-50 rounded-lg p-3 border">
                              <StressProgressChart 
                                assessments={[]} 
                                moodEntries={moodEntries} 
                                showStressData={false}
                                showHealthScore={false}
                                singleDataView={true}
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500 text-center">
                              Chart shows your mood score over time (purple)
                            </div>
                          </div>
                        )}
                        
                        {assessments.length < 2 && moodEntries.length >= 2 && (
                          <div className="mt-3 text-sm text-slate-500 text-center">
                            Take stress assessments to see more complete data about your emotional health.
                          </div>
                        )}
                        {moodEntries.length < 2 && assessments.length >= 2 && (
                          <div className="mt-3 text-sm text-slate-500 text-center">
                            Track your mood to see more complete data about your emotional wellbeing.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                        <Brain className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">Not Enough Data Yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Complete at least 2 stress assessments or mood entries to view your progress charts.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button onClick={() => navigate("/patient-dashboard")}>
                            <Brain className="h-4 w-4 mr-2" />
                            Take Stress Assessment
                          </Button>
                          <Button variant="outline" onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                            <HeartPulse className="h-4 w-4 mr-2" />
                            Track Your Mood
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="w-full">
                      <div className="flex items-center mb-2">
                        {healthMetrics.healthPercentage >= 60 ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                        )}
                        <h4 className="text-sm font-medium text-slate-700">Health Status:</h4>
                        <span className={`ml-2 ${getHealthColor(healthMetrics.healthPercentage)} font-medium`}>
                          {healthMetrics.healthPercentage >= 80 ? 'Excellent' :
                           healthMetrics.healthPercentage >= 60 ? 'Good' :
                           healthMetrics.healthPercentage >= 40 ? 'Fair' :
                           healthMetrics.healthPercentage >= 20 ? 'Concerning' : 'Worrying'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600">
                        {healthMetrics.healthPercentage >= 60 ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            Your emotional health is in good condition. Continue maintaining your current practices.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Your emotional health scores indicate there may be room for improvement. Check the recommendations.
                          </span>
                        )}
                      </p>
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Personalized Recommendations Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
                      Personalized Recommendations
                    </CardTitle>
                    <CardDescription>
                      Based on your assessment data and mood patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-lg mb-3">Your Insights</h3>
                        
                        {assessments.length >= 2 || moodEntries.length >= 2 ? (
                          <div className="space-y-4">
                            {/* Emotional Health Insight */}
                            {assessments.length >= 2 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-blue-100 p-2 h-fit rounded-full">
                                    <Activity className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Emotional Health</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.healthPercentage >= 80 ? 
                                        'Your emotional health is excellent. Continue your effective stress management practices.' :
                                       healthMetrics.healthPercentage >= 60 ? 
                                        'Your emotional health is good. Focus on maintaining consistency in stress management.' :
                                       healthMetrics.healthPercentage >= 40 ? 
                                        'Your emotional health is fair. Consider implementing new stress reduction techniques.' :
                                        'Your emotional health needs attention. Prioritize self-care and stress management.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Stress Trend Insight */}
                            {assessments.length >= 3 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-blue-100 p-2 h-fit rounded-full">
                                    <Brain className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Stress Pattern</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.stressTrend === 'improving' ? 
                                        'Your stress levels are improving. Continue your current practices and build on your success.' :
                                       healthMetrics.stressTrend === 'declining' ?
                                        'Your stress levels have been increasing. Consider new stress management techniques and be gentle with yourself.' :
                                        'Your stress levels have been stable. Consider varying your stress management approaches to see improvement.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Mood Pattern Insight */}
                            {moodEntries.length >= 3 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-purple-100 p-2 h-fit rounded-full">
                                    <HeartPulse className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Mood Pattern</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.moodTrend === 'improving' ? 
                                        'Your mood has been improving consistently. Keep up the good work and note what activities boost your mood.' :
                                       healthMetrics.moodTrend === 'declining' ?
                                        'Your mood has been declining. Try to identify factors that might be affecting you and consider activities that bring you joy.' :
                                        'Your mood has been relatively stable. Consider tracking specific factors that affect your mood to gain more insights.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Consistency Insight */}
                            {(assessments.length >= 2 || moodEntries.length >= 2) && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-green-100 p-2 h-fit rounded-full">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Tracking Consistency</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.consistencyScore >= 70 ? 
                                        'Your tracking consistency is excellent. Regular monitoring helps you stay aware of your emotional health.' :
                                       healthMetrics.consistencyScore >= 40 ?
                                        'Your tracking consistency is good. Try setting reminders to maintain regular check-ins.' :
                                        'Your tracking consistency could improve. Regular check-ins will help you gain better insights into your emotional health.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 border text-center">
                            <p className="text-sm text-slate-600">
                              Complete more assessments to receive personalized insights
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-lg mb-3">Action Plan</h3>
                        {assessments.length >= 2 || moodEntries.length >= 2 ? (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                            <h4 className="font-medium text-blue-700 mb-3">
                              {healthMetrics.healthPercentage >= 80 ? 'Maintain Your Success' :
                               healthMetrics.healthPercentage >= 60 ? 'Build On Your Progress' :
                               healthMetrics.healthPercentage >= 40 ? 'Focus Areas for Improvement' :
                               'Priority Wellness Actions'}
                            </h4>
                            
                            <ul className="space-y-3 text-sm text-slate-700">
                              {/* Personalized recommendations based on health scores */}
                              {healthMetrics.healthPercentage < 60 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Try <b>daily 5-minute breathing exercises</b> to reduce stress levels</span>
                                </li>
                              )}
                              
                              {healthMetrics.moodScore < 6 && moodEntries.length >= 2 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Schedule <b>activities that bring you joy</b> at least twice weekly</span>
                                </li>
                              )}
                              
                              {healthMetrics.consistencyScore < 50 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Set reminders for <b>regular check-ins</b> to track your emotional health</span>
                                </li>
                              )}
                              
                              {/* General recommendations based on trends */}
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>{healthMetrics.stressTrend === 'declining' ? 
                                  <>Prioritize <b>sleep quality</b> and establish a calming bedtime routine</> :
                                  <>Maintain <b>consistent sleep schedule</b> to support emotional health</>}</span>
                              </li>
                              
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>Practice <b>mindfulness</b> for 10 minutes daily to improve awareness</span>
                              </li>
                              
                              {/* Resource recommendations */}
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>Browse our <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => navigate("/resources")}>Resources</Button> for guided meditations and tools</span>
                              </li>
                              
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span className="text-gray-600 mt-4 block">Need personalized guidance? Connect with our <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => navigate("/mood-mentors")}>Mood Mentors</Button> for personalized support</span>
                              </li>
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 border text-center">
                            <p className="text-sm text-slate-600">
                              Complete more assessments to receive a personalized action plan
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <h4 className="font-medium text-blue-700 mb-2 flex items-center">
                            <Sparkles className="w-4 h-4 mr-1" />
                            Additional Resources
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              className="border-blue-200 text-blue-700 hover:bg-blue-100"
                              onClick={() => navigate("/help-groups")}
                            >
                              <Users className="w-3.5 h-3.5 mr-1.5" />
                              Support Groups
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-blue-200 text-blue-700 hover:bg-blue-100"
                              onClick={() => navigate("/journal")}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Journal
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Stress Analytics Tab */}
          <TabsContent value="stress" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="w-5 h-5 text-blue-500 mr-2" />
                      Stress Assessment Analytics
                    </CardTitle>
                    <CardDescription>
                      Detailed analysis of your stress levels and emotional health
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assessments.length >= 2 ? (
                      <>
                        {/* Stress Level chart */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Stress Levels Over Time</h3>
                          <div className="h-[300px] bg-slate-50 rounded-lg p-3 border">
                            <StressProgressChart 
                              assessments={assessments} 
                              moodEntries={[]} // Only show stress data in this view
                            />
                          </div>
                        </div>
                        
                        {/* Health score explanation */}
                        <div className="mt-6">
                          <div className="flex items-center mb-3">
                            <HeartPulse className="h-5 w-5 text-blue-500 mr-2" />
                            <h3 className="text-base font-medium">Emotional Health Score: {healthMetrics.healthPercentage}%</h3>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-4 border">
                            <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1">
                                <div className="flex items-center justify-center">
                                  <div className="relative w-32 h-32">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="10"
                                      />
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke={getProgressColor(healthMetrics.healthPercentage)}
                                        strokeWidth="10"
                                        strokeDasharray={`${2 * Math.PI * 45 * healthMetrics.healthPercentage / 100} ${2 * Math.PI * 45 * (100 - healthMetrics.healthPercentage) / 100}`}
                                        strokeDashoffset={2 * Math.PI * 45 * 0.25}
                                        strokeLinecap="round"
                                        transform="rotate(-90 50 50)"
                                      />
                                      <text
                                        x="50"
                                        y="50"
                                        fontSize="18"
                                        fontWeight="bold"
                                        fill={getHealthColor(healthMetrics.healthPercentage)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        {healthMetrics.healthPercentage}%
                                      </text>
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-center mt-2">
                                  <span className={`font-medium ${getHealthColor(healthMetrics.healthPercentage)}`}>
                                    {healthMetrics.healthPercentage >= 80 ? 'Excellent' :
                                     healthMetrics.healthPercentage >= 60 ? 'Good' :
                                     healthMetrics.healthPercentage >= 40 ? 'Fair' :
                                     healthMetrics.healthPercentage >= 20 ? 'Concerning' : 'Worrying'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="text-sm text-slate-600 mb-1">Current Stress Level: {healthMetrics.stressLevel.toFixed(1)}/10</div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={getProgressColor(100 - healthMetrics.stressLevel * 10)}
                                      style={{ width: `${healthMetrics.stressLevel * 10}%`, height: '100%' }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-slate-600 mb-1">Weekly Average: {healthMetrics.weeklyStressAvg.toFixed(1)}/10</div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={getProgressColor(100 - healthMetrics.weeklyStressAvg * 10)}
                                      style={{ width: `${healthMetrics.weeklyStressAvg * 10}%`, height: '100%' }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-slate-600 mb-1">Assessment Consistency: {healthMetrics.consistencyScore}%</div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-500"
                                      style={{ width: `${healthMetrics.consistencyScore}%`, height: '100%' }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div className="pt-2">
                                  <div className="flex items-center text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400 mr-1.5" />
                                    <span className="text-slate-600">Last assessment: </span>
                                    <span className="font-medium ml-1">
                                      {formatDate(healthMetrics.lastAssessmentDate, "No assessments yet")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent assessments */}
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">Recent Assessments</h3>
                        <div className="space-y-3">
                            {assessments.slice(0, 5).map((assessment) => (
                              <Card key={assessment.id} className="bg-slate-50 border-0">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="text-sm font-medium mb-1">
                                        {format(new Date(assessment.created_at), "MMMM d, yyyy 'at' h:mm a")}
                                      </div>
                                      <div className="text-2xl font-bold mb-2">
                                        {Math.max(0, 100 - (assessment.stress_score * 10))}% Emotional Health
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        Stress level: {assessment.stress_score.toFixed(1)}/10
                                      </div>
                                    </div>
                                    
                                    <div className={`
                                      px-3 py-1 rounded-full text-xs font-medium
                                      ${assessment.stress_score < 3 ? 'bg-green-100 text-green-800' : 
                                        assessment.stress_score < 5 ? 'bg-emerald-100 text-emerald-800' :
                                        assessment.stress_score < 7 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'}
                                    `}>
                                      {assessment.stress_score < 3 ? 'Low Stress' : 
                                       assessment.stress_score < 5 ? 'Moderate' :
                                       assessment.stress_score < 7 ? 'High' : 'Very High'}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {assessments.length > 5 && (
                              <div className="text-center pt-2">
                                <Button
                                  variant="link"
                                  onClick={() => navigate("/patient-dashboard/stress-report")}
                                >
                                  View All Assessments
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Stress Assessment Data</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Complete at least 2 stress assessments to view detailed analytics and track your progress over time.
                        </p>
                        <Button onClick={() => navigate("/patient-dashboard")}>
                          Take Your First Assessment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Understanding your score */}
                <Card>
                  <CardHeader>
                    <CardTitle>Understanding Your Emotional Health Score</CardTitle>
                    <CardDescription>
                      How to interpret your assessment results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Your Emotional Health Score is calculated from your stress assessment responses. 
                      The score represents your overall emotional wellbeing, with higher percentages indicating better emotional health.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-3">
                        <h3 className="font-medium">What your score means:</h3>
                            <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <p className="text-sm"><span className="font-medium">80-100%</span>: Excellent emotional health</p>
                              </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                          <p className="text-sm"><span className="font-medium">60-79%</span>: Good emotional health</p>
                            </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <p className="text-sm"><span className="font-medium">40-59%</span>: Fair emotional health</p>
                          </div>
                            <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <p className="text-sm"><span className="font-medium">20-39%</span>: Concerning emotional health</p>
                              </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <p className="text-sm"><span className="font-medium">0-19%</span>: Worrying emotional health</p>
                            </div>
                          </div>
                      
                      <div className="space-y-3">
                        <h3 className="font-medium">Tips to improve your score:</h3>
                        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
                          <li>Complete the stress assessment regularly to track your progress</li>
                          <li>Practice relaxation techniques like deep breathing and meditation</li>
                          <li>Maintain a consistent sleep schedule</li>
                          <li>Exercise regularly</li>
                          <li>Connect with supportive people</li>
                          <li>Speak with a mental health professional if your score is consistently low</li>
                        </ul>
                      </div>
                        </div>
                      </CardContent>
                    </Card>
              </>
            )}
          </TabsContent>
                    
          {/* Mood Tracking Tab */}
          <TabsContent value="mood" className="space-y-6">
            {isLoading ? (
                    <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <HeartPulse className="w-5 h-5 text-purple-500 mr-2" />
                      Mood Analytics
                    </CardTitle>
                    <CardDescription>
                      Detailed analysis of your mood patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {moodEntries.length >= 2 ? (
                      <>
                        {/* Mood Tracking Chart */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Mood Trends Over Time</h3>
                          <div className="h-[300px] bg-slate-50 rounded-lg p-3 border">
                            <StressProgressChart 
                              assessments={[]} // Only show mood data in this view
                              moodEntries={moodEntries} 
                            />
                          </div>
                        </div>
                        
                        {/* Mood Distribution */}
                        <div className="mt-6">
                          <div className="flex items-center mb-3">
                            <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
                            <h3 className="text-base font-medium">Mood Distribution</h3>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-4 border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="flex-1">
                                {/* Mood score scale visualization */}
                        <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Very Negative (1-2)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score <= 2).length} entries
                                      </span>
                              </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-red-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score <= 2).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Negative (3-4)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 2 && m.mood_score <= 4).length} entries
                                      </span>
                              </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-orange-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 2 && m.mood_score <= 4).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Neutral (5-6)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 4 && m.mood_score <= 6).length} entries
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-yellow-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 4 && m.mood_score <= 6).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Positive (7-8)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 6 && m.mood_score <= 8).length} entries
                                      </span>
                            </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-lime-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 6 && m.mood_score <= 8).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                          </div>
                        </div>
                                  
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Very Positive (9-10)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 8).length} entries
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-green-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 8).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                  </div>
                </div>
                
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="text-sm font-medium mb-2">Mood Metrics</div>
                <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Current Mood:</span>
                                      <span className={`text-sm font-medium ${getMoodColor(healthMetrics.moodScore)}`}>
                                        {healthMetrics.moodScore.toFixed(1)}/10
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Weekly Average:</span>
                                      <span className={`text-sm font-medium ${getMoodColor(healthMetrics.weeklyMoodAvg)}`}>
                                        {healthMetrics.weeklyMoodAvg.toFixed(1)}/10
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Entries in Period:</span>
                                      <span className="text-sm font-medium">
                                        {moodEntries.length} entries
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Trend:</span>
                                      <span className={`text-sm font-medium flex items-center ${moodTrend.color}`}>
                                        {moodTrend.text}
                                        {moodTrend.icon}
                                      </span>
                  </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Last Entry:</span>
                                      <span className="text-sm font-medium">
                                        {formatDate(healthMetrics.lastMoodEntryDate, "No entries")}
                                      </span>
                </div>
                                  </div>
                                </div>
                                
                                <div className="pt-2">
                                  <div className="text-sm font-medium mb-2">Predominant Mood</div>
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        {healthMetrics.moodScore >= 8 ? (
                                          <span className="text-3xl mr-3">😊</span>
                                        ) : healthMetrics.moodScore >= 6 ? (
                                          <span className="text-3xl mr-3">😌</span>
                                        ) : healthMetrics.moodScore >= 4 ? (
                                          <span className="text-3xl mr-3">😐</span>
                                        ) : healthMetrics.moodScore >= 2 ? (
                                          <span className="text-3xl mr-3">😔</span>
                                        ) : (
                                          <span className="text-3xl mr-3">😢</span>
                                        )}
                  <div>
                                          <div className="font-medium">
                                            {healthMetrics.moodScore >= 8 ? 'Happy' : 
                                             healthMetrics.moodScore >= 6 ? 'Content' :
                                             healthMetrics.moodScore >= 4 ? 'Neutral' :
                                             healthMetrics.moodScore >= 2 ? 'Sad' : 'Very Sad'}
                  </div>
                                          <div className="text-xs text-slate-500">
                                            Based on your recent entries
                  </div>
                </div>
                                      </div>
                                      <Badge className={getMoodColor(healthMetrics.moodScore).replace('text-', 'bg-').replace('-600', '-100')}>
                                        <span className={getMoodColor(healthMetrics.moodScore)}>
                                          {healthMetrics.moodScore.toFixed(1)}/10
                                        </span>
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent Mood Entries */}
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">Recent Mood Entries</h3>
                          <div className="space-y-3">
                            {moodEntries.slice(0, 5).map((entry) => (
                              <Card key={entry.id} className="bg-slate-50 border-0">
                                <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                                      <div className="text-sm font-medium mb-1">
                                        {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                          </div>
                                      <div className={`text-2xl font-bold mb-2 ${getMoodColor(entry.mood_score)}`}>
                                        {entry.mood_score.toFixed(1)}/10
                        </div>
                                      {entry.assessment_result && (
                                        <div className="text-sm text-slate-500">
                                          Mood: {entry.assessment_result}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className={`
                                      px-3 py-1 rounded-full text-xs font-medium
                                      ${entry.mood_score >= 8 ? 'bg-green-100 text-green-800' : 
                                        entry.mood_score >= 6 ? 'bg-lime-100 text-lime-800' :
                                        entry.mood_score >= 4 ? 'bg-yellow-100 text-yellow-800' :
                                        entry.mood_score >= 2 ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'}
                                    `}>
                                      {entry.mood_score >= 8 ? 'Very Good' : 
                                       entry.mood_score >= 6 ? 'Good' :
                                       entry.mood_score >= 4 ? 'Neutral' :
                                       entry.mood_score >= 2 ? 'Poor' : 'Very Poor'}
                                    </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                            
                            {moodEntries.length > 5 && (
                              <div className="text-center pt-2">
                                <Button
                                  variant="link"
                                  onClick={() => navigate("/patient-dashboard/mood-tracker")}
                                >
                                  View All Mood Entries
                                </Button>
                </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <HeartPulse className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Mood Data Yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Track your mood regularly to see patterns and insights. Complete at least 2 mood entries to view detailed analytics.
                        </p>
                        <Button onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                          Track Your Mood
                        </Button>
                      </div>
                    )}
              </CardContent>
            </Card>
            
                {/* Understanding Mood Tracking */}
            <Card>
              <CardHeader>
                    <CardTitle>Understanding Mood Tracking</CardTitle>
                    <CardDescription>
                      How mood tracking benefits your emotional health
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Mood tracking helps you understand patterns in your emotional wellbeing and identify factors that affect your mood.
                        Regular tracking provides valuable insights for improving your mental health.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                          <h3 className="font-medium mb-2">Track Patterns</h3>
                          <p className="text-sm text-slate-600">
                            Identify patterns in your mood fluctuations to understand what affects you
                          </p>
                  </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <Activity className="w-4 h-4 text-purple-600" />
                </div>
                          <h3 className="font-medium mb-2">Monitor Progress</h3>
                          <p className="text-sm text-slate-600">
                            Track how your mood changes over time to evaluate your mental health journey
                          </p>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <Sparkles className="w-4 h-4 text-green-600" />
                          </div>
                          <h3 className="font-medium mb-2">Gain Insights</h3>
                          <p className="text-sm text-slate-600">
                            Develop self-awareness about your emotional triggers and resilience factors
                          </p>
                        </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>
          
          {/* Trends & Patterns Tab */}
          <TabsContent value="trends" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 text-blue-500 mr-2" />
                      Combined Health Analysis
                    </CardTitle>
                    <CardDescription>
                      See how your stress levels and mood relate to each other
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assessments.length >= 2 && moodEntries.length >= 2 ? (
                      <>
                        {/* Combined chart showing both metrics */}
                        <div className="h-[350px] bg-slate-50 rounded-lg p-3 border">
                          <StressProgressChart 
                            assessments={assessments} 
                            moodEntries={moodEntries} 
                          />
                        </div>
                        <div className="text-sm text-slate-500 text-center">
                          This chart combines all your emotional health data to help you see relationships between stress and mood
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-5 border mt-6">
                          <h3 className="font-medium text-lg mb-4">Pattern Insights</h3>
                          <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                              <div className="bg-blue-100 p-2 rounded-full">
                                <Brain className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Stress and Mood Relationship</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {healthMetrics.stressTrend === healthMetrics.moodTrend ?
                                    "Your stress and mood patterns are changing in parallel. This suggests your emotional health is strongly connected to your stress levels." :
                                    "Your stress and mood are showing different patterns. This suggests there may be other factors affecting your emotional wellbeing beyond stress."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 items-start">
                              <div className="bg-purple-100 p-2 rounded-full">
                                <HeartPulse className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Emotional Balance</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {healthMetrics.healthPercentage >= 60 && healthMetrics.moodScore >= 6 ?
                                    "Your emotional health and mood scores are both positive, indicating good emotional balance." :
                                   healthMetrics.healthPercentage < 60 && healthMetrics.moodScore < 6 ?
                                    "Both your stress levels and mood scores indicate room for improvement in your emotional balance." :
                                    "There's a disconnect between your stress levels and mood, which may indicate specific factors affecting one area more than the other."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 items-start">
                              <div className="bg-green-100 p-2 rounded-full">
                                <Sparkles className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Recommendations</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  Based on your patterns, we recommend focusing on {healthMetrics.healthPercentage < 60 ? "stress reduction" : "maintaining your stress management practices"} 
                                  and {healthMetrics.moodScore < 6 ? "activities that boost your mood" : "continuing activities that maintain your positive mood"}.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-blue-600 border-blue-200"
                                    onClick={() => navigate("/resources")}
                                  >
                                    View Resources
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-purple-600 border-purple-200"
                                    onClick={() => navigate("/mood-mentors")}
                                  >
                                    Find a Mood Mentor
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {checkInDates.length >= 3 && (
                          <div className="mt-6">
                            <h3 className="font-medium text-lg mb-4">Consistency Tracking</h3>
                            <ErrorBoundary
                              fallback={
                                <div className="text-center p-6 bg-slate-50 rounded-lg border">
                                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                                  <p className="text-slate-600">There was an issue rendering the consistency heatmap.</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-3"
                                    onClick={() => {
                                      // Reset check-in dates and try again
                                      setCheckInDates([]);
                                      fetchData();
                                    }}
                                  >
                                    Refresh Data
                                  </Button>
                                </div>
                              }
                            >
                              <ConsistencyHeatmap 
                                checkInDates={checkInDates}
                                firstCheckInDate={firstCheckInDate && isValid(firstCheckInDate) ? firstCheckInDate : undefined}
                              />
                            </ErrorBoundary>
                            <p className="text-xs text-slate-500 text-center mt-3">
                              This visualization shows your check-in patterns over time, with colored squares representing days you logged data.
                              <br />Longer streaks show darker colors. Try to maintain a daily streak for best results!
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">More Data Needed</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          To see trend patterns and relationships between your stress and mood, you need at least 2 entries of each type.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {assessments.length < 2 && (
                            <Button onClick={() => navigate("/patient-dashboard")}>
                              <Brain className="h-4 w-4 mr-2" />
                              Take Stress Assessment
                            </Button>
                          )}
                          {moodEntries.length < 2 && (
                            <Button variant={assessments.length < 2 ? "outline" : "default"} onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                              <HeartPulse className="h-4 w-4 mr-2" />
                              Track Your Mood
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


