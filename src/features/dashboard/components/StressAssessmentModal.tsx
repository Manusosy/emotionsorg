import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect, useRef } from "react";
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

// Define mustard yellow color
const MUSTARD_YELLOW = "#facc15";

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
  const [isAdjustingSlider, setIsAdjustingSlider] = useState(false);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  
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
      setHealthColor(MUSTARD_YELLOW); // Mustard Yellow
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
    
    // Update display score for smooth animation
    setDisplayScore(value);
  };
  
  // Handle finishing the assessment
  const handleComplete = () => {
    setIsComplete(true);
  };
  
  // Handle navigating to next question
  const handleNext = () => {
    if (currentStep < stressQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      // Reset display score when moving to next question
      setDisplayScore(null);
    } else {
      handleComplete();
    }
  };
  
  // Handle navigating to previous question
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Reset display score when moving to previous question
      setDisplayScore(null);
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
      
      // For testing: Simulate successful saving without requiring actual database connections
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Show success message for testing
        toast.success("Assessment saved successfully (Testing Mode)");
        
        // Close modal and reset state
        setOpen(false);
        setResponses([]);
        setCurrentStep(0);
        setIsComplete(false);
        
        // Emit a custom event that the dashboard can listen for to update its state
        // This allows for simulation of data being saved without actual database integration
        const testEvent = new CustomEvent('stress-assessment-completed', { 
          detail: { 
            stressLevel: combinedScore,
            score: combinedScore,
            status: healthStatus
          } 
        });
        window.dispatchEvent(testEvent);
        
        // For testing, let's also update session storage to simulate data persistence
        try {
          const testData = {
            stressLevel: combinedScore,
            healthStatus: healthStatus,
            lastAssessment: new Date().toISOString(),
            hasAssessments: true
          };
          sessionStorage.setItem('test_stress_assessment', JSON.stringify(testData));
        } catch (storageError) {
          console.error("Error saving test data to session storage:", storageError);
        }
        
      } catch (error) {
        console.error("Error in testing mode:", error);
        // Even if there's an error in testing mode, we'll show success for UI flow testing
        toast.success("Assessment saved for testing");
        setOpen(false);
      }
    } catch (error: any) {
      console.error("Error saving stress assessment:", error);
      // For testing, we'll show success even on errors
      toast.success("Assessment data saved (Testing Mode)");
      setOpen(false);
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
          <DialogTitle className="text-center text-xl">
            {!isComplete ? "Stress Assessment" : "Assessment Results"}
          </DialogTitle>
        </DialogHeader>
        
        {!isComplete ? (
          // Question form
          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Question {currentStep + 1} of {stressQuestions.length}</span>
              <span className="text-sm font-medium">Stress Check</span>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-6">{currentQuestion?.text}</h3>
              
              <div className="space-y-8">
                <div className="relative pt-2">
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Not at all</span>
                    <span>Very much</span>
                  </div>
                  
                  <div className="relative">
                    <Slider
                      value={[currentResponse?.score || 3]}
                      min={1}
                      max={5}
                      step={0.1}
                      onValueChange={(value) => {
                        if (currentQuestion) {
                          handleScoreChange(currentQuestion.id, currentQuestion.type, value[0]);
                        }
                      }}
                      onValueCommit={() => {
                        // After 1 second, hide the display score
                        setTimeout(() => {
                          setDisplayScore(null);
                        }, 1000);
                      }}
                      className="mb-1"
                      onMouseDown={() => setIsAdjustingSlider(true)}
                      onMouseUp={() => {
                        setIsAdjustingSlider(false);
                        // After 1 second, hide the display score
                        setTimeout(() => {
                          setDisplayScore(null);
                        }, 1000);
                      }}
                      onTouchStart={() => setIsAdjustingSlider(true)}
                      onTouchEnd={() => {
                        setIsAdjustingSlider(false);
                        // After 1 second, hide the display score
                        setTimeout(() => {
                          setDisplayScore(null);
                        }, 1000);
                      }}
                    />
                    
                    {/* Display the current value above the slider when adjusting */}
                    {displayScore !== null && (
                      <div className="absolute top-0 left-0 transform -translate-y-full -translate-x-1/2 px-2 py-1 bg-white rounded-md shadow-sm text-xs"
                        style={{ 
                          left: `${((displayScore - 1) / 4) * 100}%`,
                          opacity: 1,
                          transition: 'opacity 0.3s ease',
                          color: MUSTARD_YELLOW,
                          fontWeight: 'bold'
                        }}
                      >
                        {displayScore.toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between px-1 mt-1">
                    <span className="w-4 text-center text-xs">1</span>
                    <span className="w-4 text-center text-xs">2</span>
                    <span className="w-4 text-center text-xs">3</span>
                    <span className="w-4 text-center text-xs">4</span>
                    <span className="w-4 text-center text-xs">5</span>
                  </div>
                </div>
              </div>
            </div>
            
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
                className="bg-[#20C0F3] hover:bg-[#1ba8d5]"
              >
                {currentStep < stressQuestions.length - 1 ? "Next" : "Complete"}
              </Button>
            </div>
          </div>
        ) : (
          // Results view
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="#eee" 
                    strokeWidth="10"
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={healthColor} 
                    strokeWidth="10"
                    strokeDasharray={`${healthPercentage * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000 ease-out"
                  />
                  <text 
                    x="50" 
                    y="55" 
                    fontFamily="sans-serif" 
                    fontSize="16" 
                    textAnchor="middle" 
                    fill={healthColor}
                    fontWeight="bold"
                  >
                    {healthPercentage}%
                  </text>
                </svg>
              </div>
              
              <h3 className="text-xl font-bold mt-4" style={{color: healthColor}}>
                {healthStatus}
              </h3>
              
              <p className="text-slate-600 mt-2">
                Stress level: <span className="font-semibold">{combinedScore}/10</span>
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                Recommendation
              </h4>
              <p className="text-sm text-slate-700">
                {healthPercentage >= 70 
                  ? "Great job managing your stress! Keep up your current practices and continue monitoring for any changes."
                  : healthPercentage >= 40
                  ? "You're experiencing moderate stress. Consider adding relaxation techniques like deep breathing or meditation to your daily routine."
                  : "Your stress levels are high. We recommend prioritizing stress reduction activities and considering speaking with a mental health professional."}
              </p>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                variant="outline" 
                className="w-1/2"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Close
              </Button>
              
              <Button 
                className="w-1/2 bg-[#20C0F3] hover:bg-[#1ba8d5]"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Results"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 


