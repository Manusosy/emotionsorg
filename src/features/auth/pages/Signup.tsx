import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import AuthLayout from "../components/AuthLayout";
import { countries } from "../utils/countries";
import { User, UserPlus, Eye, EyeOff, Mail, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

const roleInfo = {
  patient: {
    title: "Patient Account",
    description: "Access personalized health tracking, book appointments with Mood Mentors, and track your wellness journey.",
  },
  mood_mentor: {
    title: "Mood Mentor",
    description: "Join our network of mental health advocates dedicated to providing support and raising awareness.",
  }
};

type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  country?: string;
  gender?: string;
  terms?: string;
};

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    gender: "",
    role: "patient" as UserRole,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isAuthenticated, userRole, getDashboardUrlForRole, directNavigateToDashboard, isLoading: authLoading } = useAuth();

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
      navigate(dashboardUrl, { replace: true });
    }
    
    setCheckingAuth(false);
  }, [isAuthenticated, userRole, navigate, getDashboardUrlForRole, authLoading]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // Validate email
    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    // Validate country
    if (!formData.country) {
      newErrors.country = "Country is required";
      isValid = false;
    }

    // Validate gender for mood mentors
    if (formData.role === "mood_mentor" && !formData.gender) {
      newErrors.gender = "Gender is required for mood mentors";
      isValid = false;
    }

    // Validate terms agreement
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms and privacy policy";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Normalize role for backward compatibility
      let normalizedRole = formData.role;
      if (normalizedRole === 'mood_mentor') {
        console.log(`Converting legacy role ${normalizedRole} to mood_mentor`);
        normalizedRole = 'mood_mentor';
      }

      // Create user with our auth service
      const { data, error } = await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: normalizedRole as UserRole,
        country: formData.country,
        gender: formData.gender || null,
      });
      
      if (error) {
        console.error("Signup error details:", error);
        toast.error(`Failed to create account: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        toast.error("Failed to create account: No user data returned");
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      
      // Check if there's a redirect URL in the query parameters
      const redirectUrl = getRedirectUrl();
      
      if (redirectUrl) {
        console.log(`Signup successful, redirecting to: ${redirectUrl}`);
        navigate(decodeURIComponent(redirectUrl), { replace: true });
      } else {
        // If no redirect URL, use consistent direct navigation for both roles
        const dashboardUrl = normalizedRole === 'mood_mentor' 
          ? '/mood-mentor-dashboard'
          : '/patient-dashboard';
        
        console.log(`DIRECT NAVIGATION TO: ${dashboardUrl}`);
        
        // DIRECT NAVIGATION - NO REACT ROUTER - for both patient and mood mentor
        window.location.href = dashboardUrl;
      }
      
    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMessage = error.message || "Unknown error";
      toast.error(`Failed to create account: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role: role as UserRole });
  };

  const handleGoogleSignup = () => {
    // TO BE CONFIGURED LATER
    toast.info("Google signup will be configured later");
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
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground mt-1">Sign up to get started with our services</p>
      </div>
      
      <Tabs
        value={formData.role}
        onValueChange={handleRoleChange}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patient" disabled={isLoading}>
            <User className="mr-2 h-4 w-4" />
            Patient
          </TabsTrigger>
          <TabsTrigger value="mood_mentor" disabled={isLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            Mood Mentor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="patient" className="mt-2">
          <div className="bg-muted/40 rounded-lg p-3">
            <h3 className="font-medium">{roleInfo.patient.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{roleInfo.patient.description}</p>
          </div>
        </TabsContent>
        <TabsContent value="mood_mentor" className="mt-2">
          <div className="bg-muted/40 rounded-lg p-3">
            <h3 className="font-medium">{roleInfo.mood_mentor.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{roleInfo.mood_mentor.description}</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mb-4">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M15.545 6.558C15.545 6.044 15.4979 5.52933 15.4129 5.03333H8V7.36667H12.2896C12.1146 8.10667 11.5663 8.71533 10.7913 9.11533V10.6153H13.2546C14.7054 9.56667 15.545 8.216 15.545 6.558Z" fill="#4285F4"/>
            <path d="M8 15.9999C10.16 15.9999 11.9708 15.292 13.2546 10.6153L10.7912 9.11533C10.0938 9.65866 9.15833 9.9853 8 9.9853C5.99583 9.9853 4.2975 8.89967 3.64583 7.36667H1.0975V8.91667C2.3775 12.9932 5.00667 15.9999 8 15.9999Z" fill="#34A853"/>
            <path d="M3.64583 7.36667C3.49583 6.99267 3.41 6.59133 3.41 6.17267C3.41 5.754 3.49583 5.35267 3.64583 4.97867V3.42867H1.0975C0.64 4.25133 0.375 5.184 0.375 6.17267C0.375 7.16133 0.64 8.094 1.0975 8.91667L3.64583 7.36667Z" fill="#FBBC05"/>
            <path d="M8 2.36C9.15667 2.36 10.1992 2.75267 11.0283 3.54333L13.1975 1.374C11.9658 0.22333 10.155 -0.000671387 8 -0.000671387C5.00667 -0.000671387 2.3775 3.00733 1.0975 7.084L3.64583 8.634C4.2975 7.10067 5.99583 2.36 8 2.36Z" fill="#EA4335"/>
          </svg>
          Sign up with Google
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

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
            {formData.password && formData.password.length < 6 && !errors.password && (
              <p className="text-xs text-red-500">Password must be at least 6 characters</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword}</p>
            )}
            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && !errors.confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => {
                setFormData({ ...formData, country: value });
                if (errors.country) {
                  setErrors({ ...errors, country: undefined });
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="country" className={`w-full ${errors.country ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-xs text-red-500">{errors.country}</p>
            )}
          </div>

          {formData.role === "mood_mentor" && (
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => {
                  setFormData({ ...formData, gender: value });
                  if (errors.gender) {
                    setErrors({ ...errors, gender: undefined });
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="gender" className={`w-full ${errors.gender ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-red-500">{errors.gender}</p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms}
              onCheckedChange={(checked) => {
                setAgreedToTerms(checked as boolean);
                if (errors.terms) {
                  setErrors({ ...errors, terms: undefined });
                }
              }}
              disabled={isLoading}
              className={errors.terms ? 'border-red-500' : ''}
            />
            <label
              htmlFor="terms"
              className="text-sm text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{" "}
              <Link to="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.terms && (
            <p className="text-xs text-red-500">{errors.terms}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isLoading}
          variant="brand"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>

        <div className="flex justify-between items-center text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-primary hover:underline">
            Already have an account? Login
          </Link>
          <Link to="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
} 