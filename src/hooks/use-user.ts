import { authService, userService } from '../services';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        
        // Get user from auth
        const authUser = await authService.getCurrentUser();
        
        if (!authUser) {
          setUser(null);
          return;
        }
        
        // Get extended user info using userService
        const { data: userData, error: userError } = await userService.getUserProfile(authUser.id);
        
        if (userError) {
          console.error('Error fetching user data:', userError);
        }
        
        // Combine auth user with database user data
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: userData?.full_name || authUser?.full_name,
          role: userData?.role || authUser?.role || 'patient',
          avatar_url: userData?.avatar_url || authUser?.avatar_url
        });
      } catch (err) {
        console.error('Error in useUser hook:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
    
    // Set up auth state subscription
    const unsubscribe = authService.onAuthStateChange(() => {
      getUser();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  return { user, loading, error };
} 


