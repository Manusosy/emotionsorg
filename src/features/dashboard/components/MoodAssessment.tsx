import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
// Supabase import removed
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

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      if (createJournalEntry) {
        // Create a journal entry first
        const { data: journalEntry, error: journalError } = await supabase
          .from("journal_entries")
          .insert({
            user_id: user.id,
            title: `Mood Entry - ${new Date().toLocaleDateString()}`,
            content: `<p>${notes}</p>`,
            mood: getMoodResult(moodScore).toLowerCase() as any,
          })
          .select()
          .single();

        if (journalError) throw journalError;

        // Create mood entry with journal reference
        const { error: moodError } = await supabase
          .from("mood_entries")
          .insert({
            user_id: user.id,
            mood_score: moodScore,
            assessment_result: getMoodResult(moodScore),
            notes: notes,
            journal_entry_id: journalEntry?.id,
            assessment_data: assessmentResponses.length > 0 ? assessmentResponses : undefined
          });

        if (moodError) throw moodError;

        toast.success("Mood logged and journal entry created!");
        navigate(`/journal/${journalEntry?.id}`);
      } else {
        // Just create mood entry
        const { error } = await supabase
          .from("mood_entries")
          .insert({
            user_id: user.id,
            mood_score: moodScore,
            assessment_result: getMoodResult(moodScore),
            notes: notes,
            assessment_data: assessmentResponses.length > 0 ? assessmentResponses : undefined
          });

        if (error) throw error;
        toast.success("Mood logged successfully!");
      }

      setNotes("");
      setMoodScore(5);
      setCreateJournalEntry(false);
      setAssessmentResponses([]);
      setShowAssessment(false);
    } catch (error: any) {
      console.error("Error logging mood:", error);
      toast.error(error.message || "Failed to log mood");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 text-center">
          <Frown className="w-5 h-5 text-slate-400" />
          <Slider
            value={[moodScore]}
            min={1}
            max={10}
            step={1}
            onValueChange={(value) => setMoodScore(value[0])}
            className="w-48 mx-4"
          />
          <Smile className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="mb-2">{getMoodIcon(moodScore)}</div>
          <div className="text-sm font-medium">{getMoodResult(moodScore)}</div>
        </div>
      </div>

      <Textarea
        placeholder="How are you feeling today? What's on your mind? (optional)"
        className="resize-none"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="journal" 
            checked={createJournalEntry}
            onCheckedChange={(checked) => setCreateJournalEntry(checked as boolean)} 
          />
          <label htmlFor="journal" className="text-sm flex items-center cursor-pointer">
            <BookOpen className="w-4 h-4 mr-1" />
            Also create a journal entry
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="assessment" 
            checked={showAssessment}
            onCheckedChange={(checked) => setShowAssessment(checked as boolean)} 
          />
          <label htmlFor="assessment" className="text-sm cursor-pointer">
            Include stress assessment
          </label>
        </div>
      </div>

      {showAssessment && (
        <div className="bg-slate-50 p-3 rounded-md space-y-4 mt-2">
          <h3 className="text-sm font-medium">Stress Assessment</h3>
          {stressQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <div className="text-sm">{question.text}</div>
              <div className="flex items-center">
                <span className="text-xs mr-2">Low</span>
                <Slider
                  value={[assessmentResponses.find(r => r.question_id === question.id)?.score || 3]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => handleAssessmentChange(question.id, question.type, value[0])}
                  className="w-full mx-1"
                />
                <span className="text-xs ml-2">High</span>
              </div>
            </div>
          ))}
          <div className="text-xs text-slate-500">
            These responses help us calculate your stress level metrics
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Check-in"}
        </Button>
      </div>
    </div>
  );
}



