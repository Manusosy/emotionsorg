import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bell, Check, Clock, MessageCircle, Settings, Trash2, Users, FileText } from "lucide-react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Mock notification data
const mockNotifications = [
  {
    id: "1",
    type: "appointment",
    content: "Therapy session with Maria Chen scheduled for tomorrow at 2:00 PM. Please review her latest mood tracking data before the session.",
    timestamp: "10 minutes ago",
    read: false,
    avatar: "/placeholder.svg",
    senderName: "Appointment System",
    title: "Upcoming Therapy Session"
  },
  {
    id: "2",
    type: "patient",
    content: "URGENT: Your patient James Wilson reported severe anxiety symptoms in their latest check-in. Immediate attention may be required.",
    timestamp: "30 minutes ago",
    read: false,
    avatar: "/placeholder.svg",
    senderName: "Patient Monitoring System",
    title: "Patient Alert"
  },
  {
    id: "3",
    type: "group",
    content: "Your 'Anxiety & Depression Support Group' session starts in 1 hour. 8 participants have confirmed attendance.",
    timestamp: "1 hour ago",
    read: false,
    avatar: "/placeholder.svg",
    senderName: "Group Management",
    title: "Upcoming Group Session"
  },
  {
    id: "4",
    type: "message",
    content: "Dr. Thompson has reviewed your treatment plan for patient Sarah Brown and left comments for your consideration.",
    timestamp: "2 hours ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Dr. Thompson",
    title: "Treatment Plan Review"
  },
  {
    id: "5",
    type: "system",
    content: "Monthly supervision meeting with Dr. Rebecca Martinez scheduled for Friday at 3:00 PM. Please prepare your case presentations.",
    timestamp: "3 hours ago",
    read: true,
    avatar: null,
    senderName: "System",
    title: "Supervision Schedule"
  },
  {
    id: "6",
    type: "appointment",
    content: "Patient Alex Turner has requested to reschedule their session from Thursday 10:00 AM to Friday 2:00 PM. Please approve or suggest alternative times.",
    timestamp: "4 hours ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Scheduling System",
    title: "Rescheduling Request"
  },
  {
    id: "7",
    type: "patient",
    content: "New patient file received: Emily Davis, referred by Dr. Johnson for anxiety and depression. Please review and schedule initial consultation.",
    timestamp: "5 hours ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Patient Assignment",
    title: "New Patient Assignment"
  },
  {
    id: "8",
    type: "group",
    content: "Your trauma support group has reached capacity (12 members). Please review the waiting list and consider opening an additional group.",
    timestamp: "1 day ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Group Management",
    title: "Group Capacity Alert"
  },
  {
    id: "9",
    type: "system",
    content: "Reminder: Quarterly professional development workshop on 'Advanced CBT Techniques' is next week. 3 CPD credits available.",
    timestamp: "1 day ago",
    read: true,
    avatar: null,
    senderName: "Professional Development",
    title: "Workshop Reminder"
  },
  {
    id: "10",
    type: "message",
    content: "Clinical team meeting minutes from yesterday have been shared with you. Key topics: new treatment protocols and case load distribution.",
    timestamp: "2 days ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Clinical Team",
    title: "Meeting Minutes"
  },
  {
    id: "11",
    type: "system",
    content: "Your monthly patient outcome reports are ready for review. Overall improvement noted in 78% of your active cases.",
    timestamp: "2 days ago",
    read: true,
    avatar: null,
    senderName: "Analytics System",
    title: "Performance Metrics"
  },
  {
    id: "12",
    type: "patient",
    content: "Risk assessment alert: Patient Michael Roberts reported suicidal ideation in their mood tracker. Please follow up within 24 hours.",
    timestamp: "2 days ago",
    read: true,
    avatar: "/placeholder.svg",
    senderName: "Risk Monitoring",
    title: "Urgent Risk Alert"
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
  user_id?: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  patientUpdates: boolean;
  groupNotifications: boolean;
  marketingCommunications: boolean;
}

export default function NotificationsPage() {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    appointmentReminders: true,
    patientUpdates: true,
    groupNotifications: true,
    marketingCommunications: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    fetchNotificationPreferences();
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await dataService.getNotifications(user.id, 'mood_mentor');

      if (error) throw error;

      if (data && data.length > 0) {
        setNotifications(data);
      } else {
        // Use mock data for development/demo purposes
        const formattedMockData = mockNotifications.map(notification => ({
          ...notification,
          created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
          user_id: user.id
        }));
        setNotifications(formattedMockData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock data
      const formattedMockData = mockNotifications.map(notification => ({
        ...notification,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        user_id: user.id
      }));
      setNotifications(formattedMockData);
      setLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await userService.getUserPreferences(user.id);

      if (error) {
        throw error;
      }

      if (data?.notification_settings) {
        setPreferences(data.notification_settings as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Keep default preferences
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      if (!user?.id) return;

      const { error } = await userService.updateUserPreferences(user.id, {
        notification_settings: preferences
      });

      if (error) throw error;

      toast.success('Notification preferences saved');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If invalid date, return the original string (might be a relative time already)
        return dateStr;
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user?.id) return;

      const notificationIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);

      if (notificationIds.length === 0) return;

      const { error } = await dataService.markNotificationsAsRead(notificationIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({
          ...n,
          read: true
        }))
      );

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      if (!user?.id) return;

      const { error } = await dataService.deleteNotification(id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      if (!user?.id) return;

      const { error } = await dataService.markNotificationAsRead(id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Clock className="h-8 w-8 text-blue-500" />;
      case 'message':
        return <MessageCircle className="h-8 w-8 text-green-500" />;
      case 'patient':
        return <Users className="h-8 w-8 text-amber-500" />;
      case 'group':
        return <Users className="h-8 w-8 text-purple-500" />;
      case 'document':
        return <FileText className="h-8 w-8 text-indigo-500" />;
      default:
        return <Bell className="h-8 w-8 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your alerts and notifications
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notification Preferences</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Appointment Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified about upcoming appointments
                    </p>
                  </div>
                  <Switch
                    checked={preferences.appointmentReminders}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, appointmentReminders: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Patient Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      Alerts about patient status changes
                    </p>
                  </div>
                  <Switch
                    checked={preferences.patientUpdates}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, patientUpdates: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Group Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Updates about your support groups
                    </p>
                  </div>
                  <Switch
                    checked={preferences.groupNotifications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, groupNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Marketing Communications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and services
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketingCommunications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, marketingCommunications: checked }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={saveNotificationPreferences}>Save Preferences</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="default" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <Badge className="ml-2 px-1 py-0 h-5 min-w-5 bg-primary text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="appointment">Appointments</TabsTrigger>
            <TabsTrigger value="patient">Patients</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
            <TabsTrigger value="group">Groups</TabsTrigger>
          </TabsList>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-6">
                <div className="text-center">Loading notifications...</div>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center space-y-4">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No notifications</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {activeTab === 'all' 
                        ? "You don't have any notifications at the moment." 
                        : activeTab === 'unread'
                          ? "You don't have any unread notifications."
                          : `You don't have any ${activeTab} notifications.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`transition-colors ${!notification.read ? 'bg-muted/30' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      <div className="relative mt-1 flex-shrink-0">
                        {getIconByType(notification.type)}
                        {!notification.read && (
                          <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-red-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{notification.title || notification.senderName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatNotificationDate(notification.created_at || notification.timestamp)}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{notification.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </Tabs>
    </DashboardLayout>
  );
} 


