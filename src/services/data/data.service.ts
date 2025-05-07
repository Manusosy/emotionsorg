import { 
  IDataService, 
  MoodEntry, 
  JournalEntry, 
  Resource,
  Notification
} from './data.interface';

/**
 * Mock Data Service
 * Implements the DataService interface with mock functionality
 */
export class MockDataService implements IDataService {
  // Mock storage
  private moodEntries: Record<string, MoodEntry> = {};
  private journalEntries: Record<string, JournalEntry> = {};
  private resources: Record<string, Resource> = {
    '1': {
      id: '1',
      title: 'Understanding Anxiety',
      description: 'A comprehensive guide to understanding and managing anxiety',
      url: 'https://example.com/resources/anxiety',
      imageUrl: 'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?ixlib=rb-4.0.3',
      category: 'Mental Health',
      tags: ['anxiety', 'stress', 'mental health'],
      createdAt: new Date(Date.now() - 5000000000).toISOString()
    },
    '2': {
      id: '2',
      title: 'Meditation for Beginners',
      description: 'Learn simple meditation techniques to improve mental wellbeing',
      url: 'https://example.com/resources/meditation',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3',
      category: 'Mindfulness',
      tags: ['meditation', 'mindfulness', 'relaxation'],
      createdAt: new Date(Date.now() - 3000000000).toISOString()
    },
    '3': {
      id: '3',
      title: 'Healthy Sleep Habits',
      description: 'Tips for improving your sleep quality and mental health',
      url: 'https://example.com/resources/sleep',
      imageUrl: 'https://images.unsplash.com/photo-1541781774-95d1148cf04c?ixlib=rb-4.0.3',
      category: 'Sleep',
      tags: ['sleep', 'rest', 'health'],
      createdAt: new Date(Date.now() - 2000000000).toISOString()
    }
  };
  private notifications: Record<string, Notification> = {};

  constructor() {
    // Initialize with some example data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Seed some mood entries
    const mockMoods: Partial<MoodEntry>[] = [
      {
        userId: '1',
        mood: 8,
        notes: 'Feeling really productive today!',
        tags: ['productive', 'happy'],
        activities: ['exercise', 'work'],
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString() // 1 day ago
      },
      {
        userId: '1',
        mood: 5,
        notes: 'Neutral day, nothing special',
        tags: ['neutral'],
        activities: ['reading'],
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
      },
      {
        userId: '1',
        mood: 3,
        notes: 'Feeling stressed about work deadlines',
        tags: ['stressed', 'anxious'],
        activities: ['work'],
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
      }
    ];

    for (const mood of mockMoods) {
      const id = Math.random().toString(36).substring(2, 15);
      this.moodEntries[id] = {
        id,
        userId: mood.userId || '1',
        mood: mood.mood || 5,
        notes: mood.notes,
        tags: mood.tags,
        activities: mood.activities,
        createdAt: mood.createdAt || new Date().toISOString()
      };
    }

    // Seed some journal entries
    const mockJournals: Partial<JournalEntry>[] = [
      {
        userId: '1',
        title: 'Reflections on my therapy session',
        content: 'Today I had a breakthrough in my therapy session. We discussed...',
        tags: ['therapy', 'growth'],
        mood: 7,
        isPrivate: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        userId: '1',
        title: 'Anxiety management techniques',
        content: 'I learned some new breathing exercises that are helping with my anxiety...',
        tags: ['anxiety', 'techniques'],
        mood: 6,
        isPrivate: false,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];

    for (const journal of mockJournals) {
      const id = Math.random().toString(36).substring(2, 15);
      this.journalEntries[id] = {
        id,
        userId: journal.userId || '1',
        title: journal.title || 'Untitled',
        content: journal.content || '',
        tags: journal.tags,
        mood: journal.mood,
        isPrivate: journal.isPrivate,
        createdAt: journal.createdAt || new Date().toISOString(),
        updatedAt: journal.updatedAt || new Date().toISOString()
      };
    }

    // Seed some notifications
    const mockNotifications: Partial<Notification>[] = [
      {
        userId: '1',
        title: 'Welcome to Emotions App',
        message: 'Thanks for joining! Start tracking your mood today.',
        type: 'info',
        read: false,
        link: '/dashboard',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        userId: '1',
        title: 'New resources available',
        message: 'Check out our new mental health resources section.',
        type: 'success',
        read: false,
        link: '/resources',
        createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString()
      }
    ];

    for (const notification of mockNotifications) {
      const id = Math.random().toString(36).substring(2, 15);
      this.notifications[id] = {
        id,
        userId: notification.userId || '1',
        title: notification.title || 'Notification',
        message: notification.message || '',
        type: notification.type || 'info',
        read: notification.read || false,
        link: notification.link,
        createdAt: notification.createdAt || new Date().toISOString()
      };
    }
  }

  // Mood tracking methods
  async getMoodEntries(userId: string, options?: { 
    limit?: number, 
    offset?: number,
    startDate?: string,
    endDate?: string
  }): Promise<MoodEntry[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let entries = Object.values(this.moodEntries)
      .filter(entry => entry.userId === userId)
      .filter(entry => {
        if (!startDate && !endDate) return true;
        
        const entryDate = new Date(entry.createdAt);
        
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
      
    return entries;
  }
  
  async addMoodEntry(data: Omit<MoodEntry, 'id' | 'createdAt'>): Promise<MoodEntry> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const id = Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    const newEntry: MoodEntry = {
      id,
      createdAt: now,
      ...data
    };
    
    this.moodEntries[id] = newEntry;
    
    return newEntry;
  }
  
  async updateMoodEntry(id: string, data: Partial<MoodEntry>): Promise<MoodEntry | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const entry = this.moodEntries[id];
    
    if (!entry) {
      return null;
    }
    
    this.moodEntries[id] = {
      ...entry,
      ...data
    };
    
    return this.moodEntries[id];
  }
  
  async deleteMoodEntry(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.moodEntries[id]) {
      return false;
    }
    
    delete this.moodEntries[id];
    return true;
  }
  
