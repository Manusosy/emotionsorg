import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "lucide-react";
import StressAssessmentModal from "./StressAssessmentModal";

type EmotionalHealthWheelProps = {
  stressLevel: number;
  lastCheckIn: string;
  onViewDetails: () => void;
  hasAssessments: boolean;
}

export default function EmotionalHealthWheel({
  stressLevel,
  lastCheckIn,
  onViewDetails,
  hasAssessments
}: EmotionalHealthWheelProps) {
  // Calculate health percentage (inverse of stress)
  // Clamping health percentage between 0 and 100
  const healthPercentage = hasAssessments 
    ? Math.max(0, Math.min(100, Math.round((10 - stressLevel) * 10)))
    : 0; // Default to 0 for new users with no assessments
  
  // Determine color and status based on health percentage
  const getWheelColor = () => {
    if (!hasAssessments) return "#cccccc"; // Gray for no data
    if (healthPercentage >= 80) return "#4ade80"; // Green
    if (healthPercentage >= 60) return "#a3e635"; // Light green
    if (healthPercentage >= 40) return "#facc15"; // Yellow
    if (healthPercentage >= 20) return "#fb923c"; // Orange
    return "#ef4444"; // Red
  };
  
  const getHealthStatus = () => {
    if (!hasAssessments) return "No Assessment";
    if (healthPercentage >= 80) return "Excellent";
    if (healthPercentage >= 60) return "Good";
    if (healthPercentage >= 40) return "Fair";
    if (healthPercentage >= 20) return "Concerning";
    return "Worrying";
  };

  // Calculate SVG properties - starting at bottom (6 o'clock position)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  
  // Adjusted to start from bottom (6 o'clock position)
  // When no assessments, don't show any progress
  const strokeDashoffset = hasAssessments 
    ? circumference - (healthPercentage / 100) * circumference
    : circumference; // Full offset = empty circle
  
  // Create rotation value to start from bottom (6 o'clock) instead of right (3 o'clock)
  // Normally SVG circles start at 3 o'clock (0 degrees)
  // To start at 6 o'clock we need to rotate 90 degrees
  const circleRotation = 90;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-medium">Stress Analytics</CardTitle>
          <StressAssessmentModal />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-52 h-52 flex items-center justify-center">
          {/* SVG Circle Progress - Adjusted to start from bottom (6 o'clock position) */}
          <svg 
            className="w-full h-full transform" 
            viewBox="0 0 120 120"
            style={{ transform: `rotate(${circleRotation}deg)` }}
          >
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              strokeWidth="10"
              stroke="#eeeeee" 
              fill="none" 
            />
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              strokeWidth="10"
              stroke={getWheelColor()} 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
          
          {/* Center text - show last assessment time or message for new users */}
          <div className="absolute flex flex-col items-center justify-center text-center px-6">
            {hasAssessments ? (
              <>
                <p className="text-sm text-slate-600">Last assessment</p>
                <p className="font-medium">{lastCheckIn}</p>
              </>
            ) : (
              <p className="text-sm text-slate-600 font-medium">You have not taken any assessment yet</p>
            )}
          </div>
        </div>
        
        {/* Health status text below the wheel */}
        <div className="text-center mt-4">
          <p className="text-lg font-semibold" style={{ color: getWheelColor() }}>
            {getHealthStatus()}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {hasAssessments ? "Your assessment result" : "Complete your first assessment"}
          </p>
        </div>
        
        {/* Action button - always visible but disabled for users without assessments */}
        <div className="mt-4">
          <Button 
            className="text-white bg-blue-600 hover:bg-blue-700 w-full" 
            onClick={onViewDetails}
            disabled={!hasAssessments}
          >
            <BarChart className="mr-2 h-4 w-4" />
            {hasAssessments ? "View Details" : "No Data Available"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 