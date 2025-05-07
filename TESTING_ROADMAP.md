# Emotions App Testing Roadmap

This document outlines the testing plan for the Emotions App, focusing on key features to be tested without requiring backend configuration.

## Core Features

### Authentication
- [ ] Login flow
- [ ] Registration
- [ ] Password reset (pending for production)

### Patient Dashboard
- [x] Welcome dialog (added button to force display for testing)
- [x] Stress assessment functionality (implemented test mode with sessionStorage)
- [x] Emotional wellness check-in (implemented test mode with sessionStorage)
- [x] Health analytics reports (generates mock charts and reports with historical data)
- [x] Consistency tracking improvements (more accurate day-based tracking)
- [x] Daily averages for accurate data presentation
- [x] Weekly notification system for consistency encouragement
- [x] Mood analytics with time-based filtering (week/month/year views)
- [x] Export functionality for reports (PDF and CSV formats)
- [ ] Goal tracking
- [ ] Appointment scheduling
- [ ] Resources viewing

### Therapist Portal
- [ ] Patient management
- [ ] Notes functionality
- [ ] Assessment reviews
- [ ] Appointment scheduling

## Testing Mode Implementation
A testing mode has been implemented that allows for local testing of key features without requiring actual database configuration. This includes:

1. **Welcome Dialog Test**: Added a button to force-display the welcome dialog for testing its functionality.

2. **Stress Assessment Test Mode**: 
   - Uses sessionStorage instead of database calls
   - Updates the UI and emotional health wheel in real-time
   - Maintains an accurate stress level displayed as a percentage (0-100%)
   - Provides realistic feedback based on user input

3. **Emotional Wellness Check-in Test Mode**:
   - Allows saving mood assessments without database connection
   - Updates mood summary in real-time with realistic data visualization
   - Toast notifications indicate successful test operations
   - Properly calculates and displays decimal scores (e.g., 7.5/10)

4. **Health Analytics Reports**:
   - Generates realistic charts and analytics based on test data
   - Uses daily averages instead of individual test scores for accuracy
   - Shows "Gathering Data" status for first-time users
   - Prompts users to check in tomorrow to see trends
   - Properly formats all percentages as whole numbers

5. **Consistency Tracking**:
   - Tracks check-ins on a daily basis (not per test)
   - Shows the specific number of check-ins per day with color coding
   - Enhanced gradient coloring for different check-in quantities (1-4+)
   - Improved hover tooltips showing exact check-in counts
   - Uses only real dates from actual user check-ins

6. **Weekly Notification System**:
   - Sends encouragement notifications based on consistency
   - Scheduled to appear at 7am on the seventh day
   - Customizes messages based on user's check-in frequency
   - Simulates email notifications in test mode
   - Provides positive reinforcement through toast notifications

7. **Mood Analytics with Time Filtering**:
   - Provides week/month/year views of mood data
   - Recalculates statistics based on the selected time period
   - Shows proper empty states when no data is available for a time period
   - Updates in real-time when a new mood assessment is completed
   - Maintains consistent calculation methods across components
   - Properly formats decimal values for average scores

8. **Journal Functionality**:
   - Supports creating and editing journal entries without database connection
   - Saves to sessionStorage for persistence during testing
   - Provides real-time feedback through toast notifications
   - Supports mood tagging and tomorrow's intentions in entries
   - Properly maps between interface and component data models
   - Fully functional in both dashboard and standalone journal interface

All test data is stored in sessionStorage, which allows for persistent testing during the session but requires no database configuration. This implementation aims to provide a realistic testing experience while maintaining isolation from production systems.

### Implemented Test Features
- **Stress Assessment**: Records test data to sessionStorage and updates analytics in real-time
- **Emotional Wellness Check-in**: Saves mood tracking data to sessionStorage
- **Journal Entries**: Supports creating and viewing journal entries in test mode
- **UI Error Suppression**: Automatically removes error messages related to database connections
- **Time-based Analysis**: Filters and displays data by week, month, or year periods

To add more features to test mode, follow the pattern of checking for test mode and implementing sessionStorage alternatives for database calls.

## How to Test
1. Make sure Supabase credentials are not configured in your environment
2. Run the application normally
3. All database operations will automatically use test mode with sessionStorage
4. UI will update in real-time to reflect changes, even without database connectivity

## Testing Approach
1. Component testing: Test individual components in isolation
2. Integration testing: Test how components work together
3. User flow testing: Test complete user journeys through the application

## Focus Areas
- User interface functionality
- Component interactions
- Data flow between components
- Responsive design and mobile usability

## 1. Authentication & User Management
- [x] Patient login functionality
- [x] Mentor login functionality
- [ ] Password reset flow
- [ ] User profile update
- [ ] Avatar/profile image upload

## 2. Dashboard Core Features

### Patient Dashboard
- [x] Welcome section displays correctly
- [x] Emotional health records show proper stats
- [x] Mood score display
- [x] Stress level visualization
- [x] Last check-in information
- [x] Consistency tracking

> **Note**: Stress assessment operates in test mode for UI/flow testing. Assessment data is stored in session storage rather than the database to allow testing without backend configuration.

