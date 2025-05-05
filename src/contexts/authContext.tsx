import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService } from '../services/auth/auth.service';
import { User, UserRole } from '../types/user';
import { AuthResponse, AuthCredentials } from '../services/auth/auth.interface';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole | null;
  signIn: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  signUp: (data: { email: string; password: string; firstName: string; lastName: string; role: UserRole; country: string; gender?: string | null; }) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getDashboardUrlForRole: (role: string | undefined) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setUserRole(currentUser.role as UserRole || null);
          
          // Store auth state in localStorage for faster loading
          localStorage.setItem('auth_state', JSON.stringify({
            isAuthenticated: true,
            userRole: currentUser.role,
          }));
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setUserRole(null);
          localStorage.removeItem('auth_state');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
        setIsAuthenticated(false);
        setUserRole(null);
        localStorage.removeItem('auth_state');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.signIn(credentials as AuthCredentials);
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setUserRole(response.user.role as UserRole || null);
        
        // Store auth state in localStorage
        localStorage.setItem('auth_state', JSON.stringify({
          isAuthenticated: true,
          userRole: response.user.role,
        }));
      } else {
        throw new Error('User not found after sign in');
      }
      return response;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: { email: string; password: string; firstName: string; lastName: string; role: UserRole; country: string; gender?: string | null; }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const userData = {
        name: `${data.firstName} ${data.lastName}`,
        role: data.role
      };
      const response = await authService.signUp({
        email: data.email,
        password: data.password
      } as AuthCredentials, userData);
      
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setUserRole(response.user.role as UserRole || null);
        
        // Store auth state in localStorage
        localStorage.setItem('auth_state', JSON.stringify({
          isAuthenticated: true,
          userRole: response.user.role,
        }));
      } else {
        throw new Error('User not found after sign up');
      }
      return response;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      console.log("Auth context: Starting signout process");
      
      // First clear auth state in localStorage to prevent flashing of content
      localStorage.removeItem('auth_state');
      
      // Update state immediately for better UI responsiveness
      setUser(null);
      setIsAuthenticated(false);
      setUserRole(null);
      
      // Then sign out from the service
      await authService.signOut();
      
      console.log("Auth context: Signout completed successfully");
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const getDashboardUrlForRole = useCallback((role?: string | null) => {
    if (!role) return '/signin';
    
    switch (role) {
      case 'patient':
        return '/patient-dashboard';
      case 'mood_mentor':
        return '/mood-mentor-dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/signin';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        userRole,
        signIn,
        signUp,
        signOut,
        resetPassword,
        getDashboardUrlForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 