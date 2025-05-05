import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Check, 
  Clock, 
  MessageCircle, 
  Settings, 
  Trash2, 
  FileText,
  X 
} from "lucide-react";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Mock notification data for development and testing
const mockNotifications = [
  {
    id: "1",
    type: "message",
    content: "Dr. Sarah Johnson sent you a message about your recent check-in",
    timestamp: "5 minutes ago",
    read: false,
    avatar: "/placeholder.svg",
    senderName: "Dr. Sarah Johnson"
  },
  {
    id: "2",
    type: "appointment",
    content: "Upcoming therapy session tomorrow at 10:00 AM",
    timestamp: "1 hour ago",
    read: false,
    avatar: "/placeholder.svg",
    senderName: "System"
  },
  {
    id: "3",
    type: "journal",
    content: "Reminder: You haven't completed your daily journal entry",
    timestamp: "3 hours ago",
    read: true,
    avatar: null,
    senderName: "System"
  },
  {
    id: "4",
    type: "system",
    content: "Your weekly mood report is now available for review",
    timestamp: "Yesterday",
    read: true,
    avatar: null,
    senderName: "System"
  },
  {
    id: "5",
    type: "message",
    content: "New resources available in the Anxiety Management collection",
    timestamp: "2 days ago",
    read: true,
    avatar: null,
    senderName: "System"
  }
];

interface Notification {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  read: boolean;
  avatar?: string | null;
  senderName: string;
  title?: string;
  created_at?: string;
  action_url?: string;
  user_id?: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  moodTrackingReminders: boolean;
  marketingCommunications: boolean;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    appointmentReminders: true,
    moodTrackingReminders: true,
    marketingCommunications: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    fetchNotificationPreferences();
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // For production use the database
      if (process.env.NODE_ENV === 'production') {
        const { data, error } = await dataService.getUserNotifications(user.id);
      
        if (error) throw error;

        // Map database notifications to our interface
        let userNotifications: Notification[] = [];
        
        if (data && data.length > 0) {
          userNotifications = data.map(item => {
            // Determine notification type based on content or database type
            let type = 'system';
            if (item.title?.toLowerCase().includes('appointment') || item.message?.toLowerCase().includes('appointment')) {
              type = 'appointment';
            } else if (item.title?.toLowerCase().includes('message') || item.message?.toLowerCase().includes('message')) {
              type = 'message';
            } else if (item.title?.toLowerCase().includes('journal') || item.message?.toLowerCase().includes('journal')) {
              type = 'journal';
            } else if (item.type) {
              type = item.type;
            }
            
            // Convert database field names to our notification interface
            return {
              id: item.id,
              type: type,
              content: item.message || '',
              timestamp: formatNotificationDate(item.created_at),
              read: item.read,
              avatar: null,
              senderName: item.sender_name || 'System',
              title: item.title,
              created_at: item.created_at,
              user_id: item.user_id
            };
          });
        }
        
        // Add welcome notification if no notifications exist
        if (userNotifications.length === 0) {
          userNotifications = [{
            id: 'welcome-1',
            type: 'system',
            content: 'Welcome to Emotions. Feel free to explore our features to help you monitor, analyze and receive personalized recommendations for your mental health.',
            timestamp: 'Just now',
            read: false,
            avatar: null,
            senderName: 'System',
            title: 'Welcome to Emotions',
            created_at: new Date().toISOString(),
            user_id: user.id
          }];
        }
        
        setNotifications(userNotifications);
      } else {
        // For development, use mock data
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock data in case of error
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await userService.getUserPreferences(user.id);

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return;
      }

      if (data?.notification_preferences) {
        setPreferences({
          emailNotifications: data.notification_preferences.emailNotifications ?? true,
          appointmentReminders: data.notification_preferences.appointmentReminders ?? true,
          moodTrackingReminders: data.notification_preferences.moodTrackingReminders ?? true,
          marketingCommunications: data.notification_preferences.marketingCommunications ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const saveNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      const { error } = await userService.updateUserPreferences(user.id, {
        notification_preferences: preferences
      });

      if (error) throw error;
      
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return notification.type === activeTab;
  });
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Mark all as read
  const markAllAsRead = async () => {
    try {
      // Update local state first for responsive UI
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      
      // Update read status in database for real notifications (not welcome notification)
      if (user?.id && process.env.NODE_ENV === 'production') {
        const { error } = await dataService.markAllNotificationsAsRead(user.id);
          
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      // Update UI first
      setNotifications(notifications.filter(n => n.id !== id));
      
      // Skip database operation for welcome notification or in development
      if (id === 'welcome-1' || process.env.NODE_ENV !== 'production') return;
      
      // Delete from database
      const { error } = await dataService.deleteNotification(id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      // Update local state first
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      
      // Skip database operation for welcome notification or in development
      if (id === 'welcome-1' || process.env.NODE_ENV !== 'production') return;
      
      // Update in database
      const { error } = await dataService.markNotificationAsRead(id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case "appointment":
        return <Clock className="h-5 w-5 text-purple-600" />;
      case "journal":
        return <FileText className="h-5 w-5 text-green-600" />;
      case "system":
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600/20 text-blue-600 border-0 px-3 py-1 rounded-full">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsRead}
              className="flex items-center gap-2"
              >
              <Check className="h-4 w-4" />
                Mark all as read
              </Button>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-slate-500">Receive email about your account activity</p>
                    </div>
                    <div>
                      <Switch 
                        id="email-notifications" 
                        checked={preferences.emailNotifications} 
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Appointment Reminders</h4>
                      <p className="text-sm text-slate-500">Get notified about upcoming appointments</p>
                    </div>
                    <div>
                      <Switch 
                        id="appointment-notifications" 
                        checked={preferences.appointmentReminders} 
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, appointmentReminders: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Mood Tracking Reminders</h4>
                      <p className="text-sm text-slate-500">Receive reminders to track your mood</p>
                    </div>
                    <div>
                      <Switch 
                        id="mood-tracking-notifications" 
                        checked={preferences.moodTrackingReminders} 
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, moodTrackingReminders: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Communications</h4>
                      <p className="text-sm text-slate-500">Receive updates about new features and promotions</p>
                    </div>
                    <div>
                      <Switch 
                        id="marketing-notifications" 
                        checked={preferences.marketingCommunications} 
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, marketingCommunications: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <DialogClose asChild>
                    <Button variant="secondary" size="sm" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      saveNotificationPreferences();
                      setIsSettingsOpen(false);
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="overflow-hidden border border-gray-200">
          <div className="border-b">
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="flex h-12 justify-start bg-transparent p-0 w-full">
                <TabsTrigger
                  value="all"
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none h-12"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none h-12"
                >
                  Unread
                </TabsTrigger>
                <TabsTrigger
                  value="message"
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none h-12"
                >
                  Messages
                </TabsTrigger>
                <TabsTrigger
                  value="appointment"
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none h-12"
                >
                  Appointments
                </TabsTrigger>
                <TabsTrigger
                  value="journal"
                  className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none h-12"
                >
                  Journal
                </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin h-10 w-10 mx-auto rounded-full border-t-2 border-blue-600 border-r-2 border-transparent"></div>
                <p className="mt-4 text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <ul className="divide-y">
                {filteredNotifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className="flex items-start p-4 hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0 mr-4">
                      {notification.avatar ? (
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          <img 
                            src={notification.avatar} 
                            alt={notification.senderName} 
                            className="w-full h-full object-cover"
                          />
              </div>
            ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                          {getIconByType(notification.type)}
                        </div>
                      )}
                          </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                            {notification.content}
                          </p>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-16 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">No notifications to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


