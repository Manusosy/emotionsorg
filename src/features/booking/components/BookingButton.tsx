import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface BookingButtonProps {
  moodMentorId: string;
  moodMentorName?: string;
  className?: string;
  buttonText?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  disabled?: boolean;
  nameSlug?: string;
}

const BookingButton = ({ 
  moodMentorId,
  moodMentorName,
  className = "",
  buttonText = "BOOK APPOINTMENT",
  variant = "default",
  size = "default",
  showIcon = true,
  disabled = false,
  nameSlug
}: BookingButtonProps) => {
  const navigate = useNavigate();
  
  const handleBookNow = () => {
    if (disabled) return;
    
    // Generate nameSlug from name if not provided
    const mentorSlug = nameSlug || (moodMentorName ? moodMentorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
    
    // Immediately redirect to booking page with slug and ID
    navigate(`/booking?moodMentorId=${moodMentorId}&mentorSlug=${mentorSlug}${moodMentorName ? `&mentorName=${encodeURIComponent(moodMentorName)}` : ''}`);
  };

  return (
    <Button 
      onClick={handleBookNow}
      variant={variant}
      size={size}
      disabled={disabled}
      className={`${variant === "default" ? "bg-gradient-to-r from-[#0069FF] to-[#00AEFF] hover:from-[#005CE0] hover:to-[#0091D6]" : ""} 
                 ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                 font-medium transition-all duration-300 ease-in-out transform hover:-translate-y-1
                 ${className}`}
    >
      {showIcon && <Calendar className={`w-4 h-4 ${buttonText ? "mr-2" : ""}`} />}
      {buttonText && <span>{buttonText}</span>}
    </Button>
  );
};

export default BookingButton;
