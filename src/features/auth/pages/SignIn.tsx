import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, userRole, getDashboardUrlForRole, isLoading: authLoading } = useAuth();
  
  // Get redirect URL from query parameters if it exists
  const getRedirectUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("redirect");
  };
  
  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    if (authLoading) return;
    
    if (isAuthenticated && userRole) {
      console.log("User already authenticated, redirecting to dashboard");
      const dashboardUrl = getDashboardUrlForRole(userRole);
      console.log("Dashboard URL:", dashboardUrl);
      window.location.href = dashboardUrl;
    }
    
    setCheckingAuth(false);
  }, [isAuthenticated, userRole, navigate, getDashboardUrlForRole, authLoading]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Attempting sign in with email:", email);
      const response = await signIn({ email, password });

      if (response.user) {
        toast.success("Signed in successfully!");
        
        // Check if there's a redirect URL in the query parameters
        const redirectUrl = getRedirectUrl();
        
        if (redirectUrl) {
          console.log(`Sign in successful, redirecting to: ${redirectUrl}`);
          navigate(decodeURIComponent(redirectUrl), { replace: true });
        } else {
          // If no redirect URL, get the dashboard URL for the user's role
          let dashboardPath;
          
          // Check if response.user.role exists
          if (response.user.role) {
            dashboardPath = getDashboardUrlForRole(response.user.role);
          } else {
            // Map the user's email to the default role based on the mock accounts
            const role = email === 'mentor@example.com' ? 'mood_mentor' : 'patient';
            dashboardPath = getDashboardUrlForRole(role);
          }
          
          console.log(`Sign in successful, redirecting to dashboard: ${dashboardPath}`);
          
          // Force a full page reload to ensure all contexts are properly refreshed
          window.location.href = dashboardPath;
        }
      } else {
        throw new Error(response.error || "Sign in failed");
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error("Sign in failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleGoogleLogin = () => {
    // TO BE CONFIGURED LATER
    toast.info("Google sign in will be configured later");
  };

  if (checkingAuth || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
      </div>
      
      <div className="mb-4">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M15.545 6.558C15.545 6.044 15.4979 5.52933 15.4129 5.03333H8V7.36667H12.2896C12.1146 8.10667 11.5663 8.71533 10.7913 9.11533V10.6153H13.2546C14.7054 9.56667 15.545 8.216 15.545 6.558Z" fill="#4285F4"/>
            <path d="M8 15.9999C10.16 15.9999 11.9708 15.292 13.2546 10.6153L10.7912 9.11533C10.0938 9.65866 9.15833 9.9853 8 9.9853C5.99583 9.9853 4.2975 8.89967 3.64583 7.36667H1.0975V8.91667C2.3775 12.9932 5.00667 15.9999 8 15.9999Z" fill="#34A853"/>
            <path d="M3.64583 7.36667C3.49583 6.99267 3.41 6.59133 3.41 6.17267C3.41 5.754 3.49583 5.35267 3.64583 4.97867V3.42867H1.0975C0.64 4.25133 0.375 5.184 0.375 6.17267C0.375 7.16133 0.64 8.094 1.0975 8.91667L3.64583 7.36667Z" fill="#FBBC05"/>
            <path d="M8 2.36C9.15667 2.36 10.1992 2.75267 11.0283 3.54333L13.1975 1.374C11.9658 0.22333 10.155 -0.000671387 8 -0.000671387C5.00667 -0.000671387 2.3775 3.00733 1.0975 7.084L3.64583 8.634C4.2975 7.10067 5.99583 2.36 8 2.36Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </Button>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <button 
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <Button 
          type="submit" 
          className="w-full mt-6" 
          disabled={isLoading}
          variant="brand"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
        
        <div className="flex items-center justify-between mt-4">
          <Link to="/signup" className="text-sm text-primary hover:underline">
            Don't have an account? Sign up
          </Link>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
} 