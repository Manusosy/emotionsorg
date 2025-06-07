import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
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
  scrollToMentors?: boolean;
}

export default function BookingButton({
  moodMentorId,
  moodMentorName,
  nameSlug,
  disabled = false,
  size = "default",
  variant = "default",
  className = "",
  buttonText = "Book Appointment",
  scrollToMentors = false
}: BookingButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
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
      navigate('/patient-signin', { 
        state: { 
          redirectAfterLogin: '/booking',
          bookingInfo: {
            mentorId: moodMentorId,
            callType: 'video'
          }
        } 
      });
      return;
    }

    // If scrollToMentors is true and we're on the patient appointments page,
    // this means we should redirect to the booking page with the selected mentor
    if (location.pathname.includes('patient-dashboard/appointments') || location.pathname.includes('dashboard/appointments')) {
      // On appointments page, proceed directly to booking with the selected mentor
      navigate('/booking', {
        state: {
          mentorId: moodMentorId,
          callType: 'video'
        }
      });
    } else if (scrollToMentors && location.pathname.includes('patient-dashboard')) {
      // If on a different dashboard page, scroll to the mentors section
      const mentorsSection = document.getElementById('mood-mentors-section');
      if (mentorsSection) {
        mentorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.warn("Mood mentors section not found, navigating to /mood-mentors instead");
        navigate('/mood-mentors');
      }
    } else {
      // Default behavior - proceed with booking for patients
      navigate('/booking', {
        state: {
          mentorId: moodMentorId,
          callType: 'video'
        }
      });
    }
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
