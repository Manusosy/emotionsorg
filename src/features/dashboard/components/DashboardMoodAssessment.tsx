import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/authContext';
import { dataService } from '@/services';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AnimatePresence, motion } from "framer-motion";
import EmotionButton from "@/features/mood-tracking/components/EmotionButton";
import QuestionCard from "@/features/mood-tracking/components/QuestionCard";
import { ArrowRight, Book, Heart, LifeBuoy, FileText, Users } from 'lucide-react';

// Emotion data
const emotions = [{
  name: "Happy",
  icon: "😊",
  color: "hover:shadow-yellow-500/20",
  type: "happy"
}, {
  name: "Calm",
  icon: "😌",
  color: "hover:shadow-green-500/20",
  type: "calm"
}, {
  name: "Sad",
  icon: "😢",
  color: "hover:shadow-blue-500/20",
  type: "sad"
}, {
  name: "Angry",
  icon: "😠",
  color: "hover:shadow-red-500/20",
  type: "angry"
}, {
  name: "Worried",
  icon: "😰",
  color: "hover:shadow-purple-500/20",
  type: "worried"
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
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const saveMoodEntry = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save your assessment');
      setIsSaving(false);
      return;
    }

    if (!selectedEmotion) {
      toast.error('Please select an emotion before saving');
      setIsSaving(false);
      return;
    }

    try {
      setIsSaving(true);
      
      // Find the emotion data
      const selectedEmotionData = emotions.find(e => e.name === selectedEmotion);
      if (!selectedEmotionData) {
        throw new Error("Selected emotion data not found");
      }

      // Calculate mood score
      const moodScore = getMoodScore(selectedEmotion, score);
      
      // Prepare save data
      const saveData = {
        user_id: user.id,
        mood: moodScore,
        mood_type: selectedEmotionData.type as 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral',
        assessment_result: selectedEmotion,
        assessment_score: score,
        notes: `Assessment score: ${score}`,
        tags: [
          selectedEmotionData.type,
          score >= 4 ? 'high-concern' : 
          score >= 2 ? 'moderate-concern' : 'low-concern'
        ],
        activities: ['emotion-check', 'quick-assessment']
      };
      
      // Save to database with timeout
      const savePromise = dataService.addMoodEntry(saveData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      toast.success("Mood assessment saved successfully!");
      
      // Store in sessionStorage for components that might load later
      sessionStorage.setItem('last_mood_assessment', JSON.stringify({
        moodScore,
        moodType: selectedEmotionData.type,
        timestamp: new Date().toISOString(),
        saved: true,
        saveTime: new Date().toISOString()
      }));

      // Reset the form after successful save
      resetAll();

    } catch (error) {
      console.error('Error saving mood assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save assessment';
      toast.error(`Error saving assessment: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

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
  };

  const navigateToJournal = () => {
    navigate("/journal");
  };

  const navigateToResources = () => {
    navigate("/resources");
  };

  const navigateToMoodMentors = () => {
    navigate("/mood-mentors");
  };

  const navigateToHelpGroups = () => {
    navigate("/help-groups");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">How are you feeling?</h2>
      
      <AnimatePresence mode="wait">
        {!showQuestions && (
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
            className="space-y-6"
          >
            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#20C0F3]/20">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-[#0078FF] to-[#20C0F3] rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 mr-4">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-[#0078FF] via-[#20C0F3] to-[#00D2FF] bg-clip-text text-transparent">
                  Assessment Results
                </h3>
              </div>

              {score <= 3 ? (
                <div className="space-y-4">
                  <div className="py-2 px-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="text-green-800 text-sm font-medium">
                      You're doing great! Your assessment indicates minimal mental health concerns.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={navigateToJournal} 
                      className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white text-sm"
                    >
                      Journal Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={navigateToResources} 
                      variant="outline" 
                      className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF] text-sm"
                    >
                      View Resources
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="py-2 px-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                    <p className="text-amber-800 text-sm font-medium">
                      Your assessment indicates you may be experiencing some mental health challenges.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={navigateToMoodMentors} 
                      className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white text-sm"
                    >
                      Talk to Mentor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={navigateToHelpGroups}
                      className="w-full bg-[#0078FF]/10 hover:bg-[#0078FF]/20 text-[#0078FF] text-sm"
                    >
                      Join Groups
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={saveMoodEntry}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white"
              >
                {isSaving ? 'Saving...' : 'Save Assessment'}
              </Button>
              
              <Button
                onClick={resetAll}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Start Over
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMoodAssessment; 