### Mentor Dashboard
- [ ] Welcome section shows mentor name
- [ ] Stats section shows patient count
- [ ] Upcoming appointments display
- [ ] Support groups count
- [ ] Patient satisfaction metrics

## 3. Appointment Management (Shared)

#### Patient Side
- [ ] View upcoming appointments
- [ ] Schedule new appointment with mentor
- [ ] Cancel/reschedule existing appointment
- [ ] View appointment history
- [ ] Export appointment reports to PDF

#### Mentor Side
- [ ] View all scheduled appointments
- [ ] Accept/reject appointment requests
- [ ] Update appointment status
- [ ] View patient history before appointment
- [ ] Record notes after appointment

## 4. Messaging System (Shared)

#### Patient Side
- [ ] Send message to assigned mentor
- [ ] View message history
- [ ] Receive and read notifications
- [ ] Attachment functionality (if applicable)

#### Mentor Side
- [ ] View messages from all patients
- [ ] Reply to patient messages
- [ ] Search message history
- [ ] Bulk message management

## 5. Mood Tracking (Core Patient Feature)

- [x] Daily mood check-in
- [x] Emotional health wheel interaction
- [x] Mood trends visualization
- [x] Stress assessment tool
- [x] Journal entry creation tied to mood
- [x] Time-based filtering (week/month/year views)

#### Mentor Access
- [ ] View patient mood data
- [ ] Analyze mood patterns
- [ ] Generate insights from mood data

## 6. Journal Functionality

#### Patient Side
- [x] Create new journal entry
- [x] Edit existing entries
- [x] Associate mood with journal entries
- [x] View journal history
- [ ] Search journal entries
- [x] Fixed journal access restrictions for mood mentors on all journal pages

#### Mood Mentor Side
- [ ] Access patient journal entries (if permitted)
- [ ] Comment on journal entries
- [ ] Recommend journal prompts

## 7. Mood Mentor Profiles

#### Mentor Profile Management
- [x] Create and edit mentor profile
- [x] Save profile with all required fields
- [x] Upload and display profile image
- [x] Generate proper URL slugs for profiles
- [ ] Edit specialties and therapy types
- [ ] Set availability schedule

#### Mentor Directory
- [x] Display real mentor profiles in directory
- [x] Proper URL structure for mentor profiles
- [x] Filter mentors by specialty, location and rating
- [x] Search functionality for mentors
- [x] Consistent card design with ambassador mock data

#### Profile Display
- [x] View mentor profile details
- [ ] Book appointments with mentors
- [ ] View mentor ratings and reviews
- [ ] Contact mentor through platform

## 8. Support Groups

#### Patient Side
- [ ] View available support groups
- [ ] Join/leave groups
- [ ] Group discussion participation
- [ ] View group resources

#### Mentor Side
- [ ] Create/manage support groups
- [ ] Add patients to groups
- [ ] Post group resources
- [ ] Schedule group meetings

## 9. Resource Management

#### Patient Side
- [ ] Access mental health resources
- [ ] Save favorite resources
- [ ] Rate resources usefulness
- [ ] Track resource completion

#### Mentor Side
- [ ] Upload new resources
- [ ] Assign resources to patients
- [ ] Track patient resource engagement
- [ ] Recommend personalized resources

## 10. Reports & Analytics

#### Patient Side
- [x] View personal progress reports
- [x] Generate wellness report
- [x] Export data for external use
  - [x] PDF export for all report sections
  - [x] CSV export for raw data
- [x] Filter analytics by time period (week/month/year)

#### Mentor Side
- [ ] View analytics across patients
- [ ] Generate patient progress reports
- [ ] Identify intervention points
- [ ] Track effectiveness of treatment plans

## 11. Notifications System

#### Patient Side
- [x] Appointment reminders
- [x] Mood check-in reminders
- [x] Resource recommendations
- [x] Weekly consistency notifications

#### Mentor Side
- [ ] New patient notifications
- [ ] Appointment alerts
- [ ] Patient mood decline alerts
- [ ] System update notifications

## 12. Settings & Preferences

#### Patient Side
- [ ] Update profile information
- [ ] Privacy preferences
- [ ] Notification settings
- [ ] Data sharing permissions

#### Mentor Side
- [ ] Professional profile settings
- [ ] Availability management
- [ ] Communication preferences
- [ ] Patient visibility settings

## 13. Mobile Responsiveness

- [ ] Patient dashboard on mobile
- [ ] Mentor dashboard on mobile
- [ ] Appointment booking on mobile
- [ ] Messaging on mobile
- [ ] Mood tracking on mobile

## Testing Procedure

1. For each feature, test first as a patient, then as a mentor
2. Document any issues in the DEBUGGING.md file
3. Take screenshots of successful features for documentation
4. For shared features, test the complete workflow (e.g., patient books appointment → mentor receives and accepts → patient gets notification)

## Test Account Credentials

### Patient Account
- Email: user@example.com
- Password: password123

### Mentor Account
- Email: mentor@example.com
- Password: password123 