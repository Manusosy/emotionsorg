import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";

interface BookingButtonProps {
  moodMentorId: string;
  moodMentorName: string;
  nameSlug?: string;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  buttonText?: string;
}

export default function BookingButton({
  moodMentorId,
  moodMentorName,
  nameSlug,
  disabled = false,
  size = "default",
  variant = "default",
  className = "",
  buttonText = "Book Appointment"
}: BookingButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBooking = () => {
    // Check if user is a mood mentor
    if (user?.user_metadata?.role === 'mood_mentor') {
      toast.error("As a mood mentor, you cannot book appointments with other mentors");
      return;
    }

    // If not logged in, redirect to login
    if (!user) {
      toast.error("Please sign in to book an appointment");
      navigate('/signin');
      return;
    }

    // Proceed with booking for patients
    navigate('/booking', {
      state: {
        mentorId: moodMentorId,
        callType: 'video'
      }
    });
  };

  // Check if user is a mood mentor to disable the button
  const isMoodMentor = user?.user_metadata?.role === 'mood_mentor';

  return (
    <Button
      onClick={handleBooking}
      disabled={disabled || isMoodMentor}
      size={size}
      variant={variant}
      className={`${className} ${isMoodMentor ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isMoodMentor ? "Mood mentors cannot book appointments with other mentors" : ""}
    >
      {buttonText}
    </Button>
  );
}
