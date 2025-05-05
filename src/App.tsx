import { moodMentorService, authService, userService, dataService, apiService, messageService, patientService, appointmentService } from './services'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import MoodTracker from "@/features/mood-tracking/pages/MoodTracker";
import SignIn from "@/features/auth/pages/SignIn";
import Signup from "@/features/auth/pages/Signup";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import NotFound from "./pages/NotFound";
import JournalPage from "@/features/journal/pages/JournalPage";
import DashboardJournalPage from "@/features/dashboard/pages/JournalPage";
import NotificationsPage from "@/features/dashboard/pages/NotificationsPage";
import MoodMentorNotificationsPage from "@/features/mood_mentors/pages/NotificationsPage";
import MoodTrackerPage from "@/features/dashboard/pages/MoodTrackerPage";
import ReportsPage from "@/features/dashboard/pages/ReportsPage";
import Footer from "@/components/layout/Footer";
import ContactBanner from "@/components/layout/ContactBanner";
import MoodMentors from "@/features/mood_mentors/pages/MoodMentors";
import MoodMentorAppointmentsPage from "@/features/mood_mentors/pages/AppointmentsPage";
import MoodMentorPatientsPage from "@/features/mood_mentors/pages/PatientsPage";
import MoodMentorGroupsPage from "@/features/mood_mentors/pages/GroupsPage";
import MoodMentorResourcesPage from "@/features/mood_mentors/pages/ResourcesPage";
import DashboardResourcesPage from "@/features/dashboard/pages/ResourcesPage";
import BookingPage from "@/features/booking/pages/BookingPage";
import PatientDashboard from "@/features/dashboard/pages/PatientDashboard";
import PatientAppointmentsPage from "@/features/dashboard/pages/AppointmentsPage";
import FavoritesPage from "@/features/dashboard/pages/FavoritesPage";
import Settings from "@/features/dashboard/pages/Settings";
import Profile from "@/features/dashboard/pages/Profile";
import DeleteAccount from "@/features/dashboard/pages/DeleteAccount";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import ComingSoon from '@/components/ComingSoon';
import MoodMentorDashboard from "@/features/mood_mentors/pages/MoodMentorDashboard";
import MoodMentorSettingsPage from "@/features/mood_mentors/pages/SettingsPage";
import MoodMentorProfilePage from "@/features/mood_mentors/pages/ProfilePage";
import MoodMentorDeleteAccountPage from "@/features/mood_mentors/pages/DeleteAccountPage";
import { useAuth } from "@/hooks/use-auth";
import Resources from "@/pages/Resources";
import HelpGroups from "./pages/HelpGroups";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataProtection from "./pages/DataProtection";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import About from "./pages/About";
import MoodMentorProfile from "@/features/mood_mentors/pages/MoodMentorProfile";
import MoodMentorReviewsPage from "@/features/mood_mentors/pages/ReviewsPage";
import MoodMentorAvailabilityPage from "@/features/mood_mentors/pages/AvailabilityPage";
import './styles/App.css';
import { Spinner } from "@/components/ui/spinner";
import JournalEntryPage from "@/features/journal/pages/JournalEntryPage";
import NewJournalEntryPage from "@/features/journal/pages/NewJournalEntryPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import HelpCenterPage from "@/features/dashboard/pages/HelpCenterPage";
import MessagesPage from "@/features/dashboard/pages/MessagesPage";
import MoodMentorMessagesPage from "@/features/mood_mentors/pages/MessagesPage";
import ScrollToTop from "@/components/layout/ScrollToTop";
import JournalEditPage from "@/features/journal/pages/JournalEditPage";
import { AuthProvider } from "@/contexts/authContext";

// Type definition for UserRole
type UserRole = 'patient' | 'mood_mentor' | 'admin';

// Type definition for ProtectedRoute props
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
}

const HomePage = () => {
  return (
    <div className="homepage-wrapper relative pb-12">
      <MoodTracker />
    </div>
  );
};

