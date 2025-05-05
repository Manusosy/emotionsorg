import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface BookingButtonProps {
  moodMentorId?: number;
  className?: string;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  disabled?: boolean;
}

const BookingButton = ({ 
  moodMentorId,
  className = "",
  buttonText = "Book Now",
  variant = "default",
  size = "default",
  showIcon = true,
  disabled = false
}: BookingButtonProps) => {
  const navigate = useNavigate();
  
  const handleBookNow = () => {
    if (disabled) return;
    // Immediately redirect to booking page
    navigate(`/booking?moodMentorId=${moodMentorId}`);
  };

  return (
    <Button 
      onClick={handleBookNow}
      variant={variant}
      size={size}
      disabled={disabled}
      className={`${variant === "default" ? "bg-[#007BFF] hover:bg-blue-600" : ""} 
                 ${disabled ? "opacity-50 cursor-not-allowed" : ""} 
                 ${className}`}
    >
      {showIcon && <Calendar className={`w-4 h-4 ${buttonText ? "mr-2" : ""}`} />}
      {buttonText && <span>{buttonText}</span>}
    </Button>
  );
};

export default BookingButton;
