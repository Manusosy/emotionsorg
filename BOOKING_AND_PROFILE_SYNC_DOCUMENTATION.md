# Booking System and Profile Synchronization Documentation

## 1. Profile Synchronization Strategy

### Current Implementation

The profile synchronization system we've implemented ensures that user profiles are consistent between the dashboard and public profile pages. This is currently achieved through localStorage, but the design pattern can be migrated to a database-backed solution for production.

#### Key Components:

1. **Data Sources**:
   - `mentor_profile_data`: Primary storage for mentor profile information
   - `test_mentor_profile`: Used for test mode profiles
   - In-memory collection (`moodMentors`): Used for runtime access

2. **Synchronization Methods**:
   - `syncProfileToAllKeys()`: Ensures all storage locations have consistent data
   - `syncTestMentorProfile()`: API endpoint for manual synchronization
   - `updateMoodMentorProfile()`: Updates profile and ensures synchronized state

3. **Field Mapping Strategy**:
   - Bi-directional field mapping between different naming conventions (e.g., `bio` ⟷ `about`)
   - Type-safe handling of complex fields (education and experience arrays)
   - Default values for required fields

### Production Implementation Plan

For production, we recommend the following database schema:

```sql
CREATE TABLE mood_mentor_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  bio TEXT,
  about TEXT,
  specialties TEXT[],
  experience_years INTEGER,
  rating DECIMAL(3,2),
  review_count INTEGER,
  hourly_rate DECIMAL(10,2),
  avatar_url TEXT,
  name_slug VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  gender VARCHAR(50),
  languages TEXT[],
  therapy_types TEXT[],
  specialty VARCHAR(255),
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mood_mentor_education (
  id UUID PRIMARY KEY,
  mentor_id UUID REFERENCES mood_mentor_profiles(id),
  degree VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  year VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mood_mentor_experience (
  id UUID PRIMARY KEY,
  mentor_id UUID REFERENCES mood_mentor_profiles(id),
  title VARCHAR(255) NOT NULL,
  place VARCHAR(255),
  duration VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Data Synchronization Process

1. **On Profile Update**:
   - Update the main profile record in `mood_mentor_profiles`
   - Update/insert related records in `mood_mentor_education` and `mood_mentor_experience`
   - Ensure `bio` and `about` fields contain the same value
   - Generate/update the `name_slug` field based on the name

2. **On Profile Retrieval**:
   - Join the profile with education and experience tables
   - Format the data consistently for display
   - Use the same field names in API responses

## 2. Booking System Documentation

### Current Implementation

The booking system allows users to schedule appointments with mood mentors through a step-by-step process.

#### Key Components:

1. **BookingButton**: Entry point for the booking flow
   - Redirects to the booking page with mentor ID and slug parameters
   - Uses clean, semantic URLs for better SEO and user experience

2. **BookingPage**: Multi-step booking wizard
   - **Step 1**: Specialty selection
   - **Step 2**: Appointment type selection (Video/Audio/Chat)
   - **Step 3**: Date and time selection
   - **Step 4**: User information collection
   - **Step 5**: Payment details (currently mocked)
   - **Step 6**: Confirmation

3. **BookingModal**: Quick booking alternative
   - Simplified flow for authenticated users
   - Collects only essential information (date, time, notes)

4. **AppointmentService**: Backend service
   - `bookAppointment()`: Creates new appointments
   - `getAvailableSlots()`: Checks mentor availability
   - `getPatientAppointments()`: Retrieves user's bookings
   - `getMoodMentorAppointments()`: Retrieves mentor's bookings

### Data Collection

The booking flow collects the following information:

1. **Patient Information**:
   - Name
   - Email
   - Phone (optional)
   - Concerns/Notes

2. **Appointment Details**:
   - Selected specialty
   - Appointment type (Video/Audio/Chat)
   - Date
   - Time slot
   - Mentor ID

### Authentication Integration

- Allows guest users to start the booking process
- Stores booking data in localStorage if user navigates to login
- Restores booking data after successful authentication
- Prefills form fields with user profile data when available

### Production Implementation Plan

For production, we recommend the following database schema:

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  mood_mentor_id UUID REFERENCES mood_mentor_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mentor_availability (
  id UUID PRIMARY KEY,
  mentor_id UUID REFERENCES mood_mentor_profiles(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mentor_blocked_dates (
  id UUID PRIMARY KEY,
  mentor_id UUID REFERENCES mood_mentor_profiles(id),
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Integration Points

### Profile and Booking Integration

The booking system and profile system are integrated at several points:

1. **Mentor Selection**:
   - Booking flow starts from the mentor profile page
   - Mentor details are carried through the booking process

2. **Appointment Display**:
   - Booked appointments appear in both mentor and patient dashboards
   - Appointment cards include mentor profile information

3. **Data Consistency**:
   - Mentor profile updates are immediately reflected in booking displays
   - If a mentor becomes unavailable, their booking slots are automatically hidden

### Authentication Requirements

To ensure security and data privacy:

1. **Profile Viewing**: Public - Anyone can view mentor profiles
2. **Profile Editing**: Authenticated - Only the mentor can edit their own profile
3. **Booking Initiation**: Public - Anyone can start the booking process
4. **Booking Completion**: Authenticated - User must be logged in to complete a booking

## 4. Improvements and Recommendations

### Current Issues Fixed

1. **Profile Sync Issues**:
   - Fixed inconsistency between dashboard and public profile views
   - Ensured education and experience data is properly preserved
   - Improved type safety for array handling
   - Added debug information for easier troubleshooting

2. **UI Improvements**:
   - Removed image display from therapy approaches for cleaner UI
   - Enhanced profile page design with modern layout
   - Improved mobile responsiveness

### Recommended Future Enhancements

1. **Profile System**:
   - Implement server-side storage for profile data
   - Add profile completeness indicator and guide
   - Implement profile verification system
   - Add SEO optimization for mentor profiles

2. **Booking System**:
   - Implement real-time availability checking
   - Add calendar integration (Google Calendar, Outlook)
   - Implement appointment reminders via email/SMS
   - Add payment processing integration
   - Create a cancellation policy system

3. **Integration**:
   - Implement webhook notifications for status changes
   - Create an API for external service integration
   - Add reporting and analytics features

By implementing these recommendations, we can ensure a robust, scalable system ready for production deployment. 