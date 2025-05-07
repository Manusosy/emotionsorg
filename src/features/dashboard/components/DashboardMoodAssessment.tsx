import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Book, Heart, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Import the EmotionButton and QuestionCard components
import EmotionButton from "@/features/mood-tracking/components/EmotionButton";
import QuestionCard from "@/features/mood-tracking/components/QuestionCard";

// Emotion data
const emotions = [{
  name: "Happy",
  icon: "😊",
  color: "hover:shadow-yellow-500/20"
}, {
  name: "Calm",
  icon: "😌",
  color: "hover:shadow-green-500/20"
}, {
  name: "Sad",
  icon: "😢",
  color: "hover:shadow-blue-500/20"
}, {
  name: "Angry",
  icon: "😠",
  color: "hover:shadow-red-500/20"
}, {
  name: "Worried",
  icon: "😰",
  color: "hover:shadow-purple-500/20"
}];

// Assessment questions
const questions = [{
  text: "Are you feeling nervous, anxious, or on edge?",
  options: [{
    text: "Not at all",
    points: 0
  }, {
    text: "I have had this feeling for some 1-2 days",
    points: 1
  }, {
    text: "I have had this feeling for 3-4 days",
    points: 2
  }, {
    text: "I have had this feeling for 4-5 days",
    points: 3
  }]
}, {
  text: "Do you struggle to control your worries?",
  options: [{
    text: "Not at all",
    points: 0
  }, {
    text: "I have been struggling for some 1-2 days",
    points: 1
  }, {
    text: "I have been struggling for 3-4 days",
    points: 2
  }, {
    text: "I have been struggling for 4-5 days",
    points: 3
  }]
}];

