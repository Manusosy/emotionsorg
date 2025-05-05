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
      if (isAuthenticated && user && showResults && !resultSaved) {
        try {
          console.log("Attempting to save mood entry...", { 
            userId: user.id, 
            emotion: selectedEmotion, 
            score: score 
          });
          
          const moodScore = getMoodScore(selectedEmotion, score);
          const moodResult = getMoodResult(selectedEmotion);
          
          // Add retry logic for better resilience
          let retryCount = 0;
          let saveSuccessful = false;
          
          while (retryCount < 3 && !saveSuccessful) {
            try {
              const result = await dataService.saveMoodEntry({
                user_id: user.id,
                mood_score: moodScore,
                assessment_result: moodResult,
                notes: `Assessment score: ${score}, Selected emotion: ${selectedEmotion}`
              });
              
              if (result.error) {
                console.error(`Error saving mood entry (attempt ${retryCount + 1}):`, result.error);
                throw result.error;
              }
              
              console.log("Mood entry saved successfully:", result.data);
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
        } catch (error) {
          console.error("Error saving mood entry:", error);
          toast.error("Failed to save assessment. Please try again.");
        }
      }
    };

    saveMoodEntry();
  }, [showResults, isAuthenticated, user, selectedEmotion, score, resultSaved]);

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
          {!showQuestions && (
            <div className="flex justify-center mt-2">
              <div className="grid grid-cols-5 gap-4 max-w-3xl w-full">
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
            </div>
          )}

          {showQuestions && !showResults && (
            <QuestionCard
              question={questions[currentQuestion].text}
              options={questions[currentQuestion].options.map(option => option.text)}
              onNext={(index) => handleAnswerSelect(questions[currentQuestion].options[index].points)}
              questionNumber={currentQuestion + 1}
              totalQuestions={questions.length}
            />
          )}

          {showResults && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="p-6 rounded-xl bg-white shadow-sm border border-[#20C0F3]/20">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#0078FF] to-[#20C0F3] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <h2 className="text-lg font-bold text-center bg-gradient-to-r from-[#0078FF] via-[#20C0F3] to-[#00D2FF] bg-clip-text text-transparent mb-3">
                  Your Assessment Results
                </h2>
                
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
                          Discover articles and tools to enhance your mental wellbeing.
                        </p>
                        <Button 
                          onClick={navigateToResources} 
                          variant="outline" 
                          className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                          size="sm"
                        >
                          Browse Resources
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="py-3 px-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                      <p className="text-amber-800 font-medium text-sm">
                        Your assessment indicates you may be experiencing some mental health challenges.
                      </p>
                    </div>
                    
                    <p className="text-gray-700 text-sm">
                      It's important to address these feelings. Consider connecting with a mood mentor.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center mb-2">
                          <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                            <Users className="h-4 w-4 text-[#20C0F3]" />
                          </div>
                          <h3 className="font-medium text-gray-800 text-sm">Talk to a Mood Mentor</h3>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">
                          Connect with a trusted mood mentor for support.
                        </p>
                        <Button 
                          onClick={navigateToMoodMentors} 
                          className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white shadow-sm hover:shadow transition-all"
                          size="sm"
                        >
                          Find a Mood Mentor
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center mb-2">
                          <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                            <FileText className="h-4 w-4 text-[#20C0F3]" />
                          </div>
                          <h3 className="font-medium text-gray-800 text-sm">Journal Your Feelings</h3>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">
                          Express and process your emotions through guided journaling.
                        </p>
                        <Button 
                          onClick={navigateToJournal} 
                          variant="outline" 
                          className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                          size="sm"
                        >
                          Go to Journal
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center mb-2">
                          <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-2">
                            <Heart className="h-4 w-4 text-[#20C0F3]" />
                          </div>
                          <h3 className="font-medium text-gray-800 text-sm">Join Support Groups</h3>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">
                          Connect with others who share similar experiences in a supportive environment.
                        </p>
                        <Button 
                          onClick={navigateToHelpGroups}
                          className="w-full bg-[#0078FF]/10 hover:bg-[#0078FF]/20 text-[#0078FF] font-medium"
                          size="sm"
                        >
                          Explore Support Groups
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button
                  onClick={resetAll}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Start Over
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardMoodAssessment; 


