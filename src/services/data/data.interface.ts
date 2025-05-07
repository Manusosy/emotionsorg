/**
 * Data Service Interface
 * Defines the contract for data storage operations (mood tracking, journals, etc)
 */

export interface MoodEntry {
  id: string;
  userId: string;
  mood: number | string; // Can be 1-10 rating or string mood type
  notes?: string;
  tags?: string[];
  activities?: string[];
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  mood?: number | string;
  isPrivate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  file_url?: string;
  imageUrl?: string;
  type?: string;
  category: string;
  tags?: string[];
  downloads?: number;
  shares?: number;
  createdAt: string;
  createdBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface IDataService {
  // Mood tracking
  getMoodEntries(userId: string, options?: { 
    limit?: number, 
    offset?: number,
    startDate?: string,
    endDate?: string
  }): Promise<MoodEntry[]>;
  
  addMoodEntry(data: Omit<MoodEntry, 'id' | 'createdAt'>): Promise<MoodEntry>;
  
  updateMoodEntry(id: string, data: Partial<MoodEntry>): Promise<MoodEntry | null>;
  
  deleteMoodEntry(id: string): Promise<boolean>;
  
  // Subscribe to mood entries (for real-time updates)
  subscribeMoodEntries(userId: string, callback: () => void): () => void;
  
  // Journal entries
  getJournalEntries(userId: string, options?: {
    limit?: number,
    offset?: number,
    startDate?: string,
    endDate?: string
  }): Promise<JournalEntry[]>;
  
  getJournalEntry(id: string): Promise<JournalEntry | null>;
  
  addJournalEntry(data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry>;
  
  updateJournalEntry(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | null>;
  
  deleteJournalEntry(id: string): Promise<boolean>;
  
  // Resources
  getResources(options?: { 
    category?: string, 
    tags?: string[], 
    limit?: number 
  }): Promise<Resource[]>;
  
  getResource(id: string): Promise<Resource | null>;
  
  addResource(data: {
    title: string,
    description: string,
    url: string,
    image_url?: string,
    file_url?: string,
    type?: string,
    category: string,
    tags?: string[],
    created_by?: string
  }): Promise<Resource>;
  
  updateResource(id: string, data: Partial<Resource>): Promise<Resource | null>;
  
  deleteResource(id: string): Promise<boolean>;
  
  // Notifications
  getNotifications(userId: string, options?: { 
    unreadOnly?: boolean,
    limit?: number
  }): Promise<Notification[]>;
  
  markNotificationAsRead(id: string): Promise<boolean>;
  
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  
  deleteNotification(id: string): Promise<boolean>;
} 