  // Subscription for mood entries changes (mock implementation)
  subscribeMoodEntries(userId: string, callback: () => void): () => void {
    console.log(`Setting up mood entries subscription for user ${userId}`);
    
    // In a real implementation, this would set up a real-time subscription
    // For our mock version, we'll just return a no-op unsubscribe function
    
    // Return an unsubscribe function
    return () => {
      console.log(`Unsubscribing from mood entries for user ${userId}`);
      // Cleanup would happen here in a real implementation
    };
  }
  
  // Journal methods
  async getJournalEntries(userId: string, options?: {
    limit?: number,
    offset?: number,
    startDate?: string,
    endDate?: string
  }): Promise<JournalEntry[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    // Check sessionStorage first for test mode
    let storageEntries: any[] = [];
    try {
      const storageKey = 'emotions_app_journal_entries';
      const storedEntries = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      storageEntries = Object.values(storedEntries).filter((entry: any) => 
        entry.userId === userId || entry.user_id === userId
      );
    } catch (e) {
      console.log('Session storage not available, using memory only');
    }
    
    // Combine with in-memory entries
    let memoryEntries = Object.values(this.journalEntries)
      .filter(entry => entry.userId === userId);
      
    // Combine both sources, giving priority to storage entries if ids match
    const storageIds = storageEntries.map(entry => entry.id);
    const uniqueMemoryEntries = memoryEntries.filter(entry => !storageIds.includes(entry.id));
    
    let allEntries: any[] = [...storageEntries, ...uniqueMemoryEntries];
    
    // Apply filters
    allEntries = allEntries.filter(entry => {
      if (!startDate && !endDate) return true;
      
      const entryDate = new Date(entry.createdAt || entry.created_at || '');
      
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(b.createdAt || b.created_at || '').getTime();
      const dateB = new Date(a.createdAt || a.created_at || '').getTime();
      return dateA - dateB;
    })
    .slice(offset, offset + limit);
    
    // Map entries to consistent format before returning
    return allEntries.map(entry => {
      // Ensure each entry follows the JournalEntry interface
      return {
        id: entry.id,
        userId: entry.userId || entry.user_id,
        title: entry.title || '',
        content: entry.content || '',
        tags: entry.tags || [],
        mood: entry.mood,
        isPrivate: entry.isPrivate || entry.is_private || false,
        createdAt: entry.createdAt || entry.created_at || new Date().toISOString(),
        updatedAt: entry.updatedAt || entry.updated_at || new Date().toISOString(),
      };
    });
  }
  
