import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Supabase import removed
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuth } from "@/hooks/use-auth";
// import WelcomeDialog from "@/components/WelcomeDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Home,
  Calendar,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
  Inbox,
  FileText,
  Users,
  Bell,
  BookOpen,
  Activity,
  User,
  Clock,
  Shield,
  BadgeHelp,
  ChevronRight,
  Clock3,
  HeartPulse,
  Search,
  Trash2,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: 'welcome' | 'update' | 'reminder' | 'other';
  user_id?: string;
}

interface DbNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  user_id: string;
}

interface SearchResult {
  title: string;
  description?: string;
  icon?: any;
  href: string;
  category: string;
}

const patientNavigation = [
  { 
    section: "Main",
    items: [
      { name: "Overview", href: "/patient-dashboard", icon: Home },
      { name: "Appointments", href: "/patient-dashboard/appointments", icon: Calendar },
      { name: "Messages", href: "/patient-dashboard/messages", icon: Inbox },
      { name: "Notifications", href: "/patient-dashboard/notifications", icon: Bell },
      { name: "Journal", href: "/patient-dashboard/journal", icon: BookOpen },
    ]
  },
  {
    section: "Wellbeing",
    items: [
      { name: "Mood Tracker", href: "/patient-dashboard/mood-tracker", icon: Activity },
      { name: "Reports", href: "/patient-dashboard/reports", icon: FileText }, 
      { name: "Resources", href: "/patient-dashboard/resources", icon: BookOpen },
    ]
  },
  {
    section: "Account",
    items: [
      { name: "Profile", href: "/patient-dashboard/profile", icon: User },
      { name: "Favorites", href: "/patient-dashboard/favorites", icon: Heart },
      { name: "Settings", href: "/patient-dashboard/settings", icon: Settings },
      { name: "Help Center", href: "/patient-dashboard/help", icon: BadgeHelp },
    ]
  }
];

