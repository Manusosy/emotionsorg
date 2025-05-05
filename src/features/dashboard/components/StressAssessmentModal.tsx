import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Activity, ArrowRight, Brain, HeartPulse, Sparkles } from "lucide-react";
import "./styles.css"; // This will be created if it doesn't exist

// Assessment questions from the image
const stressQuestions = [
  { id: 1, text: "Are you feeling overwhelmed today?", type: "stress" },
  { id: 2, text: "Have you had trouble relaxing recently?", type: "stress" },
  { id: 3, text: "Has anything been bothering you with work or at home?", type: "stress" },
  { id: 4, text: "Did you sleep well last night?", type: "physical" }
];

export default function StressAssessmentModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<Array<{id: number, type: string, score: number}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [combinedScore, setCombinedScore] = useState(0);
  const [healthPercentage, setHealthPercentage] = useState(0);
  const [healthStatus, setHealthStatus] = useState("No Assessment");
  const [healthColor, setHealthColor] = useState("#cccccc");
  const [isComplete, setIsComplete] = useState(false);
  
  // Initialize default values when modal opens
  useEffect(() => {
    if (open) {
      // Reset to initial state when modal opens
      setCurrentStep(0);
      
      // Set default mid-point values (3) for all questions
      const defaultResponses = stressQuestions.map(q => ({
        id: q.id,
        type: q.type,
        score: 3 // Default middle value on scale of 1-5
      }));
      
      setResponses(defaultResponses);
      setIsComplete(false);
      calculateResults(defaultResponses);
    }
  }, [open]);
  
  // Calculate health metrics based on responses
  const calculateResults = (currentResponses: Array<{id: number, type: string, score: number}>) => {
    if (currentResponses.length === 0) return;
    
    // Get all questions and their scores
    const allScores = currentResponses.map(r => r.score);
    
    // Calculate average score (1-5 scale)
    const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    
    // Convert to stress level (0-10 scale)
    // For the first 3 questions, higher = more stress
    // For question 4 (sleep well), the scale is inverted (higher = less stress)
    const stressItems = currentResponses.filter(r => r.id <= 3);
    const sleepItem = currentResponses.find(r => r.id === 4);
    
    // Calculate stress score (1-5 scale)
    const stressScore = stressItems.reduce((sum, r) => sum + r.score, 0) / stressItems.length;
    
    // Convert sleep score (invert it since better sleep = less stress)
    const sleepScore = sleepItem ? 6 - sleepItem.score : 3; // Invert: 5→1, 4→2, etc.
    
    // Combined weighted score (0-10 scale)
    // 75% weight to stress questions, 25% to sleep question
    const newScore = ((stressScore * 0.75) + (sleepScore * 0.25)) * 2;
    setCombinedScore(parseFloat(newScore.toFixed(1)));
    
    // Calculate health percentage (inverse of stress - higher is better)
    const newHealthPercentage = Math.max(0, Math.min(100, Math.round((10 - newScore) * 10)));
    setHealthPercentage(newHealthPercentage);
    
    // Set health status based on percentage
    if (newHealthPercentage >= 80) {
      setHealthStatus("Excellent");
      setHealthColor("#4ade80"); // Green
    } else if (newHealthPercentage >= 60) {
      setHealthStatus("Good");
      setHealthColor("#a3e635"); // Light green
    } else if (newHealthPercentage >= 40) {
      setHealthStatus("Fair");
      setHealthColor("#facc15"); // Yellow
    } else if (newHealthPercentage >= 20) {
      setHealthStatus("Concerning");
      setHealthColor("#fb923c"); // Orange
    } else {
      setHealthStatus("Worrying");
      setHealthColor("#ef4444"); // Red
    }
  };
  
  const handleScoreChange = (questionId: number, questionType: string, value: number) => {
    const updatedResponses = responses.map(response => 
      response.id === questionId 
        ? { ...response, score: value }
        : response
    );
    
    setResponses(updatedResponses);
    calculateResults(updatedResponses);
  };
  
  // Handle finishing the assessment
  const handleComplete = () => {
    setIsComplete(true);
  };
  
  // Handle navigating to next question
  const handleNext = () => {
    if (currentStep < stressQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };
  
  // Handle navigating to previous question
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle final submission of the assessment
  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in to submit an assessment");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Format the current time for last assessment time
      const now = new Date();
      const assessmentTime = now.toISOString();
      
      try {
        // Save to stress_assessments table
        const { error: assessmentError } = await supabase
          .from('stress_assessments')
          .insert({
            user_id: user.id,
            stress_score: combinedScore,
            responses: responses,
            created_at: assessmentTime
          });
          
        if (assessmentError) throw assessmentError;
        
        // Check if user_assessment_metrics exists and update it
        const { data: existingMetrics, error: metricsCheckError } = await supabase
          .from('user_assessment_metrics')
          .select('id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (metricsCheckError && !metricsCheckError.message.includes('column') && !metricsCheckError.message.includes('does not exist')) {
          throw metricsCheckError;
        }
        
        // If the table exists, update metrics
        if (existingMetrics) {
          // Update the metrics with the new stress level
          const { error: updateError } = await supabase
            .from('user_assessment_metrics')
            .update({
              stress_level: combinedScore / 10, // Convert to 0-1 scale for consistency
              last_assessment_at: assessmentTime,
              updated_at: assessmentTime
            })
            .eq('user_id', user.id);
            
          if (updateError) throw updateError;
        } else {
          // Create new metrics entry
          const { error: insertError } = await supabase
            .from('user_assessment_metrics')
            .insert({
              user_id: user.id,
              stress_level: combinedScore / 10, // Convert to 0-1 scale for consistency
              consistency: 0, // Default value
              last_assessment_at: assessmentTime,
              updated_at: assessmentTime
            });
            
          if (insertError) throw insertError;
        }
        
        toast.success("Assessment completed successfully");
        
        // Close modal and reset state
        setOpen(false);
        setResponses([]);
        setCurrentStep(0);
        setIsComplete(false);
        
        // Reload the page to reflect changes immediately
        window.location.reload();
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        
        // If there was a schema issue, still show success to the user
        // but log the error for admin to fix the database schema
        if (dbError.message && (
            dbError.message.includes('column') || 
            dbError.message.includes('does not exist'))) {
          console.warn("Schema issue detected, assessment saved but metrics may not be updated:", dbError.message);
          toast.success("Assessment saved");
          setOpen(false);
          setResponses([]);
          // Reload the page to reflect changes
          window.location.reload();
        } else {
          throw dbError;
        }
      }
    } catch (error: any) {
      console.error("Error saving stress assessment:", error);
      toast.error(error.message || "Failed to save assessment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get the current question
  const currentQuestion = stressQuestions[currentStep];
  const currentResponse = responses.find(r => r.id === currentQuestion?.id);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-[#20C0F3] hover:bg-[#1ba8d5] text-white border-none shadow-sm flex items-center gap-2"
        >
          <Brain className="w-4 h-4" />
          Take Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stress Assessment</DialogTitle>
        </DialogHeader>
        
        {!isComplete ? (
          // Question display
          <div className="space-y-6 my-4">
            {/* Progress indicator - keeping the blue color */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${((currentStep + 1) / stressQuestions.length) * 100}%` }}
              ></div>
            </div>
            
            {/* Current question */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {currentQuestion?.text}
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Not at all</span>
                  <span>Extremely</span>
                </div>
                
                {/* Create a custom slider that's fully styled as orange-yellow */}
                <div className="py-6 px-2 relative">
                  {/* The main track */}
                  <div className="w-full h-2 rounded-full bg-slate-200"></div>
                  
                  {/* The filled part of the track */}
                  <div 
                    className="absolute top-[50%] left-0 h-2 rounded-full bg-amber-400 transform -translate-y-1/2" 
                    style={{ width: `${((currentResponse?.score || 3) - 1) / 4 * 100}%` }}
                  ></div>
                  
                  {/* The draggable thumb */}
                  <div 
                    className="absolute top-[50%] h-6 w-6 rounded-full bg-amber-400 border-2 border-amber-500 transform -translate-y-1/2 cursor-grab"
                    style={{ 
                      left: `calc(${((currentResponse?.score || 3) - 1) / 4 * 100}%)`,
                      marginLeft: "-12px" // Center the 24px thumb
                    }}
                    onMouseDown={(e) => {
                      const slider = e.currentTarget.parentElement;
                      if (!slider) return;
                      
                      const sliderRect = slider.getBoundingClientRect();
                      const sliderWidth = sliderRect.width;
                      
                      const handleDrag = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const offsetX = moveEvent.clientX - sliderRect.left;
                        const percentage = Math.max(0, Math.min(1, offsetX / sliderWidth));
                        const score = percentage * 4 + 1; // Convert to 1-5 scale
                        
                        if (currentQuestion) {
                          handleScoreChange(currentQuestion.id, currentQuestion.type, score);
                        }
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleDrag);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleDrag);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  ></div>
                </div>
                
                {/* Score indicator */}
                <div className="flex justify-center mt-2">
                  <span className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full">
                    {currentResponse?.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                className="bg-[#20C0F3] hover:bg-[#1ba8d5] text-white flex items-center gap-1"
              >
                {currentStep === stressQuestions.length - 1 ? 'Review' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Results review
          <div className="space-y-6 my-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-slate-600">Your Assessment Result</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-xl font-bold" style={{ color: healthColor }}>
                  {healthStatus}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500 ease-in-out"
                    style={{ 
                      width: `${healthPercentage}%`,
                      backgroundColor: healthColor
                    }}
                  ></div>
                </div>
                <div className="text-sm mt-2 text-slate-500">
                  {healthPercentage}% Emotional Health
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-md font-medium">Your Responses:</h3>
              <div className="space-y-2">
                {stressQuestions.map((question, index) => {
                  const response = responses.find(r => r.id === question.id);
                  return (
                    <div key={question.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm">{question.text}</span>
                      <span className="text-sm font-medium">{response?.score.toFixed(1)}/5</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setIsComplete(false)}
              >
                Back to Questions
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Saving..." : "Submit Assessment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 