  async getJournalEntry(id: string): Promise<JournalEntry | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.journalEntries[id] || null;
  }
  
  async addJournalEntry(data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> | any): Promise<JournalEntry> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const id = Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    // Handle both formats - interface style and component style
    // Map fields to the interface format
    const userId = data.userId || data.user_id;
    const tomorrowsIntention = data.tomorrowsIntention || data.tomorrows_intention;
    const isPrivate = data.isPrivate || data.is_private || false;
    
    const newEntry: JournalEntry = {
      id,
      userId,
      title: data.title || 'Untitled',
      content: data.content || '',
      tags: data.tags || [],
      mood: data.mood,
      isPrivate,
      createdAt: now,
      updatedAt: now
    };
    
    this.journalEntries[id] = newEntry;
    
    // Also store in sessionStorage for test mode persistence
    try {
      const storageKey = 'emotions_app_journal_entries';
      const existingEntries = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      existingEntries[id] = newEntry;
      sessionStorage.setItem(storageKey, JSON.stringify(existingEntries));
    } catch (e) {
      console.log('Session storage not available, continuing in memory only');
    }
    
    return newEntry;
  }
  
  async updateJournalEntry(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const entry = this.journalEntries[id];
    
    if (!entry) {
      return null;
    }
    
    this.journalEntries[id] = {
      ...entry,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return this.journalEntries[id];
  }
  
  async deleteJournalEntry(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.journalEntries[id]) {
      return false;
    }
    
    delete this.journalEntries[id];
    return true;
  }
  
  // Resources methods
  async getResources(options?: { 
    category?: string, 
    tags?: string[], 
    limit?: number 
  }): Promise<Resource[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let resources = Object.values(this.resources);
    
    if (options?.category) {
      resources = resources.filter(resource => resource.category === options.category);
    }
    
    if (options?.tags && options.tags.length > 0) {
      resources = resources.filter(resource => 
        resource.tags && options.tags?.some(tag => resource.tags?.includes(tag))
      );
    }
    
    const limit = options?.limit || 20;
    return resources.slice(0, limit);
  }
  
  async getResource(id: string): Promise<Resource | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.resources[id] || null;
  }
  
  async addResource(data: {
    title: string,
    description: string,
    url: string,
    image_url?: string,
    category: string,
    tags?: string[],
    created_by?: string
  }): Promise<Resource> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const id = Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    const newResource: Resource = {
      id,
      title: data.title,
      description: data.description,
      url: data.url,
      imageUrl: data.image_url,
      category: data.category,
      tags: data.tags || [],
      createdAt: now,
      createdBy: data.created_by
    };
    
    this.resources[id] = newResource;
    
    return newResource;
  }
  
  async updateResource(id: string, data: Partial<Resource>): Promise<Resource | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const resource = this.resources[id];
    
    if (!resource) {
      return null;
    }
    
    this.resources[id] = {
      ...resource,
      ...data
    };
    
    return this.resources[id];
  }
  
  async deleteResource(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.resources[id]) {
      return false;
    }
    
    delete this.resources[id];
    return true;
  }
  
  // Notifications methods
  async getNotifications(userId: string, options?: { 
    unreadOnly?: boolean,
    limit?: number
  }): Promise<Notification[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const limit = options?.limit || 20;
    const unreadOnly = options?.unreadOnly || false;
    
    let notifications = Object.values(this.notifications)
      .filter(notification => notification.userId === userId)
      .filter(notification => !unreadOnly || !notification.read)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
      
    return notifications;
  }
  
  async markNotificationAsRead(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const notification = this.notifications[id];
    
    if (!notification) {
      return false;
    }
    
    this.notifications[id] = {
      ...notification,
      read: true
    };
    
    return true;
  }
  
  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    Object.values(this.notifications)
      .filter(notification => notification.userId === userId)
      .forEach(notification => {
        this.notifications[notification.id] = {
          ...notification,
          read: true
        };
      });
    
    return true;
  }
  
  async deleteNotification(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.notifications[id]) {
      return false;
    }
    
    delete this.notifications[id];
    return true;
  }
}

// Export a singleton instance
export const dataService: IDataService = new MockDataService(); 