const searchableItems: SearchResult[] = [
  // Overview
  {
    title: "Dashboard Overview",
    description: "View your dashboard summary and upcoming activities",
    icon: Home,
    href: "/patient-dashboard",
    category: "Pages"
  },
  // Appointments
  {
    title: "Appointments",
    description: "View and manage your therapy appointments",
    icon: Calendar,
    href: "/patient-dashboard/appointments",
    category: "Pages"
  },
  {
    title: "Schedule Session",
    description: "Book a new therapy session",
    icon: Clock,
    href: "/patient-dashboard/appointments/schedule",
    category: "Appointments"
  },
  // Messages
  {
    title: "Messages",
    description: "Chat with your therapist and support team",
    icon: Inbox,
    href: "/patient-dashboard/messages",
    category: "Communication"
  },
  // Journal
  {
    title: "Journal",
    description: "Write and manage your therapy journal entries",
    icon: BookOpen,
    href: "/patient-dashboard/journal",
    category: "Wellbeing"
  },
  {
    title: "New Journal Entry",
    description: "Create a new journal entry",
    icon: FileText,
    href: "/patient-dashboard/journal/new",
    category: "Wellbeing"
  },
  // Mood Tracking
  {
    title: "Mood Tracker",
    description: "Track and analyze your daily mood patterns",
    icon: Activity,
    href: "/patient-dashboard/mood-tracker",
    category: "Wellbeing"
  },
  {
    title: "Mood Reports",
    description: "View your mood tracking history and insights",
    icon: FileText,
    href: "/patient-dashboard/reports",
    category: "Wellbeing"
  },
  // Resources
  {
    title: "Resource Library",
    description: "Access therapeutic resources and materials",
    icon: BookOpen,
    href: "/patient-dashboard/resources",
    category: "Support"
  },
  // Profile & Settings
  {
    title: "My Profile",
    description: "View and update your profile information",
    icon: User,
    href: "/patient-dashboard/profile",
    category: "Account"
  },
  {
    title: "Favorite Items",
    description: "Access your saved resources and content",
    icon: Heart,
    href: "/patient-dashboard/favorites",
    category: "Account"
  },
  {
    title: "Account Settings",
    description: "Manage your account preferences",
    icon: Settings,
    href: "/patient-dashboard/settings",
    category: "Account"
  },
  {
    title: "Help Center",
    description: "Get help and support",
    icon: BadgeHelp,
    href: "/patient-dashboard/help",
    category: "Support"
  }
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut, isAuthenticated, isLoading: authLoading, userRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // State for notification dialog
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  // Create dynamic navigation based on user role
  const navigationWithAdminLink = useMemo(() => {
    // Deep copy the patient navigation
    const navigation = JSON.parse(JSON.stringify(patientNavigation));
    
    // Add admin link for admin users
    if (isAdmin) {
      // Find the Account section
      const accountSection = navigation.find((section: any) => section.section === "Account");
      if (accountSection) {
        // Add Admin Panel link before Help Center
        const helpCenterIndex = accountSection.items.findIndex((item: any) => item.name === "Help Center");
        const adminLink = { 
          name: "Admin Panel", 
          href: "/admin", 
          icon: ShieldAlert
        };
        
        if (helpCenterIndex !== -1) {
          accountSection.items.splice(helpCenterIndex, 0, adminLink);
        } else {
          accountSection.items.push(adminLink);
        }
      }
    }
    
    return navigation;
  }, [isAdmin]);

  // Check if the icon is a valid React component
  const isValidIcon = (icon: any): icon is React.ComponentType<any> => {
    return typeof icon === 'function' || 
           (typeof icon === 'object' && icon !== null && 'render' in icon);
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    
    setCurrentPath(window.location.pathname);
  }, [isAuthenticated, navigate, authLoading, userRole]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    // Fetch unread notifications and messages count
    const fetchUnreadCounts = async () => {
      try {
        if (!user?.id) return;
        
        // Mock data for demo - replace with actual API calls later
        setUnreadNotifications(3);
        setUnreadMessages(2);
        
        /* Removed supabase references 
        const [notificationsResponse, messagesResponse] = await Promise.all([
          supabase
            .from('notifications')
            .select('id', { count: 'exact' })
            .eq('user_id', user?.id)
            .eq('read', false),
          supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('recipient_id', user?.id)
            .eq('unread', true)
        ]);

        setUnreadNotifications(notificationsResponse.count || 0);
        setUnreadMessages(messagesResponse.count || 0);
        */
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    if (user?.id) {
      fetchUnreadCounts();
    }
  }, [user?.id]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      try {
        // Create welcome notification for new users
        const welcomeNotification = {
          id: 'welcome-1',
          title: 'Welcome to Emotions',
          content: 'Hi! Welcome to Emotions. Feel free to take a tour around and familiarize yourself with our cool features to help you monitor, analyze and receive personalized recommendations to do with your mental health. Try our Journal feature, or Stress analytics feature or even emotional checkin!',
          created_at: new Date().toISOString(),
          read: false,
          type: 'welcome' as const
        } as Notification;

        // Add mock notifications
        const mockNotifications: Notification[] = [
          welcomeNotification,
          {
            id: 'notif-1',
            title: 'New mood insights available',
            content: 'We\'ve analyzed your mood patterns from the past week. Check out your personalized insights!',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            read: false,
            type: 'update' as const
          },
          {
            id: 'notif-2',
            title: 'Journal entry reminder',
            content: 'It\'s been a few days since your last journal entry. Take a moment to reflect on your day.',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            read: true,
            type: 'reminder' as const
          }
        ];
        
        setNotifications(mockNotifications);
        setUnreadNotifications(2);

        /* Removed supabase references
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;

        if (data && data.length > 0) {
          // Map database fields to our Notification interface
          const mappedNotifications: Notification[] = data.map((item: DbNotification) => ({
            id: item.id,
            title: item.title,
            content: item.message,
            created_at: item.created_at,
            read: item.read,
            type: 'other' as const,  // Default type if not available
            user_id: item.user_id
          }));
          
          // Check if welcome notification exists
          const hasWelcomeNotification = mappedNotifications.some(n => n.title.includes('Welcome'));
          
          // If no welcome notification exists, add it to the beginning of the array
          if (!hasWelcomeNotification) {
            setNotifications([welcomeNotification, ...mappedNotifications]);
            // Increment unread notifications counter for the welcome message
            setUnreadNotifications(prev => prev + 1);
          } else {
            setNotifications(mappedNotifications);
          }
        } else {
          // No notifications exist, add welcome notification
          setNotifications([welcomeNotification]);
          // Set unread notification counter to 1 for the welcome message
          setUnreadNotifications(1);
        }
        */
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  // Handle clicking outside the notification popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  // Handle search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setIsSearchOpen(value.length > 0);
    
    if (!value) {
      setSearchResults([]);
      return;
    }

    const results = searchableItems.filter(
      item =>
        item.title.toLowerCase().includes(value.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(value.toLowerCase()))
    );

    setSearchResults(results);
  };

  // Handle search result click
  const handleSearchResultClick = (href: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(href);
  };

  const fetchNotificationCount = async () => {
    if (!user?.id) return;

    try {
      // Mock notification count
      setUnreadNotifications(2);
      
      /* Removed supabase references
      const { data, error } = await supabase
        .from('notifications')
        .select('id, read')
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter out notifications that are marked as read in localStorage
      const filteredData = data ? data.filter(n => {
        // If marked read in localStorage, consider it read regardless of database
        return !(localStorage.getItem(`notification_${n.id}_read`) === 'true');
      }) : [];

      // Count actually unread items after localStorage check
      const unreadCount = filteredData.filter(item => !item.read).length;
      
      setUnreadNotifications(unreadCount > 0 || (unreadCount === 0 && data?.length === 0) ? unreadCount : 0);
      */
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const markNotificationAsRead = async (id: string, read: boolean) => {
    try {
      // For both UI responsiveness and persistence
      if (read) {
        localStorage.setItem(`notification_${id}_read`, 'true');
        
        // Immediately update the unread count in the UI for responsiveness
        if (unreadNotifications > 0) {
          setUnreadNotifications(prev => prev - 1);
        }
      }

      // Update notifications list
      setNotifications(prev => 
        prev.map(n => n.id === id ? {...n, read: true} : n)
      );

      /* Removed supabase references
      // For demo notifications, don't update database
      if (id === 'welcome-1') {
        return;
      }

      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: read,
          updated_at: new Date().toISOString() // Add timestamp to ensure update is processed
        })
        .eq('id', id)
        .eq('user_id', user?.id || '');

      if (error) {
        throw error;
      }
      */
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // On error, still keep localStorage updated to ensure the best UX
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Find if the notification is unread before removing it
      const notification = notifications.find(n => n.id === id);
      const isUnread = notification && !notification.read;
      
      // Update local state immediately
      setNotifications(notifications.filter(n => n.id !== id));
      
      // If it was unread, update the unread count
      if (isUnread) {
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      }
      
      // Use toast function without methods
      console.log("Notification deleted");
      
      /* Removed supabase references
      // If this is a real notification (not mock), delete from database
      if (id !== 'welcome-1' && user?.id) {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
          
        toast.success("Notification deleted");
      }
      */
    } catch (error) {
      console.error('Error deleting notification:', error);
      // toast.error("Failed to delete notification");
      console.log("Failed to delete notification");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markNotificationAsRead(notification.id, true);
    }
    
    // Close notification panel
    setNotificationOpen(false);
    
    // Navigate to the notifications page for all notifications
    navigate('/patient-dashboard/notifications');
  };

  const handleNotificationDialogClose = () => {
    setNotificationDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleSignout = async () => {
    try {
      console.log("Starting signout from patient dashboard");
      // First clear localStorage to prevent flashing of content
      localStorage.removeItem('auth_state');
      
      // Disable any signout buttons to prevent multiple clicks
      const signoutButtons = document.querySelectorAll('[data-signout-button]');
      signoutButtons.forEach(button => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
        }
      });
      
      // Show loading message
      console.log("Signing out...");
      
      await signOut();
      
      console.log("Signed out successfully");
      
      // Force redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
      
      // Re-enable buttons on error
      const signoutButtons = document.querySelectorAll('[data-signout-button]');
      signoutButtons.forEach(button => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
        }
      });
    }
  };

  // Add this function to mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      // Mark all notifications as read in the UI
      const notificationsToUpdate = [...notifications].filter(n => !n.read);
      
      // Mark all as read in localStorage for immediate UI effect
      notificationsToUpdate.forEach(notification => {
        localStorage.setItem(`notification_${notification.id}_read`, 'true');
      });

      // Also mark the welcome notification if it exists
      localStorage.setItem('notification_welcome-1_read', 'true');

      // Update UI state immediately
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadNotifications(0);

      /* Removed supabase references
      // First, get all notifications for this user
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user?.id || '');

      if (fetchError) throw fetchError;

      // Update database - include retry logic
      const updateNotifications = async (retryCount = 0) => {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ 
            read: true, 
            updated_at: new Date().toISOString() // Add timestamp to ensure update is processed
          })
          .eq('user_id', user?.id || '');

        if (updateError) {
          if (retryCount < 2) { // Retry up to 2 times
            console.log(`Retrying database update (${retryCount + 1})...`);
            setTimeout(() => updateNotifications(retryCount + 1), 1000);
          } else {
            throw updateError;
          }
        }
      };

      await updateNotifications();
      */
      
      // Refresh notification count after successful update
      fetchNotificationCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // On error, still keep localStorage updated to ensure the best UX
    }
  };

  // Use safe approach to access user data
  const firstName = user?.first_name || 'User';
  const lastName = user?.last_name || '';
  const avatarUrl = user?.avatar_url || '';
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Notification dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNotification?.title || "Notification"}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {selectedNotification?.content || ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between items-center">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if (selectedNotification) {
                  deleteNotification(selectedNotification.id);
                  setNotificationDialogOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleNotificationDialogClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <span className="sr-only">Toggle sidebar</span>
              {sidebarOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </Button>
            <Link to="/" className="flex items-center">
              <img
                src="/assets/emotions-logo-black.png"
                alt="Emotions Dashboard Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-2xl mx-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (searchResults.length > 0) {
                handleSearchResultClick(searchResults[0].href);
              }
            }} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search dashboard..."
                className="w-full pl-10 pr-4 rounded-full border-gray-200"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => setIsSearchOpen(searchQuery.length > 0)}
              />

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[400px] overflow-y-auto z-50">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {Object.entries(
                        searchResults.reduce((acc, item) => {
                          acc[item.category] = [...(acc[item.category] || []), item];
                          return acc;
                        }, {} as Record<string, SearchResult[]>)
                      ).map(([category, items]) => (
                        <div key={category}>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                            {category}
                          </div>
                          {items.map((item) => (
                            <button
                              key={item.href}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                              onClick={() => handleSearchResultClick(item.href)}
                            >
                              {isValidIcon(item.icon) ? (
                                <item.icon className="h-4 w-4 text-gray-500" />
                              ) : null}
                              <div>
                                <div className="text-sm font-medium">{item.title}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 rounded-full hover:bg-slate-100"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent ref={notificationRef} className="w-80 p-0 mr-4">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadNotifications > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNotificationsAsRead();
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-3 cursor-pointer hover:bg-slate-50 ${!notification.read ? 'bg-blue-50/40' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center 
                              ${notification.type === 'welcome' ? 'bg-green-100 text-green-600' : 
                                notification.type === 'update' ? 'bg-blue-100 text-blue-600' :
                                notification.type === 'reminder' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {notification.type === 'welcome' ? '👋' : 
                               notification.type === 'update' ? '🔄' :
                               notification.type === 'reminder' ? '⏰' : '📢'}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{notification.content}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(notification.created_at).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-slate-200 bg-slate-50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => navigate('/patient-dashboard/notifications')}
                  >
                    View all notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Messages */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full hover:bg-slate-100"
              onClick={() => navigate('/patient-dashboard/messages')}
            >
              <MessageSquare className="h-5 w-5" />
              {unreadMessages > 0 && (
                <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></div>
              )}
            </Button>

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 cursor-pointer border-2 border-blue-100">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {firstName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{firstName} {lastName}</span>
                    <span className="text-xs text-slate-500">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/patient-dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/patient-dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignout} data-signout-button>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Signout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="md:hidden px-4 py-2 fixed top-16 z-40 w-full bg-white border-b border-slate-200">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (searchResults.length > 0) {
            handleSearchResultClick(searchResults[0].href);
          }
        }} className="flex w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search dashboard..."
              className="w-full pl-10 pr-4 rounded-full border-gray-200"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setIsSearchOpen(searchQuery.length > 0)}
            />
          </div>
        </form>
      </div>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 z-30 flex w-64 flex-col bg-white border-r border-slate-200 top-16 transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex grow flex-col overflow-y-auto pt-0">
            <nav className="flex flex-1 flex-col pt-5 pb-20">
              <div className="px-4 mb-5">
                <div 
                  className="rounded-xl p-3 cursor-pointer hover:bg-[#1AB0E0] transition-colors"
                  style={{ backgroundColor: "#20C0F3" }}
                  onClick={() => navigate('/patient-dashboard/mood-tracker')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                      <HeartPulse className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Emotional Wellness</p>
                      <p className="text-xs text-white font-semibold">Start Daily Check-in</p>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="ml-auto h-8 w-8 rounded-full bg-white text-[#20C0F3] hover:bg-blue-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/patient-dashboard/mood-tracker');
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <ul role="list" className="flex flex-1 flex-col px-3 gap-y-5">
                {navigationWithAdminLink.map((section) => (
                  <li key={section.section}>
                    <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {section.section}
                    </div>
                    <ul role="list" className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = currentPath === item.href;
                        return (
                          <li key={item.name}>
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className={`w-full justify-start gap-x-3 ${
                                isActive 
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium" 
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                              onClick={() => {
                                navigate(item.href);
                                if (isMobile) setSidebarOpen(false);
                              }}
                            >
                              {isValidIcon(item.icon) ? (
                                <item.icon 
                                  className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-blue-700" : "text-slate-500"}`} 
                                  aria-hidden="true" 
                                />
                              ) : null}
                              {item.name}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              
              <div className="px-3 mt-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-x-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleSignout}
                  data-signout-button
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  Signout
                </Button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 w-full mt-0 ${sidebarOpen ? "lg:pl-64" : ""}`}>
          <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
            <div className="max-w-full overflow-x-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}



