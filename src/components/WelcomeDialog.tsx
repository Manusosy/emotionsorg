import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../services'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
// Supabase import removed
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HeartHandshake, BookOpen, Heart, Activity, BrainCircuit } from "lucide-react";

export default function WelcomeDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const firstName = user?.user_metadata?.first_name || 'User';

  // Check if this is the user's first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome && user) {
      setOpen(true);
    }
  }, [user]);

  const createWelcomeNotification = async () => {
    if (!user?.id) return;
    
    try {
      // Check if welcome notification already exists
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', 'Welcome to Emotions')
        .limit(1);
      
      // Only create if it doesn't already exist
      if (!data || data.length === 0) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Welcome to Emotions',
            message: 'Hi! Welcome to Emotions. Feel free to take a tour around and familiarize yourself with our cool features to help you monitor, analyze and receive personalized recommendations to do with your mental health. Try our Journal feature, or Stress analytics feature or even emotional checkin!',
            read: false,
            type: 'welcome'
          });
      }
    } catch (error) {
      console.error('Error creating welcome notification:', error);
    }
  };

  const handleClose = () => {
    localStorage.setItem("hasSeenWelcome", "true");
    setOpen(false);
    createWelcomeNotification();
  };

  const handleEmotionalCheckin = () => {
    handleClose();
    navigate("/patient-dashboard/mood-tracker");
  };

  const handleStressAnalysis = () => {
    handleClose();
    navigate("/patient-dashboard/reports");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="gap-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <HeartHandshake className="h-8 w-8 text-blue-600" />
          </div>
          <AlertDialogTitle className="text-xl text-center">
            Hi, {firstName}! Welcome to Emotions
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Feel free to take a tour around and familiarize yourself with our cool features to help you monitor, analyze and receive personalized recommendations to do with your mental health. Try our Journal feature, or Stress analytics feature or even emotional checkin!
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-1 gap-4 my-4">
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-2 h-auto py-4 hover:bg-blue-50 border-blue-200"
            onClick={handleEmotionalCheckin}
          >
            <Heart className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-medium">Emotional Check-in</h3>
              <p className="text-xs text-slate-500">
                Track how you're feeling today
              </p>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-2 h-auto py-4 hover:bg-blue-50 border-blue-200"
            onClick={handleStressAnalysis}
          >
            <BrainCircuit className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-medium">Stress Analysis</h3>
              <p className="text-xs text-slate-500">
                Start your mental wellbeing assessment
              </p>
            </div>
          </Button>
        </div>
        
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel onClick={handleClose}>
            Maybe Later
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleEmotionalCheckin} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Start Check-in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 


