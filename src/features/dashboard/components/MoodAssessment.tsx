import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Smile, Meh, Frown, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Assessment question types for stress level calculation
type AssessmentQuestion = {
  id: number;
  text: string;
  type: string; // 'stress', 'anxiety', etc.
};

type AssessmentResponse = {
  question_id: number;
  question_type: string;
  score: number;
};

export default function MoodAssessment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moodScore, setMoodScore] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createJournalEntry, setCreateJournalEntry] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentResponses, setAssessmentResponses] = useState<AssessmentResponse[]>([]);

  // Sample stress assessment questions
  const stressQuestions: AssessmentQuestion[] = [
    { id: 1, text: "How stressed have you felt today?", type: "stress" },
    { id: 2, text: "How difficult was it to relax today?", type: "stress" },
    { id: 3, text: "How worried have you been about upcoming events?", type: "anxiety" },
    { id: 4, text: "How well did you sleep last night?", type: "stress" }
  ];

  const getMoodResult = (score: number): string => {
    if (score >= 8) return "Very Happy";
    if (score >= 6) return "Happy";
    if (score >= 4) return "Neutral";
    if (score >= 2) return "Sad";
    return "Very Sad";
  };

  const getMoodIcon = (score: number) => {
    if (score >= 6) return <Smile className="w-8 h-8 text-green-500" />;
    if (score >= 4) return <Meh className="w-8 h-8 text-yellow-500" />;
    return <Frown className="w-8 h-8 text-red-500" />;
  };
  
  const handleAssessmentChange = (questionId: number, questionType: string, value: number) => {
    // Update the assessment responses
    const existingIndex = assessmentResponses.findIndex(r => r.question_id === questionId);
    
    if (existingIndex >= 0) {
      // Update existing response
      const updated = [...assessmentResponses];
      updated[existingIndex].score = value;
      setAssessmentResponses(updated);
    } else {
      // Add new response
      setAssessmentResponses([
        ...assessmentResponses, 
        { question_id: questionId, question_type: questionType, score: value }
      ]);
    }
  };

  // Function to dispatch mood assessment event and save to sessionStorage
  const dispatchMoodAssessmentEvent = (moodScore: number, assessmentResult: string) => {
    // Create an event with data in the format expected by MoodAnalytics and MoodSummaryCard
    const timestamp = new Date().toISOString();
    
    // Dispatch the event for other components to listen to
    const event = new CustomEvent('mood-assessment-completed', {
      detail: {
        moodScore: moodScore,
        assessmentResult: assessmentResult,
        timestamp: timestamp
      }
    });
    window.dispatchEvent(event);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Use test mode implementation
      const userId = user?.id || 'test_user';
      const now = new Date();
      const entryId = `mood_${Date.now()}`;
      const assessmentResult = getMoodResult(moodScore);
      
      // Create the mood entry object
      const moodEntry = {
        id: entryId,
        user_id: userId,
        mood_score: moodScore,
        assessment_result: assessmentResult,
        notes: notes,
        assessment_data: assessmentResponses.length > 0 ? assessmentResponses : undefined,
        created_at: now.toISOString(),
        journal_entry_id: createJournalEntry ? `journal_${Date.now()}` : undefined
      };
      
      // Store in session storage
      try {
        // Get existing entries or create new array
        const existingEntriesStr = sessionStorage.getItem('test_mood_entries');
        const moodEntries = existingEntriesStr ? JSON.parse(existingEntriesStr) : [];
        
        // Add new entry
        moodEntries.push(moodEntry);
        
        // Save back to session storage
        sessionStorage.setItem('test_mood_entries', JSON.stringify(moodEntries));
        
        // If creating journal entry, save that too
        if (createJournalEntry) {
          const journalEntry = {
            id: `journal_${Date.now()}`,
            user_id: userId,
            title: `Mood Entry - ${now.toLocaleDateString()}`,
            content: `<p>${notes}</p>`,
            mood: assessmentResult.toLowerCase(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          };
          
          const existingJournalsStr = sessionStorage.getItem('test_journal_entries');
          const journalEntries = existingJournalsStr ? JSON.parse(existingJournalsStr) : [];
          journalEntries.push(journalEntry);
          sessionStorage.setItem('test_journal_entries', JSON.stringify(journalEntries));
        }
        
        // Dispatch the custom event to update other components
        dispatchMoodAssessmentEvent(moodScore, assessmentResult);
        
        toast.success(createJournalEntry 
          ? "Mood logged and journal entry created!" 
          : "Mood logged successfully!");
          
        // Navigate if journal entry created
        if (createJournalEntry) {
          navigate(`/journal/${moodEntry.journal_entry_id}`);
        }
      } catch (storageError) {
        console.error("Error saving to session storage:", storageError);
        throw new Error("Failed to save mood data");
      }

      setNotes("");
      setMoodScore(5);
      setCreateJournalEntry(false);
      setAssessmentResponses([]);
      setShowAssessment(false);
    } catch (error: any) {
      console.error("Error logging mood:", error);
      toast.error(error.message || "Failed to save assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stress level from assessment responses
  const calculateStressLevel = (): number => {
    // If no responses, return 0
    if (!assessmentResponses.length) return 0;
    
    // Filter for stress type questions
    const stressResponses = assessmentResponses.filter(r => r.question_type === 'stress');
    
    // If no stress responses, return 0
    if (!stressResponses.length) return 0;
    
    // Calculate average stress score (on a scale from 0-10)
    const totalScore = stressResponses.reduce((sum, response) => sum + response.score, 0);
    return totalScore / stressResponses.length / 10; // Normalize to 0-1 scale
  };
  
  // Additional function to dispatch a stress assessment event
  const dispatchStressAssessmentEvent = () => {
    // Only dispatch if we have assessment responses
    if (assessmentResponses.length === 0) return;
    
    const stressLevel = calculateStressLevel();
    const event = new CustomEvent('stress-assessment-completed', {
      detail: {
        stressLevel: stressLevel,
        score: moodScore,
        status: "Completed"
      }
    });
    window.dispatchEvent(event);
    
    // Also save to sessionStorage for persistence
    try {
      sessionStorage.setItem('test_stress_assessment', JSON.stringify({
        stressLevel: stressLevel,
        score: moodScore,
        status: "Completed",
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error saving stress assessment to session storage:", error);
    }
  };
  
  // Modify the submit handler to also dispatch the stress assessment
  const handleCompleteSubmit = async () => {
    await handleSubmit();
    
    // If we showed the assessment and have responses, dispatch stress event
    if (showAssessment && assessmentResponses.length > 0) {
      dispatchStressAssessmentEvent();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>How are you feeling today?</CardTitle>
          {getMoodIcon(moodScore)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Mood Score: {moodScore}/10</span>
            <span className="text-sm font-medium">{getMoodResult(moodScore)}</span>
          </div>
          <Slider
            value={[moodScore]}
            min={1}
            max={10}
            step={1}
            onValueChange={(value) => setMoodScore(value[0])}
            className="py-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </label>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => setShowAssessment(!showAssessment)}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              {showAssessment ? "Hide Assessment" : "Complete Assessment"}
            </Button>
          </div>
          <Textarea
            id="notes"
            placeholder="Add any notes about how you're feeling today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={4}
          />
        </div>

        {showAssessment && (
          <div className="space-y-4 border rounded-lg p-4 bg-blue-50/50">
            <h3 className="font-medium">Stress Assessment</h3>
            <p className="text-sm text-muted-foreground">
              Rate each item on a scale from 1 (not at all) to 10 (extremely).
            </p>

            <div className="space-y-6">
              {stressQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium">{question.text}</label>
                  <Slider
                    value={[
                      assessmentResponses.find(r => r.question_id === question.id)?.score || 5
                    ]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => 
                      handleAssessmentChange(question.id, question.type, value[0])
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Not at all</span>
                    <span>Extremely</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="journal"
            checked={createJournalEntry}
            onCheckedChange={(checked) => setCreateJournalEntry(checked as boolean)} 
          />
          <label
            htmlFor="journal"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Create a journal entry from this check-in
          </label>
        </div>

        <Button 
          onClick={handleCompleteSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Saving..." : "Log Mood"}
        </Button>
      </CardContent>
    </Card>
  );
}