// DashboardErrorFallback component to provide context-aware error handling
const DashboardErrorFallback = ({ dashboardType }: { dashboardType: 'patient' | 'mood_mentor' }) => {
  const navigate = useNavigate();
  const dashboardPath = dashboardType === 'patient' ? '/patient-dashboard' : '/mood-mentor-dashboard';
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">Something went wrong</h2>
        <p className="text-gray-600">
          We encountered an error while loading this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" onClick={() => navigate(dashboardPath)}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requiredRole,
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { isAuthenticated, userRole, isLoading, getDashboardUrlForRole } = useAuth();

  const effectiveAllowedRoles = requiredRole ? [requiredRole] : allowedRoles;

  // Check for stored auth state first
  useEffect(() => {
    // Attempt to get stored auth data from localStorage
    const storedAuthState = localStorage.getItem('auth_state');
    if (storedAuthState) {
      try {
        const { isAuthenticated: storedAuth, userRole: storedRole } = JSON.parse(storedAuthState);
        
        if (storedAuth && storedRole) {
          console.log(`Found stored auth state with role: ${storedRole}`);
          // If the stored role matches our required role, we can bypass the auth check
          const hasRequiredRole = 
            effectiveAllowedRoles.length === 0 || 
            effectiveAllowedRoles.includes(storedRole as UserRole);
            
          if (hasRequiredRole) {
            console.log("User has required role based on stored auth state");
            setIsAuthorized(true);
            setHasCheckedAuth(true);
          }
        }
      } catch (e) {
        console.error("Error parsing stored auth state:", e);
      }
    }
  }, [effectiveAllowedRoles]);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip if we've already authorized based on stored state
      if (hasCheckedAuth && isAuthorized) return;
      
      console.log(
        `Checking auth for path: ${pathname}, isAuthenticated: ${isAuthenticated}, userRole: ${userRole}, allowedRoles:`,
        effectiveAllowedRoles
      );

      // Wait until authentication check is complete
      if (isLoading) return;

      if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to signin");
        // Navigate to signin
        navigate(`/signin?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // If no specific roles are required or user has required role
      const hasRequiredRole =
        effectiveAllowedRoles.length === 0 || (userRole && effectiveAllowedRoles.includes(userRole as UserRole));

      if (!hasRequiredRole) {
        console.log(
          `User does not have required role. Current role: ${userRole}, required roles:`,
          effectiveAllowedRoles
        );
        // Redirect to appropriate dashboard based on role
        const dashboardPath = getDashboardUrlForRole(userRole);
        
        // Avoid infinite redirects by checking if we're already on the dashboard path
        if (pathname !== dashboardPath) {
          console.log(`Redirecting to ${dashboardPath}`);
          navigate(dashboardPath, { replace: true });
        } else {
          // We're already on the dashboard but don't have proper permissions
          // Just mark as unauthorized but don't navigate again
          console.log("Already on dashboard, but unauthorized for this specific section");
        }
        return;
      }

      // User is authenticated and authorized
      setIsAuthorized(true);
      setHasCheckedAuth(true);
    };

    checkAuth();
  }, [isAuthenticated, userRole, pathname, effectiveAllowedRoles, navigate, isLoading, getDashboardUrlForRole, hasCheckedAuth, isAuthorized]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    );
  }

  // Wrap the children in an ErrorBoundary with the appropriate dashboard path
  const dashboardPath = requiredRole === 'patient' ? '/patient-dashboard' : '/mood-mentor-dashboard';
  
  return isAuthorized ? (
    <ErrorBoundary dashboardPath={dashboardPath}>
      {children}
    </ErrorBoundary>
  ) : null;
};

const AppContent = () => {
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isAnchor = target.tagName === 'A' || target.closest('a');
      if (isAnchor) {
        console.log("Link clicked:", target);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    console.log("Current location:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const pathname = location.pathname;
    const isDashboardPage = pathname.includes('dashboard') || 
                          pathname.includes('admin') ||
                          pathname === '/mood-mentor-dashboard' ||
                          pathname.startsWith('/mood-mentor-dashboard/');
    
    setShowHeaderFooter(!isDashboardPage);
    console.log('Current path:', pathname, 'Show header/footer:', !isDashboardPage);
  }, [location.pathname]);

  const shouldShowContactBanner = location.pathname === "/" || 
                                 location.pathname === "/contact" || 
                                 location.pathname === "/privacy" ||
                                 location.pathname === "/data-protection" ||
                                 location.pathname === "/terms" ||
                                 location.pathname === "/faqs" ||
                                 location.pathname === "/about";

  return (
    <>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="flex flex-col min-h-screen max-w-[100vw] overflow-x-hidden">
          {showHeaderFooter && <Navbar />}
          <div className="flex-grow">
            <Routes key={location.pathname}>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/mood-mentors" element={<MoodMentors />} />
              <Route path="/mood-mentors/:id" element={<MoodMentorProfile />} />
              <Route path="/booking" element={<BookingPage />} />
              
              <Route path="/resources" element={<Resources />} />
              <Route path="/help-groups" element={<HelpGroups />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/data-protection" element={<DataProtection />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/about" element={<About />} />
              
              {/* Mood Mentor Dashboard Routes */}
              <Route path="/mood-mentor-dashboard" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/appointments" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorAppointmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/patients" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorPatientsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/groups" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorGroupsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/resources" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorResourcesPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/reviews" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorReviewsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/availability" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorAvailabilityPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/messages" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorMessagesPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/profile" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/settings" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/settings/delete-account" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorDeleteAccountPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/notifications" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <MoodMentorNotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/mood-mentor-dashboard/*" element={
                <ProtectedRoute requiredRole="mood_mentor">
                  <NotFound />
                </ProtectedRoute>
              } />
              
              {/* Patient Dashboard Routes */}
              <Route path="/patient-dashboard" element={
                <ProtectedRoute requiredRole="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              } /> 
              <Route path="/patient-dashboard/appointments" element={
                <ProtectedRoute requiredRole="patient">
                  <PatientAppointmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/favorites" element={
                <ProtectedRoute requiredRole="patient">
                  <FavoritesPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/journal" element={
                <ProtectedRoute requiredRole="patient">
                  <DashboardJournalPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/journal/:entryId" element={
                <ProtectedRoute requiredRole="patient">
                  <JournalEntryPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/journal/new" element={
                <ProtectedRoute requiredRole="patient">
                  <NewJournalEntryPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/journal/edit/:entryId" element={
                <ProtectedRoute requiredRole="patient">
                  <JournalEditPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/notifications" element={
                <ProtectedRoute requiredRole="patient">
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/mood-tracker" element={
                <ProtectedRoute requiredRole="patient">
                  <MoodTrackerPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/reports" element={
                <ProtectedRoute requiredRole="patient">
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/resources" element={
                <ProtectedRoute requiredRole="patient">
                  <DashboardResourcesPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/messages" element={
                <ProtectedRoute requiredRole="patient">
                  <MessagesPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/help" element={
                <ProtectedRoute requiredRole="patient">
                  <HelpCenterPage />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/settings" element={
                <ProtectedRoute requiredRole="patient">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/settings/delete-account" element={
                <ProtectedRoute requiredRole="patient">
                  <DeleteAccount />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/profile" element={
                <ProtectedRoute requiredRole="patient">
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/patient-dashboard/*" element={
                <ProtectedRoute requiredRole="patient">
                  <NotFound />
                </ProtectedRoute>
              } />
              
              {/* Fallback 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          
          {showHeaderFooter && (
            <>
              {shouldShowContactBanner && (
                <div className="mb-12">
                  <ContactBanner />
                </div>
              )}
              <Footer />
            </>
          )}
        </div>
      </TooltipProvider>
    </>
  );
};

const App = () => {
  console.log('App component mounting...');
  const [showDebugConsole, setShowDebugConsole] = useState(import.meta.env.DEV || false);

  // Run database migrations when the app starts
  useEffect(() => {
    const runMigrations = async () => {
      try {
        // Ensure mood mentor profiles schema
        await moodMentorService.ensureMoodMentorProfileSchema();
        
        // Ensure mood mentor dashboard schema
        await moodMentorService.ensureDashboardSchema();
        
        console.log("Database schema checks completed");
      } catch (error) {
        console.error("Error running migrations:", error);
      }
    };
    
    // Enable debug console with keyboard shortcut (Shift+Alt+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'D') {
        setShowDebugConsole(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    runMigrations();
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="app-container">
              <Toaster />
              <Sonner position="top-right" closeButton />
              <AppContent />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;



