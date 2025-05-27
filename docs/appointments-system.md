# Appointments System Documentation

## Overview

The appointments system in the Emotions App allows patients to book sessions with mood mentors. This document outlines the technical implementation, database schema, and usage patterns for the appointments system.

## Database Schema

### Appointments Table

The appointments table stores all appointment data with the following structure:

```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rescheduled')),
  meeting_link VARCHAR(255),
  meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('video', 'audio', 'chat')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT
);
```

### Database Views

Two views are provided for simplified access to appointment data:

1. **patient_appointments_view**: Includes appointment details with mood mentor information
2. **mentor_appointments_view**: Includes appointment details with patient information

### Row-Level Security (RLS)

The appointments table has RLS policies to ensure data security:

- Users can only view their own appointments
- Patients can create appointments
- Both patients and mentors can update their own appointments
- Both patients and mentors can delete their own appointments

## Service Layer

### AppointmentService Interface

The appointment service provides the following methods:

- `bookAppointment`: Create a new appointment
- `getAppointments`: Get all appointments for a user
- `cancelAppointment`: Cancel an existing appointment
- `rescheduleAppointment`: Reschedule an appointment
- `completeAppointment`: Mark an appointment as completed
- `rateAppointment`: Add rating and feedback to an appointment
- `getPatientAppointments`: Get appointments for a specific patient
- `getMoodMentorAppointments`: Get appointments for a specific mood mentor

### Implementation

The service is implemented using Supabase for data storage and retrieval. All database operations use proper error handling and type safety.

## Frontend Components

### BookingPage

The main booking flow for patients to schedule appointments with mood mentors. The booking process follows a step-by-step wizard:

1. Select specialty
2. Choose appointment type (video, audio, chat)
3. Select date and time
4. Provide basic information
5. Review and confirm

### BookingModal

A compact modal for quick appointment booking, typically used within mood mentor profiles.

### AppointmentsPage

Displays a list of appointments for either patients or mood mentors, with filtering and search capabilities.

## Authentication Integration

The appointments system is integrated with the authentication system:

- Only authenticated users can book appointments
- If a user tries to book without being logged in, they are prompted to sign in or register
- User information is pre-filled in the booking form when available

## Appointment Status Flow

Appointments follow this status flow:

1. **pending**: Initial state when appointment is created
2. **scheduled**: Confirmed by the mood mentor
3. **completed**: Session has been conducted
4. **cancelled**: Appointment has been cancelled
5. **rescheduled**: Appointment has been moved to a new time

## Usage Examples

### Booking an Appointment

```typescript
// Example of booking an appointment
const bookingData = {
  patient_id: user.id,
  mentor_id: moodMentorId,
  title: `Session with ${moodMentorName}`,
  description: "Discussion about anxiety management techniques",
  date: "2023-07-15",
  start_time: "14:00",
  end_time: "15:00",
  meeting_type: "video",
  meeting_link: `https://meet.emotionsapp.com/${user.id}/${moodMentorId}`,
  notes: "First-time session to discuss anxiety management"
};

const result = await appointmentService.bookAppointment(bookingData);
```

### Cancelling an Appointment

```typescript
// Example of cancelling an appointment
await appointmentService.cancelAppointment(appointmentId, "Schedule conflict");
```

### Getting Patient Appointments

```typescript
// Example of getting appointments for a patient
const appointments = await appointmentService.getPatientAppointments(patientId, {
  status: "scheduled",
  startDate: "2023-07-01",
  endDate: "2023-07-31"
});
```

## Best Practices

1. Always validate appointment data before submission
2. Check for conflicts when scheduling appointments
3. Implement proper error handling for all appointment operations
4. Use the appointment views for better performance and data structure
5. Ensure proper authentication checks before any appointment operations

## Future Enhancements

1. Calendar integration (iCal, Google Calendar)
2. Automated reminders for upcoming appointments
3. Recurring appointment scheduling
4. Availability management for mood mentors
5. Payment integration for paid sessions 