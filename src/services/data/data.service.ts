import { supabase } from '@/lib/supabase';

/**
 * Data Service Interface
 */
export interface IDataService {
  getUserNotifications(userId: string): Promise<any>;
  markNotificationAsRead(id: string): Promise<any>;
  markAllNotificationsAsRead(userId: string): Promise<any>;
  markNotificationsAsRead(ids: string[]): Promise<any>;
  deleteNotification(id: string): Promise<any>;
  getNotifications(userId: string, userType: string): Promise<any>;
}

/**
 * Data Service Implementation
 */
export class DataService implements IDataService {
  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Get notifications with user type filter
   */
  async getNotifications(userId: string, userType: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsAsRead(ids: string[]) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      
      return { data, error };
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return { data: null, error };
    }
  }
}

// Export a singleton instance
export const dataService = new DataService(); 