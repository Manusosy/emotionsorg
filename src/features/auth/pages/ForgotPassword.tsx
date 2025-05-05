import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "../components/AuthLayout";
import { toast } from "sonner";
// Supabase import removed
import { Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const result = await authService.resetPassword(email, `${window.location.origin}/reset-password`);

      if (result.error) throw result.error;
      
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Reset Your Password" 
      subtitle={
        isSubmitted 
          ? "Check your email for a password reset link" 
          : "Enter your email to receive a password reset link"
      }
    >
      {!isSubmitted ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full mt-6" 
            disabled={isLoading}
            variant="brand"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
          <p className="text-center text-sm text-gray-600 mt-4">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <p className="text-green-800 text-sm">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
          </div>
          <Button asChild className="w-full" variant="outline">
            <Link to="/login">Return to Login</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
} 


