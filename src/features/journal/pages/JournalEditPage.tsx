import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, ArrowRight, AlertCircle, Bold, Italic, List, ListOrdered, Highlighter, Loader2 } from "lucide-react";
// Supabase import removed
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { debounce } from "lodash";

// Constants
const AUTOSAVE_DELAY = 3000; // 3 seconds

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string | number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  tomorrows_intention?: string;
}

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

export default function JournalEditPage() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tomorrowsPlan, setTomorrowsPlan] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMoodReminder, setShowMoodReminder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Initialize editor with content
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

  // Fetch the journal entry when component mounts
  useEffect(() => {
    const fetchEntry = async () => {
      if (!entryId) return;

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("id", entryId)
          .single();

        if (error) throw error;

        if (data) {
          setEntry(data as JournalEntry);
          setTitle(data.title);
          setContent(data.content);
          setSelectedMood(data.mood.toString());
          setTomorrowsPlan(data.tomorrows_intention || "");
          setTags(data.tags || []);
          
          // Update the editor content
          if (editor) {
            editor.commands.setContent(data.content);
          }
        }
      } catch (err: any) {
        console.error("Error fetching journal entry:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load journal entry",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntry();
  }, [entryId, editor, toast]);

  // Update editor content when the entry loads
  useEffect(() => {
    if (editor && entry?.content && !isLoading) {
      editor.commands.setContent(entry.content);
    }
  }, [editor, entry, isLoading]);

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

  // Add autosave function
  const autosaveContent = useCallback(
    debounce((htmlContent: string) => {
      // Only autosave if we have content and a title
      if ((htmlContent.trim().length > 0 || title.trim().length > 0) && !isSaving) {
        // Show mood reminder if the user has written content but hasn't selected a mood
        setShowMoodReminder((htmlContent.trim().length > 0 || title.trim().length > 0) && !selectedMood);
        saveDraft();
      }
    }, 1000),
    [title, selectedMood, isSaving]
  );

  // Save draft function
  const saveDraft = async () => {
    if (!entryId || !user?.id || !editor) return;
    
    try {
      setIsSaving(true);
      const htmlContent = editor.getHTML();
      
      // Only save if changes were made
      if (htmlContent !== entry?.content || title !== entry?.title || 
          selectedMood !== entry?.mood.toString() || tomorrowsPlan !== entry?.tomorrows_intention) {
        
        const { error } = await supabase
          .from("journal_entries")
          .update({
            title: title,
            content: htmlContent,
            mood: selectedMood,
            tomorrows_intention: tomorrowsPlan,
            tags: tags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entryId);

        if (error) throw error;
        
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error("Error saving draft:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mood selection
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setShowMoodReminder(false);
  };

  // Save the updated journal entry
  const handleSave = async () => {
    if (!entryId || !user?.id || !editor) return;

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please add a title to your journal entry",
      });
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
      return;
    }

    if (!selectedMood) {
      setShowMoodReminder(true);
      toast({
        variant: "destructive",
        title: "Mood Required",
        description: "Please select your mood for this entry",
      });
      return;
    }

    try {
      setIsSaving(true);
      const htmlContent = editor.getHTML();

      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: title,
          content: htmlContent,
          mood: selectedMood,
          tomorrows_intention: tomorrowsPlan,
          tags: tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Journal entry updated successfully",
      });
      
      // Navigate back to the journal entry view
      navigate(`/patient-dashboard/journal/${entryId}`);
    } catch (err) {
      console.error("Error updating journal entry:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update journal entry",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel and return to the entry view
  const handleCancel = () => {
    navigate(`/patient-dashboard/journal/${entryId}`);
  };

  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Render the mood selector component
  const MoodSelector = () => (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        How are you feeling today?
        {showMoodReminder && (
          <span className="ml-2 text-red-500 text-xs flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Please select your mood
          </span>
        )}
      </Label>
      <div className="grid grid-cols-5 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((mood) => (
          <Button
            key={mood}
            type="button"
            variant={selectedMood === mood ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleMoodSelect(mood)}
            className={`h-10 ${
              parseInt(mood) <= 3
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : parseInt(mood) <= 5
                ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                : parseInt(mood) <= 7
                ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'
                : 'border-green-200 text-green-600 hover:bg-green-50'
            } ${
              selectedMood === mood
                ? parseInt(mood) <= 3
                  ? 'bg-red-50'
                  : parseInt(mood) <= 5
                  ? 'bg-orange-50'
                  : parseInt(mood) <= 7
                  ? 'bg-yellow-50'
                  : 'bg-green-50'
                : ''
            }`}
          >
            {mood}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1 flex justify-between">
        <span>Not good (1)</span>
        <span>Excellent (10)</span>
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Card className="p-4 md:p-6 mb-8">
          <div className="flex flex-col gap-6">
            {/* Journal header with date */}
            <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span>
                Editing Journal Entry from {new Date(entry?.created_at || '').toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Title field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Title
              </Label>
              <Input
                ref={titleInputRef}
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your journal entry a title"
                className="text-lg font-medium"
              />
            </div>

            {/* Mood selector */}
            <MoodSelector />

            {/* Rich text editor */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Journal Entry</Label>
              <div className="border rounded-md bg-white">
                <EditorToolbar editor={editor} />
                <EditorContent
                  editor={editor}
                  className="min-h-[200px] p-3 prose max-w-none focus:outline-none"
                />
              </div>
              {lastSaved && (
                <div className="text-xs text-muted-foreground text-right">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Tomorrow's intention field */}
            <div className="space-y-2">
              <Label htmlFor="tomorrows-plan" className="text-base font-medium">
                Tomorrow's Intention (Optional)
              </Label>
              <Textarea
                id="tomorrows-plan"
                value={tomorrowsPlan}
                onChange={(e) => setTomorrowsPlan(e.target.value)}
                placeholder="What's one thing you intend to do tomorrow?"
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Tags (Optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <div key={tag} className="flex items-center bg-slate-100 rounded-full px-3 py-1">
                    <span className="text-sm">{tag}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0 ml-1 rounded-full hover:bg-slate-200"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tags help you organize and search your journal entries
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


