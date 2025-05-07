import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, ArrowRight, AlertCircle, Bold, Italic, List, ListOrdered, Highlighter, Type, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { debounce } from "lodash";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Constants
const AUTOSAVE_DELAY = 3000; // 3 seconds

// Editor Toolbar Component
const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 rounded-t-md mb-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-slate-200' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-slate-200' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-slate-200' : ''}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-slate-200' : ''}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      {/* Text highlighting options */}
      <div className="border-l mx-1 h-6"></div>
      <span className="text-xs text-slate-500 mr-1">Highlight:</span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full bg-yellow-100 hover:bg-yellow-200"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full bg-blue-100 hover:bg-blue-200"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#dbeafe' }).run()}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full bg-green-100 hover:bg-green-200"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#dcfce7' }).run()}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-full bg-orange-100 hover:bg-orange-200"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fed7aa' }).run()}
        />
      </div>
    </div>
  );
};

export default function NewJournalEntryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tomorrowsPlan, setTomorrowsPlan] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMoodReminder, setShowMoodReminder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [isMentor, setIsMentor] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if the user is a mood mentor
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      
      try {
        setIsChecking(true);
        // Check if the user has a mentor profile
        const profileResponse = await userService.getUserProfile(user.id);
        const isMoodMentor = profileResponse?.role === 'mood_mentor';
        
        // If they're a mentor, redirect to mentor dashboard
        if (isMoodMentor) {
          navigate('/mood-mentor-dashboard');
        }
        
        setIsMentor(isMoodMentor);
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkUserRole();
  }, [user, navigate]);
  
  // If still checking role or confirmed as mentor, show loading state
  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-slate-500">Checking access...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      autosaveContent(editor.getHTML());
    },
  });

  // Save the journal entry
  const saveEntry = useCallback(async () => {
    if (!editor) return;

    const content = editor.getHTML();
    if (!content.trim() && !title.trim()) {
      return; // Don't save empty entries
    }

    setIsSaving(true);

    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to save journal entries. Please sign in.",
          variant: "destructive",
        });
        return;
      }

      try {
        // Format data for interface compatibility
        const entryData = {
          userId: user.id,
          title: title.trim() || "Untitled Entry",
          content: content,
          mood: selectedMood,
          tags: [],
          isPrivate: false,
          ...(tomorrowsPlan ? { tomorrowsIntention: tomorrowsPlan } : {})
        };
        
        const newEntry = await dataService.addJournalEntry(entryData);

        setLastSaved(new Date());
        toast({
          title: "Entry saved",
          description: "Your journal entry has been saved successfully.",
        });
        
        // Navigate back to journal page
        navigate("/patient-dashboard/journal");
      } catch (error) {
        console.error("Error saving journal entry:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save your journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editor, title, selectedMood, tomorrowsPlan, navigate, toast, user]);

  // Add autosave function
  const autosaveContent = useCallback(
    debounce((htmlContent: string) => {
      // Only autosave if we have content and a title
      if ((htmlContent.trim().length > 0 || title.trim().length > 0) && !isSaving) {
        // Show mood reminder if the user has written content but hasn't selected a mood
        setShowMoodReminder((htmlContent.trim().length > 0 || title.trim().length > 0) && !selectedMood);
        // Only call saveEntry for automatic saving if needed
        if (!lastSaved || (new Date().getTime() - lastSaved.getTime() > AUTOSAVE_DELAY)) {
          saveEntry();
        }
      }
    }, 1000),
    [title, selectedMood, isSaving, lastSaved]
  );

  // Add custom styles for the editor
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ProseMirror ul {
        list-style-type: disc;
        padding-left: 1.2em;
      }
      
      .ProseMirror ol {
        list-style-type: decimal;
        padding-left: 1.2em;
      }
      
      .ProseMirror mark {
        border-radius: 0.25em;
        padding: 0 0.1em;
      }
      
      /* Default yellow highlight */
      .ProseMirror mark {
        background-color: #fef08a;
      }
      
      /* Color-specific highlights */
      .ProseMirror mark[style*="#fef08a"] {
        background-color: #fef08a !important;
      }
      
      .ProseMirror mark[style*="#dbeafe"] {
        background-color: #dbeafe !important;
      }
      
      .ProseMirror mark[style*="#dcfce7"] {
        background-color: #dcfce7 !important;
      }
      
      .ProseMirror mark[style*="#fed7aa"] {
        background-color: #fed7aa !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Focus the title input on mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Regular component starts here for patients
  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">New Journal Entry</h1>
          <div className="text-sm text-muted-foreground">
            {todayDate}
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-200 rounded"
              placeholder="Title your entry..."
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <p className="w-full text-sm font-medium mb-1">How are you feeling today?</p>
            {["Happy", "Grateful", "Calm", "Anxious", "Sad", "Overwhelmed"].map((mood) => (
              <Button
                key={mood}
                type="button"
                variant={selectedMood === mood ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMood(mood)}
                className={selectedMood === mood ? "bg-blue-600" : ""}
              >
                {mood}
              </Button>
            ))}
          </div>
          
          {showMoodReminder && !selectedMood && (
            <div className="my-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>Selecting a mood helps track your emotional patterns over time.</p>
            </div>
          )}

          <div className="my-4 border rounded-md">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} className="min-h-[40vh]" />
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2 text-sm">Tomorrow's plan:</h3>
            <textarea
              placeholder="What do you plan to accomplish tomorrow?"
              value={tomorrowsPlan}
              onChange={(e) => setTomorrowsPlan(e.target.value)}
              className="w-full border border-gray-200 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
            />
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => navigate("/patient-dashboard/journal")}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button onClick={saveEntry} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


