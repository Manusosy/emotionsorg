/**
 * Services Index
 * Exports all services for easy importing
 */

// Auth Service
export * from './auth/auth.interface';
export * from './auth/auth.service';

// User Service
export * from './user/user.interface';
export * from './user/user.service';

// Data Service
export * from './data/data.interface';
export * from './data/data.service';

// API Service
export * from './api/api.interface';
export * from './api/api.service';

// Message Service
export * from './message/message.interface';
export * from './message/message.service';

// Patient Service
export * from './patient/patient.interface';
export * from './patient/patient.service';

// Mood Mentor Service
export * from './mood-mentor/mood-mentor.interface';
import { moodMentorService } from './mood-mentor/mood-mentor.service';
export { moodMentorService };
export * from './mood-mentor/mood-mentor.service';

// Appointment Service
export * from './appointment/appointment.interface';
export * from './appointment/appointment.service'; 