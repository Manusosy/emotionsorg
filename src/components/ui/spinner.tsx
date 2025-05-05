import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const Spinner = ({ size = "md", className, text = "Please wait..." }: SpinnerProps) => {
  const sizeClasses = {
    sm: {
      container: "gap-1",
      dots: "w-1.5 h-1.5",
      text: "text-xs"
    },
    md: {
      container: "gap-2",
      dots: "w-2 h-2",
      text: "text-sm"
    },
    lg: {
      container: "gap-2.5",
      dots: "w-2.5 h-2.5", 
      text: "text-base"
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <p className={cn("text-[#20C0F3] font-medium mb-2", sizeClasses[size].text)}>{text}</p>
      <div className={cn("flex", sizeClasses[size].container)}>
        <div 
          className={cn("bg-[#20C0F3] rounded-full animate-bounce", sizeClasses[size].dots)} 
          style={{ animationDelay: '0ms' }}
        ></div>
        <div 
          className={cn("bg-[#20C0F3] rounded-full animate-bounce", sizeClasses[size].dots)} 
          style={{ animationDelay: '150ms' }}
        ></div>
        <div 
          className={cn("bg-[#20C0F3] rounded-full animate-bounce", sizeClasses[size].dots)} 
          style={{ animationDelay: '300ms' }}
        ></div>
      </div>
    </div>
  );
}; 