const DashboardMoodAssessment = () => {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Flag to indicate if we're in test mode (no actual DB connections)
  const isTestMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY;

  // Function to map emotion and score to a mood_score on a scale of 1-10
  const getMoodScore = (emotion: string | null, score: number): number => {
    // Maximum possible score from questions (2 questions x max 3 points each)
    const MAX_ASSESSMENT_SCORE = 6;
    
    // Base score from emotion type (on a scale of 1-10)
    let baseScore = 5; // Neutral default
    
    switch (emotion?.toLowerCase()) {
      case 'happy':
        baseScore = 8;
        break;
      case 'calm':
        baseScore = 7;
        break;
      case 'sad':
        baseScore = 3;
        break;
      case 'angry':
        baseScore = 2;
        break;
      case 'worried':
        baseScore = 4;
        break;
    }
    
    // Convert assessment score to a factor between 0 and 1
    // Higher assessment score = more negative emotional state
    const scoreFactor = score / MAX_ASSESSMENT_SCORE;
    
    // For happy/calm emotions: higher assessment score reduces base score
    // For sad/angry/worried emotions: higher assessment score increases their intensity
    let adjustedScore;
    if (baseScore >= 5) {
      // Happy/calm emotions get reduced by negative assessment
      adjustedScore = baseScore - (scoreFactor * 3);
    } else {
      // Negative emotions get intensified by negative assessment
      adjustedScore = baseScore - (scoreFactor * 1);
    }
    
    // Ensure score is between 1-10
    return Math.max(1, Math.min(10, Math.round(adjustedScore)));
  };

  // Function to get mood result based on score
  const getMoodResult = (emotion: string | null): string => {
    if (!emotion) return "Neutral";
    
    switch (emotion.toLowerCase()) {
      case 'happy':
        return "Happy";
      case 'calm':
        return "Calm";
      case 'sad':
        return "Sad";
      case 'angry':
        return "Angry";
      case 'worried':
        return "Worried";
      default:
        return "Neutral";
    }
  };

  // Effect to save result when assessment is completed by logged-in user
  useEffect(() => {
    const saveMoodEntry = async () => {
      if ((isAuthenticated && user && showResults && !resultSaved) || (isTestMode && showResults && !resultSaved)) {
        try {
          console.log("Attempting to save mood entry...", { 
            userId: user?.id || 'test_user', 
            emotion: selectedEmotion, 
            score: score 
          });
          
          const moodScore = getMoodScore(selectedEmotion, score);
          const moodResult = getMoodResult(selectedEmotion);
          
          if (isTestMode) {
            // Test mode implementation - use sessionStorage
            try {
              const now = new Date();
              const entryId = `mood_${Date.now()}`;
              
              // Create the mood entry object
              const moodEntry = {
                id: entryId,
                user_id: user?.id || 'test_user',
                mood_score: moodScore,
                assessment_result: moodResult,
                notes: `Assessment score: ${score}, Selected emotion: ${selectedEmotion}`,
                created_at: now.toISOString()
              };
              
              // Get existing entries or create new array
              const existingEntriesStr = sessionStorage.getItem('test_mood_entries');
              const moodEntries = existingEntriesStr ? JSON.parse(existingEntriesStr) : [];
              
              // Add new entry
              moodEntries.push(moodEntry);
              
              // Save back to session storage
              sessionStorage.setItem('test_mood_entries', JSON.stringify(moodEntries));
              
              // Dispatch custom event so other components can respond
              const eventData = {
                moodScore: moodScore,
                assessmentResult: moodResult,
                timestamp: now.toISOString()
              };
              
              const event = new CustomEvent('mood-assessment-completed', { 
                detail: eventData 
              });
              window.dispatchEvent(event);
              
              console.log("Test mode: Mood entry saved to session storage");
              setResultSaved(true);
              toast.success("Mood assessment saved");
            } catch (storageError) {
              console.error("Error saving to session storage:", storageError);
              // Don't show error to user in test mode
              setResultSaved(true); // Mark as saved anyway to avoid repeated errors
            }
          } else {
            // Real database implementation
            // Add retry logic for better resilience
            let retryCount = 0;
            let saveSuccessful = false;
            
            while (retryCount < 3 && !saveSuccessful) {
              try {
                const result = await dataService.addMoodEntry({
                  userId: user.id,
                  mood: moodScore,
                  notes: `Assessment score: ${score}, Selected emotion: ${selectedEmotion}`
                });
                
                saveSuccessful = true;
              } catch (innerError) {
                retryCount++;
                if (retryCount >= 3) throw innerError;
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            setResultSaved(true);
            toast.success("Mood assessment saved");
          }
        } catch (error) {
          console.error("Error saving mood entry:", error);
          // Only show error toast if not in test mode
          if (!isTestMode) {
            toast.error("Failed to save assessment. Please try again.");
          } else {
            // In test mode, we'll consider it as "saved" to avoid disrupting the user experience
            setResultSaved(true);
            toast.success("Mood assessment saved (Test Mode)");
          }
        }
      }
    };

    saveMoodEntry();
  }, [showResults, isAuthenticated, user, selectedEmotion, score, resultSaved, isTestMode]);

  const handleEmotionSelect = (emotion: string) => {
    if (selectedEmotion === emotion) {
      setShowQuestions(true);
    } else {
      setSelectedEmotion(emotion);
    }
  };

  const handleClickOutside = () => {
    setSelectedEmotion(null);
  };

  const handleAnswerSelect = (points: number) => {
    setScore(prev => prev + points);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const resetAll = () => {
    setSelectedEmotion(null);
    setShowQuestions(false);
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
    setResultSaved(false);
  };

  // Dashboard-specific navigation functions
  const navigateToJournal = () => {
    navigate("/patient-dashboard/journal");
  };

  const navigateToResources = () => {
    navigate("/patient-dashboard/resources");
  };

  const navigateToMoodMentors = () => {
    navigate("/mood-mentors");
  };

  const navigateToHelpGroups = () => {
    navigate("/help-groups");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-visible">
      <div className="p-6 pt-4">
        <div className="text-center space-y-4 mb-2">
          <h2 className="text-2xl font-bold text-[#001A41] leading-tight">
            How Are You Feeling <span className="text-[#007BFF]">Right Now?</span>
          </h2>
          <p className="text-sm text-gray-600">
            Select your current mood by clicking one of the emojis below
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!showQuestions && !showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-4"
            >
              <div className="grid grid-cols-5 gap-3">
                {emotions.map(emotion => (
                  <EmotionButton
                    key={emotion.name}
                    emotion={emotion}
                    selected={selectedEmotion === emotion.name}
                    onClick={() => handleEmotionSelect(emotion.name)}
                    onClickOutside={handleClickOutside}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {showQuestions && !showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-4"
            >
              <QuestionCard
                question={questions[currentQuestion].text}
                options={questions[currentQuestion].options.map(option => option.text)}
                onNext={(index) => handleAnswerSelect(questions[currentQuestion].options[index].points)}
                questionNumber={currentQuestion + 1}
                totalQuestions={questions.length}
              />
            </motion.div>
          )}

          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-2"
            >
              {score <= 3 ? (
                <div className="space-y-4">
                  <div className="py-3 px-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="text-green-800 font-medium text-sm">
                      You're doing great! Your assessment indicates minimal mental health concerns.
                    </p>
                  </div>
                  
                  <p className="text-gray-700 text-sm">
                    It appears you're managing your emotions well. Journaling can help maintain this positive state.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center mb-2">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                          <FileText className="h-4 w-4 text-[#20C0F3]" />
                        </div>
                        <h3 className="font-medium text-gray-800">Journal Your Feelings</h3>
                      </div>
                      <p className="text-gray-600 text-xs mb-3">
                        Document your thoughts and emotions to track patterns over time.
                      </p>
                      <Button 
                        onClick={navigateToJournal} 
                        className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white shadow-sm hover:shadow transition-all"
                        size="sm"
                      >
                        Go to Journal
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center mb-2">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                          <Book className="h-4 w-4 text-[#20C0F3]" />
                        </div>
                        <h3 className="font-medium text-gray-800">Explore Resources</h3>
                      </div>
                      <p className="text-gray-600 text-xs mb-3">
                        Read articles and explore tools to maintain your positive mental state.
                      </p>
                      <Button 
                        onClick={navigateToResources} 
                        variant="outline" 
                        className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                        size="sm"
                      >
                        View Resources
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-2">
                    <Button variant="ghost" onClick={resetAll} size="sm">
                      Start Over
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="py-3 px-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                    <p className="text-amber-800 font-medium text-sm">
                      Your assessment indicates some emotional concerns that deserve attention.
                    </p>
                  </div>
                  
                  <p className="text-gray-700 text-sm">
                    Consider some of these resources designed to help you process and understand your feelings.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center mb-2">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                          <Users className="h-4 w-4 text-[#20C0F3]" />
                        </div>
                        <h3 className="font-medium text-gray-800">Join Support Groups</h3>
                      </div>
                      <p className="text-gray-600 text-xs mb-3">
                        Connect with others who understand what you're going through.
                      </p>
                      <Button 
                        onClick={navigateToHelpGroups} 
                        className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white shadow-sm hover:shadow transition-all"
                        size="sm"
                      >
                        Find Groups
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center mb-2">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                          <Heart className="h-4 w-4 text-[#20C0F3]" />
                        </div>
                        <h3 className="font-medium text-gray-800">Mood Mentors</h3>
                      </div>
                      <p className="text-gray-600 text-xs mb-3">
                        Our licensed professionals can provide guidance and support for your challenges.
                      </p>
                      <Button 
                        onClick={navigateToMoodMentors} 
                        variant="outline" 
                        className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                        size="sm"
                      >
                        Connect Now
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-2">
                    <Button variant="ghost" onClick={resetAll} size="sm">
                      Start Over
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardMoodAssessment; 


