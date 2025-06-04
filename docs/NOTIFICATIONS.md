# Emotions App Notification System

## Overview

This document outlines the notification system implemented in the Emotions App for both patients and mood mentors. The system handles various types of notifications including appointment updates, messages, and system notifications.

## Database Schema

Notifications are stored in the Supabase `notifications` table with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | ID of the notification recipient |
| title | TEXT | Notification title |
| message | TEXT | Notification content |
| type | TEXT | Type of notification (appointment, message, journal, etc.) |
| is_read | BOOLEAN | Read status (true/false) |
| created_at | TIMESTAMP | Creation timestamp |
| action_url | TEXT | Optional URL for action buttons |
| sender_name | TEXT | Name of the sender (if applicable) |
| sender_avatar | TEXT | Avatar URL of the sender (if applicable) |

## Notification Types

The application supports these notification types:

| Type | Description | Applicable Users |
|------|-------------|-----------------|
| appointment | Appointment-related notifications | Patients & Mentors |
| message | Message-related notifications | Patients & Mentors |
| journal | Journal entry reminders | Patients |
| patient | Patient status updates | Mentors |
| group | Support group updates | Mentors |
| system | System-generated notifications | Patients & Mentors |

## Implementation Details

### Creating Notifications

To create a notification, use the following pattern:

```javascript
const notificationData = {
  user_id: recipientId, // UUID of the recipient
  title: 'Notification Title',
  message: 'Notification message content',
  type: 'appointment', // Use appropriate type from the list above
  is_read: false,
  created_at: new Date().toISOString()
};

const { error } = await supabase
  .from('notifications')
  .insert(notificationData);
```

### Fetching Notifications

#### For Patients

Patient notifications are fetched using the `dataService.getUserNotifications()` method:

```javascript
const { data, error } = await dataService.getUserNotifications(userId);
```

#### For Mood Mentors

Mood mentor notifications are fetched directly from Supabase:

```javascript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Real-time Notifications

The mood mentor dashboard uses Supabase's real-time capabilities to receive instant notification updates:

```javascript
const channel = supabase
  .channel('notifications-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, () => {
    fetchNotifications();
  })
  .subscribe();

// Don't forget to clean up
return () => {
  supabase.removeChannel(channel);
};
```

### Notification Management

#### Mark as Read

```javascript
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);
```

Or use the data service:

```javascript
const { error } = await dataService.markNotificationAsRead(notificationId);
```

#### Mark All as Read

```javascript
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', userId);
```

Or use the data service:

```javascript
const { error } = await dataService.markAllNotificationsAsRead(userId);
```

#### Delete Notification

```javascript
const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('id', notificationId);
```

Or use the data service:

```javascript
const { error } = await dataService.deleteNotification(notificationId);
```

## User Notification Preferences

### Patient Preferences Structure

```javascript
{
  notification_preferences: {
    emailNotifications: true,
    appointmentReminders: true,
    moodTrackingReminders: true,
    marketingCommunications: false
  }
}
```

### Mood Mentor Preferences Structure

```javascript
{
  notification_settings: {
    emailNotifications: true,
    appointmentReminders: true,
    patientUpdates: true,
    groupNotifications: true,
    marketingCommunications: false
  }
}
```

### Saving Preferences

```javascript
// For patients
const result = await userService.updateUserPreferences(userId, {
  notification_preferences: preferences
});

// For mood mentors
const { error } = await supabase
  .from('user_preferences')
  .upsert({
    user_id: userId,
    notification_settings: preferences,
    updated_at: new Date().toISOString()
  });
```

## Notification Events

The following events create notifications in the system:

### 1. Appointment Cancellations

When an appointment is cancelled, a notification is automatically created for the other party. This is implemented in the `cancelAppointment` method in `appointment.service.ts`.

### 2. Appointment Completions

When a mentor marks an appointment as completed, a notification is created for the patient. This is implemented in the `completeAppointment` method in `appointment.service.ts`.

### 3. Message Notifications

The application uses Supabase's real-time features to notify users of new messages. No explicit notification record is created in the notifications table; instead, the UI subscribes to message changes.

## UI Components

The notification UI consists of:

1. Notification tabs for filtering by type
2. Notification cards/items showing content and actions
3. Notification preference settings dialog

## Adding New Notification Types

To add a new notification type:

1. Add the new type to the notification type enum/constants
2. Update the `getIconByType` function to include an icon for the new type
3. Add a new tab in the notification page UI if needed
4. Ensure the notification creation logic sets the correct type

## Email Notifications

Email notifications are controlled by user preferences. When implementing email notifications:

1. Check the user's notification preferences
2. Only send emails for notification types the user has enabled
3. Use a consistent email template

## Best Practices

1. Always update the UI state before making API calls for a responsive experience
2. Handle errors gracefully and provide fallbacks
3. Use appropriate notification types for different events
4. Keep notification messages concise and actionable
5. Include relevant links in notifications when applicable

## Related Files

- `src/features/dashboard/pages/NotificationsPage.tsx` - Patient notifications page
- `src/features/mood_mentors/pages/NotificationsPage.tsx` - Mood mentor notifications page
- `src/services/data/data.service.ts` - Data service with notification methods
- `src/components/layout/NotificationBell.tsx` - Notification bell component
- `src/components/layout/NotificationDropdown.tsx` - Notification dropdown component 