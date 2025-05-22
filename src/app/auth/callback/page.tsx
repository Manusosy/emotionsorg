import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/authContext';
import { isCountryAllowedForMentors } from '@/features/auth/utils/mentor-countries';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchParams = useSearchParams()[0];
  const { userRole, getDashboardUrlForRole } = useAuth();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          // Try to exchange the code for a session
          const { error: authError } = await supabase.auth.exchangeCodeForSession(
            window.location.search
          );
          
          if (authError) {
            throw authError;
          }
        }
        
        // Get user role preferences from URL
        const userType = searchParams.get('userType');
        const isSignUp = searchParams.get('isSignUp') === 'true';
        
        // If this is a sign-up, we need to add role metadata
        if (isSignUp && userType) {
          const role = userType === 'mentor' ? 'mood_mentor' : 'patient';
          
          // Get the latest user data
          const { data: { user } } = await supabase.auth.getUser();
          
          // For mood mentors, check if they are from an allowed country
          if (role === 'mood_mentor' && user?.user_metadata?.country) {
            const countryCode = user.user_metadata.country;
            if (!isCountryAllowedForMentors(countryCode)) {
              // Country not allowed for mentors, sign out and redirect to error page
              await supabase.auth.signOut();
              setError('Mood Mentor sign up is currently only available in Kenya, Uganda, Rwanda, Sierra Leone, and Ghana. Please sign up as a patient instead.');
              return;
            }
          }
          
          // Update user metadata with role
          await supabase.auth.updateUser({
            data: { role }
          });
          
          // Create appropriate profile
          if (user) {
            if (role === 'patient') {
              // Create patient profile
              const { error: profileError } = await supabase.from('patient_profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Patient User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
              if (profileError) {
                console.error('Error creating patient profile:', profileError);
              }
            } else if (role === 'mood_mentor') {
              // Create mood mentor profile with required fields
              const { error: profileError } = await supabase.from('mood_mentor_profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Mood Mentor',
                specialty: 'General', // Default specialty
                // Add country from user metadata if available
                location: user.user_metadata?.country_name || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
              if (profileError) {
                console.error('Error creating mood mentor profile:', profileError);
              }
            }
          }
        }
        
        // Get the latest user data after updates
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        const role = updatedUser?.user_metadata?.role;
        
        // Navigate to appropriate dashboard based on role
        if (role === 'mood_mentor') {
          navigate('/mood-mentor-dashboard');
        } else {
          navigate('/patient-dashboard');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
      }
    };
    
    handleCallback();
  }, [navigate, searchParams]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Homepage
          </button>
        </div>
      ) : (
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Completing authentication, please wait...</p>
        </div>
      )}
    </div>
  );
} 