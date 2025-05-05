# Dashboard Features Documentation

This document provides detailed information about the different dashboards available in the Emotions App, their features, access requirements, and technical implementation.

## Table of Contents

- [Overview](#overview)
- [Dashboard Types](#dashboard-types)
- [Patient Dashboard](#patient-dashboard)
- [Mood Mentor Dashboard](#mood-mentor-dashboard)
- [Admin Dashboard](#admin-dashboard)
- [Dashboard Components](#dashboard-components)
- [Data Flow](#data-flow)
- [Extending Dashboards](#extending-dashboards)

## Overview

Emotions App provides role-specific dashboards that serve as command centers for users to access all relevant features. Each dashboard is designed to provide the specific tools needed for the user's role, ensuring a streamlined experience tailored to their needs.

Dashboards are protected routes that require authentication and appropriate role authorization. They integrate with multiple services to display comprehensive data and interactive functionality.

## Dashboard Types

The application has three primary dashboard types, each corresponding to a user role:

1. **Patient Dashboard**: For individuals seeking emotional support
2. **Mood Mentor Dashboard**: For mental health professionals
3. **Admin Dashboard**: For system administrators

## Patient Dashboard

File: `src/features/dashboard/pages/PatientDashboard.tsx`

### Access Requirements

- User must be authenticated
- User must have the `patient` role
- Protected by `<ProtectedRoute requiredRole="patient">`

### Core Features

1. **Mood Tracking and Analytics**
   - Visual mood history with charts and graphs
   - Mood assessment tool for checking in
   - Emotional health wheel visualization
   - Historical mood data analysis

2. **Appointments Management**
   - View upcoming appointments
   - Appointment history with notes
   - Export appointment details as PDF
   - Filter appointments by status

3. **Journal Management**
   - Quick access to recent journal entries
   - Create new journal entries
   - View journal statistics
   - Search journal content

4. **Resource Access**
   - Mental health resources library
   - Favorite resources for quick access
   - Resource recommendations based on mood

5. **Messaging Center**
   - Communication with assigned mood mentors
   - Message notifications
   - Conversation history

6. **Profile and Settings**
   - Personal information management
   - Notification preferences
   - Privacy settings
   - Account management

### Technical Implementation

The Patient Dashboard uses a combination of components:

- `MoodAnalytics` for visualizing mood data
- `MoodSummaryCard` for displaying current mood state
- `EmotionalHealthWheel` for comprehensive emotional visualization
- `DashboardMoodAssessment` for quick mood check-ins

Data loading occurs on component mount:

```typescript
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user profile
      const userProfileResponse = await userService.getUserProfile();
      if (userProfileResponse.data) {
        setProfile(userProfileResponse.data);
      }
      
      // Fetch appointments
      const appointmentsResponse = await appointmentService.getPatientAppointments();
      if (appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
      }
      
      // Fetch messages
      const messagesResponse = await messageService.getRecentMessages();
      if (messagesResponse.data) {
        setMessages(messagesResponse.data);
      }
      
      // Fetch journal entries
      const journalResponse = await dataService.getRecentJournalEntries();
      if (journalResponse.data) {
        setRecentJournalEntries(journalResponse.data);
      }
      
      // Fetch mood data
      const moodResponse = await dataService.getUserMoodData();
      if (moodResponse.data) {
        // Process mood data for visualization
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("There was a problem loading your dashboard data");
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchDashboardData();
}, []);
```

## Mood Mentor Dashboard

File: `src/features/mood_mentors/pages/MoodMentorDashboard.tsx`

### Access Requirements

- User must be authenticated
- User must have the `mood_mentor` role
- Protected by `<ProtectedRoute requiredRole="mood_mentor">`

### Core Features

1. **Patient Management**
   - List of assigned patients
   - Patient mood and progress tracking
   - Patient notes and history
   - Filter and search patients

2. **Appointment Scheduling**
   - Calendar view of appointments
   - Create and manage appointment slots
   - Set recurring availability
   - Appointment reminders

3. **Session Tools**
   - Session notes template
   - Resource recommendation tool
   - Treatment planning
   - Progress tracking

4. **Resource Management**
   - Create and share resources
   - Resource categories and tags
   - Resource analytics (views, shares)

5. **Support Groups**
   - Create and manage support groups
   - Group scheduling
   - Group member management
   - Group resources

6. **Professional Profile**
   - Professional credentials
   - Specialization areas
   - Availability settings
   - Patient reviews

### Technical Implementation

The Mood Mentor Dashboard implements specialized components:

- `PatientList` for managing assigned patients
- `AppointmentCalendar` for scheduling visualization
- `SessionNotes` for structured session documentation
- `AvailabilityManager` for setting available time slots

Authentication and authorization checks are similar to the Patient Dashboard, ensuring only mood mentors can access:

```typescript
useEffect(() => {
  const checkMoodMentorAccess = async () => {
    const { data } = await authService.getCurrentUser();
    
    if (!data.session || data.user?.role !== 'mood_mentor') {
      navigate('/login');
      return;
    }
    
    // Load mood mentor specific data
    await loadMoodMentorDashboard();
  };
  
  checkMoodMentorAccess();
}, [navigate]);
```

## Admin Dashboard

File: `src/features/admin/pages/AdminDashboard.tsx`

### Access Requirements

- User must be authenticated
- User must have the `admin` role
- Protected by `<ProtectedRoute requiredRole="admin">`

### Core Features

1. **User Management**
   - View all users (patients and mood mentors)
   - User account management
   - Role assignment and permissions
   - Account verification

2. **Platform Analytics**
   - Usage statistics
   - Engagement metrics
   - Growth analytics
   - Performance monitoring

3. **Content Management**
   - Resource library management
   - Educational content editing
   - System announcements
   - FAQ management

4. **System Configuration**
   - Application settings
   - Email templates
   - Integration management
   - Feature toggles

### Technical Implementation

The Admin Dashboard has restricted access with additional security checks:

```typescript
// Additional security measures for admin routes
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Verify admin role with additional security check
    const verifyAdminAccess = async () => {
      try {
        // Additional verification beyond role check
        const { data: adminVerification } = await apiService.verifyAdminAccess();
        
        if (!adminVerification.isVerified) {
          // Log security violation attempt
          await apiService.logSecurityEvent({
            type: 'unauthorized_admin_access',
            userId: userRole?.id || 'unknown'
          });
          
          navigate('/login');
        }
      } catch (error) {
        console.error("Admin verification failed:", error);
        navigate('/login');
      }
    };
    
    if (isAuthenticated && userRole === 'admin') {
      verifyAdminAccess();
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, userRole, navigate]);
  
  if (userRole !== 'admin') return null;
  
  return <>{children}</>;
}
```

## Dashboard Components

### Shared Components

Several components are shared across different dashboards:

1. **DashboardLayout**
   - File: `src/features/dashboard/components/DashboardLayout.tsx`
   - Provides consistent layout for all dashboards
   - Handles sidebar, header, and content area
   - Responsive design for all screen sizes

2. **NotificationCenter**
   - Displays user notifications
   - Handles notification marking as read
   - Supports different notification types

3. **UserProfileSummary**
   - Shows user avatar and basic info
   - Quick access to profile settings
   - Online status indicator

### Dashboard-Specific Components

1. **MoodAnalytics** (Patient Dashboard)
   - File: `src/features/dashboard/components/MoodAnalytics.tsx`
   - Visualizes mood data using charts
   - Provides insights on emotional patterns
   - Supports different time ranges

2. **PatientList** (Mood Mentor Dashboard)
   - File: `src/features/mood_mentors/components/PatientList.tsx`
   - Lists assigned patients with key information
   - Search and filter capabilities
   - Quick actions for patient management

3. **UserManagement** (Admin Dashboard)
   - File: `src/features/admin/components/UserManagement.tsx`
   - Complete user administration interface
   - Role assignment and permissions
   - Account verification and management

## Data Flow

Dashboard data flow follows a consistent pattern:

1. **Authentication Check**: Verify user is authenticated with correct role
2. **Initial Data Loading**: Fetch core data on component mount
3. **State Management**: Store data in component state or context
4. **User Interactions**: Handle user actions with appropriate service calls
5. **Real-time Updates**: Use polling or WebSocket for time-sensitive data

Example flow for the Patient Dashboard:

```
User Login → Auth Check → Dashboard Access → Data Loading → UI Rendering → Interaction Handling
```

Services used:
- `authService` for authentication verification
- `userService` for profile information
- `dataService` for mood and journal data
- `appointmentService` for scheduling information
- `messageService` for communication
- `patientService` for patient-specific operations

## Extending Dashboards

### Adding New Dashboard Features

To extend a dashboard with new features:

1. Create a new component in the appropriate feature directory
2. Add necessary service methods for data handling
3. Integrate the component into the dashboard layout
4. Add any required routes in `App.tsx`
5. Update authentication checks if needed

Example of adding a new widget to the Patient Dashboard:

```typescript
// 1. Create the component
// src/features/dashboard/components/ProgressTracker.tsx
export const ProgressTracker = () => {
  const [progressData, setProgressData] = useState([]);
  
  useEffect(() => {
    const fetchProgressData = async () => {
      const { data } = await dataService.getPatientProgress();
      setProgressData(data);
    };
    
    fetchProgressData();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress visualization */}
      </CardContent>
    </Card>
  );
};

// 2. Add to dashboard
// In PatientDashboard.tsx
<DashboardGrid>
  <MoodSummaryCard />
  <AppointmentsSummary />
  <ProgressTracker /> {/* New component */}
  <JournalSummary />
</DashboardGrid>
```

### Creating a New Dashboard

To create an entirely new dashboard type:

1. Define the new user role in the authentication system
2. Create a new dashboard component in the appropriate feature directory
3. Add protected routes in `App.tsx`
4. Implement role-based redirects in the authentication system
5. Add dashboard-specific components and services

For example, to add a "Researcher" dashboard:

```typescript
// Add new role type
type UserRole = 'patient' | 'mood_mentor' | 'admin' | 'researcher';

// Create dashboard file
// src/features/researcher/pages/ResearcherDashboard.tsx

// Add protected route
<Route 
  path="/researcher-dashboard" 
  element={
    <ProtectedRoute requiredRole="researcher">
      <ResearcherDashboard />
    </ProtectedRoute>
  } 
/>

// Update role redirection
const getDashboardUrlForRole = (role: string | null): string => {
  switch (role) {
    case 'patient':
      return '/patient-dashboard';
    case 'mood_mentor':
      return '/mood-mentor-dashboard';
    case 'admin':
      return '/admin-dashboard';
    case 'researcher':
      return '/researcher-dashboard';
    default:
      return '/login';
  }
};
``` 