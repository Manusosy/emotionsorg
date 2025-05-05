# Authentication System Documentation

This document provides detailed information about the authentication system implemented in the Emotions App. It outlines the authentication flow, user roles, security measures, and implementation details for developers.

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Authentication Flow](#authentication-flow)
- [Implementation Details](#implementation-details)
- [Protected Routes](#protected-routes)
- [Dashboard Access](#dashboard-access)
- [Security Considerations](#security-considerations)
- [Development and Testing](#development-and-testing)

## Overview

The Emotions App implements a comprehensive authentication system with role-based access control. The system is designed to provide secure access to different features based on user roles while maintaining a seamless user experience.

Authentication is handled through the `authService` which provides a consistent interface for all authentication-related operations. The current implementation uses a mock authentication service for development purposes, which can be replaced with a production implementation (such as Firebase Auth, Auth0, or a custom backend) without changing the application code.

## User Roles

The application supports three primary user roles:

1. **Patient** (`'patient'`)
   - Regular users seeking emotional support and mental health services
   - Access to personal dashboard, journaling, mood tracking, appointments

2. **Mood Mentor** (`'mood_mentor'`)
   - Mental health professionals providing support to patients
   - Access to patient management, scheduling, messaging, professional tools

3. **Admin** (`'admin'`)
   - System administrators with complete access
   - Can manage users, view analytics, configure system settings

Each role has its own dashboard, navigation options, and accessible features.

## Authentication Flow

### Registration (Sign Up)

File: `src/features/auth/pages/Signup.tsx`

1. User navigates to the signup page
2. Completes the registration form with:
   - Email
   - Password
   - Name
   - Role selection (patient or mood mentor)
3. Form validation is performed using React Hook Form with Zod schema validation
4. On submission, `authService.signUp()` is called with credentials and user data
5. Upon successful registration, user is redirected to:
   - Patient dashboard for patient role
   - Mood mentor dashboard for mood mentor role

### Login

File: `src/features/auth/pages/Login.tsx`

1. User navigates to the login page
2. Enters email and password
3. Form validation occurs on submission
4. `authService.signIn()` is called with the provided credentials
5. Upon successful authentication:
   - JWT token is stored in local storage
   - User data is saved in auth context
   - User is redirected to the appropriate dashboard based on role

### Password Reset

Files:
- `src/features/auth/pages/ForgotPassword.tsx`
- `src/features/auth/pages/ResetPassword.tsx`

1. User requests password reset from the login page
2. Enters email address on the forgot password page
3. Reset link is sent to the provided email (simulated in development)
4. User clicks the reset link and enters a new password
5. Password is updated using `authService.updatePassword()`

### Logout

1. User clicks logout button
2. `authService.signOut()` is called
3. Auth state is cleared from local storage and context
4. User is redirected to the login page

## Implementation Details

### Auth Service

File: `src/services/auth/auth.service.ts`

The auth service implements the `IAuthService` interface defined in `src/services/auth/auth.interface.ts`, which includes:

```typescript
interface IAuthService {
  signIn(credentials: AuthCredentials): Promise<AuthResponse>;
  signUp(credentials: AuthCredentials, userData?: Partial<User>): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<{ error: string | null }>;
  updatePassword(password: string, token?: string): Promise<{ error: string | null }>;
  updateUser(data: Partial<User>): Promise<{ user: User | null; error: string | null }>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
```

The development implementation (`MockAuthService`) simulates backend functionality with local storage to persist user sessions.

### Auth Context

File: `src/contexts/authContext.tsx`

The AuthContext provides global access to:

1. Current authenticated user
2. Authentication status
3. User role
4. Authentication functions

```typescript
const AuthContext = React.createContext<{
  user: User | null;
  isAuthenticated: boolean;
  userRole: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, userData?: Partial<User>) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<{ user: User | null; error: string | null }>;
  getDashboardUrlForRole: (role: string | null) => string;
}>({
  // Default values...
});
```

### Auth Hooks

File: `src/hooks/use-auth.ts`

The `useAuth` hook provides easy access to the auth context:

```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

## Protected Routes

File: `src/App.tsx`

The application implements protected routes to restrict access based on user roles. This is handled by the `ProtectedRoute` component:

```typescript
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

  // Check auth state...
  useEffect(() => {
    const checkAuth = async () => {
      // Skip if we've already authorized based on stored state
      if (hasCheckedAuth && isAuthorized) return;
      
      // Wait until authentication check is complete
      if (isLoading) return;

      if (!isAuthenticated) {
        // Redirect to login
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
        return;
      }

      // Check if user has required role
      const hasRequiredRole =
        effectiveAllowedRoles.length === 0 || 
        (userRole && effectiveAllowedRoles.includes(userRole as UserRole));

      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard
        window.location.href = getDashboardUrlForRole(userRole);
        return;
      }

      // User is authenticated and authorized
      setIsAuthorized(true);
      setHasCheckedAuth(true);
    };

    checkAuth();
  }, [isAuthenticated, userRole, pathname, effectiveAllowedRoles, navigate, isLoading, getDashboardUrlForRole, hasCheckedAuth, isAuthorized]);

  // Render component if authorized...
}
```

Routes are defined in the application with appropriate role restrictions:

```typescript
// Patient routes
<Route 
  path="/patient-dashboard" 
  element={
    <ProtectedRoute requiredRole="patient">
      <PatientDashboard />
    </ProtectedRoute>
  } 
/>

// Mood mentor routes
<Route 
  path="/mood-mentor-dashboard" 
  element={
    <ProtectedRoute requiredRole="mood_mentor">
      <MoodMentorDashboard />
    </ProtectedRoute>
  } 
/>
```

## Dashboard Access

### Patient Dashboard

File: `src/features/dashboard/pages/PatientDashboard.tsx`

The patient dashboard provides:
- Mood analytics and tracking
- Journal entry management
- Appointment scheduling with mood mentors
- Resource access
- Messaging with assigned mood mentors
- Profile management

Authentication checks are performed on dashboard load:
```typescript
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await authService.getCurrentUser();
      
      // Check local storage for auth data when no session found
      if (!session) {
        const storedAuthState = localStorage.getItem('auth_state');
        if (storedAuthState) {
          try {
            const { isAuthenticated, userRole } = JSON.parse(storedAuthState);
            if (!isAuthenticated || userRole !== 'patient') {
              navigate('/login');
              return;
            }
          } catch (e) {
            console.error("Error parsing stored auth state:", e);
            navigate('/login');
            return;
          }
        } else {
          navigate('/login');
          return;
        }
      }
      
      // Load dashboard data...
    } catch (error) {
      // Handle errors...
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchDashboardData();
}, [navigate]);
```

### Mood Mentor Dashboard

File: `src/features/mood_mentors/pages/MoodMentorDashboard.tsx`

The mood mentor dashboard provides:
- Patient management and overview
- Appointment scheduling and calendar
- Messaging with patients
- Resource management
- Profile settings
- Analytics for patient progress

Similar authentication checks are performed as with the patient dashboard.

## Security Considerations

### Token Storage

Authentication tokens are stored in localStorage for persistence across sessions. For production, consider implementing:
- Token refresh mechanisms
- HttpOnly cookies for additional security
- Short token expiration with refresh tokens

### Password Security

Password management follows security best practices:
- Passwords are never stored in plain text
- Password reset uses secure one-time tokens
- Minimum password strength requirements

### Session Management

Sessions are managed through:
- Authentication state tracking in React context
- Local storage persistence with token validation
- Automatic session restoration on page reload

## Development and Testing

### Mock Authentication

For development, the app uses a mock authentication service (`MockAuthService`) that simulates backend authentication. This allows developers to test the application without setting up a real backend.

Default test accounts:
- Patient: `user@example.com` / `password123`
- Mood Mentor: `mentor@example.com` / `password123`

### Testing Protected Routes

To test different role access:
1. Log in with the appropriate test account
2. Navigate to different sections of the application
3. Verify that access is properly restricted based on role

### Implementing Production Authentication

To replace the mock auth with a production service:

1. Create a new implementation of the `IAuthService` interface
2. Update the service export in `src/services/auth/index.ts`
3. Configure environment variables for API endpoints
4. Test the authentication flow with the new implementation

Example implementation with a real backend:

```typescript
export class ApiAuthService implements IAuthService {
  private apiUrl = process.env.API_URL || 'https://api.emotions-app.com';
  
  async signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { user: null, error: data.message };
      }
      
      // Store token in localStorage
      localStorage.setItem('authToken', data.token);
      
      return { 
        user: data.user, 
        error: null,
        session: { token: data.token }
      };
    } catch (error) {
      return { user: null, error: 'Network error' };
    }
  }
  
  // Implement other methods...
}
```

The interface-based approach ensures that the application can use different authentication providers without changing the application code. 