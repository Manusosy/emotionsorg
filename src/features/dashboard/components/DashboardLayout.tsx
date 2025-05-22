import { userService } from '../../../services'
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Supabase import removed
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/authContext";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  ShieldAlert,
  Sparkles,
  BarChart2,
  UserCheck,
  Briefcase,
  Brain,
  UserCog,
  Award,
  PlayCircle,
  Zap,
  ChevronLeft,
  Star,
  Info,
  LayoutDashboard
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
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { UserWithMetadata } from '@/services/auth/auth.service';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: 'appointment' | 'message' | 'review' | 'update' | 'welcome' | 'reminder' | 'mood_alert' | 'journal' | 'group' | 'other';
  user_id?: string;
  link?: string;
  metadata?: Record<string, any>;
}

interface DbNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: Notification['type'];
  user_id: string;
  link: string | null;
  metadata: Record<string, any>;
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

const moodMentorNavigation = [
  {
    section: "Main",
    items: [
      { name: "Overview", href: "/mood-mentor-dashboard", icon: LayoutDashboard },
      { name: "Appointments", href: "/mood-mentor-dashboard/appointments", icon: Calendar },
      { name: "Patients", href: "/mood-mentor-dashboard/patients", icon: Users },
      { name: "Support Groups", href: "/mood-mentor-dashboard/groups", icon: UserCheck },
      { name: "Messages", href: "/mood-mentor-dashboard/messages", icon: MessageSquare },
    ]
  },
  {
    section: "Professional",
    items: [
      { name: "Resources", href: "/mood-mentor-dashboard/resources", icon: BookOpen },
      { name: "Reviews", href: "/mood-mentor-dashboard/reviews", icon: Star },
      { name: "Analytics", href: "/mood-mentor-dashboard/analytics", icon: BarChart2 },
    ]
  },
  {
    section: "Account",
    items: [
      { name: "Profile", href: "/mood-mentor-dashboard/profile", icon: User },
      { name: "Notifications", href: "/mood-mentor-dashboard/notifications", icon: Bell },
      { name: "Settings", href: "/mood-mentor-dashboard/settings", icon: Settings },
      { name: "Help Center", href: "/mood-mentor-dashboard/help", icon: BadgeHelp },
    ]
  }
];

// Define searchable items based on role
const patientSearchableItems: SearchResult[] = [
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

// Mood mentor searchable items could be added here

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut, isAuthenticated, userRole, getFullName, refreshSession } = useAuth();
  const authLoading = false; // Force this to false instead of using the actual loading state
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [signOutLoading, setSignOutLoading] = useState(false);
  
  // State for notification dialog
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // User role checks for conditional rendering
  const isMentor = user?.user_metadata?.role === 'mood_mentor';
  const isPatient = user?.user_metadata?.role === 'patient' || !isMentor;

  // Get navigation based on role
  const userNavigation = isMentor ? moodMentorNavigation : patientNavigation;
  const searchableItems = patientSearchableItems; // Could be extended for mentor

  // Update current path when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location]);
  
  // Handle outside clicks for search
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

  // Handle outside clicks for notifications
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
  }, [notificationRef]);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch unread counts periodically
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 300000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Fetch notifications when drawer opens
  useEffect(() => {
    if (notificationOpen && isAuthenticated && user) {
      fetchNotifications();
    }
  }, [notificationOpen, isAuthenticated, user]);

  // Function to fetch unread counts
  const fetchUnreadCounts = async () => {
    try {
      // First check if the user is authenticated
      if (!user?.id) {
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) {
        // Handle table not found errors (404 Not Found)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist yet. This is normal if the app is newly deployed.');
          // Don't update state to avoid re-renders
          return;
        }
        throw error;
      }
      
      // Only update state if the count has changed to avoid unnecessary re-renders
      const newCount = data?.length || 0;
      if (newCount !== unreadNotifications) {
        setUnreadNotifications(newCount);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      // Don't show error toast since this is a background operation
      // Don't update state to avoid triggering re-renders on error
    }
  };

  // Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        // If table doesn't exist, just set empty notifications and don't show error
        if (error.code === '42P01') {
          setNotifications([]);
          return;
        }
        throw error;
      }
      
      // Map database format to component format
      const mappedNotifications: Notification[] = data.map((n: DbNotification) => ({
        id: n.id,
        title: n.title,
        content: n.message,
        created_at: n.created_at,
        read: n.is_read,
        type: n.type,
        user_id: n.user_id,
        link: n.link || undefined,
        metadata: n.metadata
      }));
      
      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Only show error toast if it's not a missing table error
      if (error.code !== '42P01') {
        toast.error('Failed to load notifications');
      }
    }
  };

  // Helper to determine notification type
  const determineNotificationType = (title: string): Notification['type'] => {
    if (title.toLowerCase().includes('appointment')) return 'appointment';
    if (title.toLowerCase().includes('message')) return 'message';
    if (title.toLowerCase().includes('review')) return 'review';
    if (title.toLowerCase().includes('update')) return 'update';
    if (title.toLowerCase().includes('welcome')) return 'welcome';
    if (title.toLowerCase().includes('reminder')) return 'reminder';
    return 'other';
  };

  // Function to mark notification as read
  const markNotificationAsRead = async (id: string, read: boolean) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: read })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read } : n
      ));
      
      // Update unread count
      if (read) {
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      } else {
        setUnreadNotifications(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    }
  };

  // Function to delete notification
  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      const updatedNotifications = notifications.filter(n => n.id !== id);
      setNotifications(updatedNotifications);
      
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Function to handle notification click
  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    
    // If there's a link, navigate to it
    if (notification.link) {
      navigate(notification.link);
    } else {
      // Otherwise show the dialog
      setNotificationDialogOpen(true);
    }
    
    // Mark as read if not already
    if (!notification.read) {
      markNotificationAsRead(notification.id, true);
    }
  };

  // Function to handle notification dialog close
  const handleNotificationDialogClose = () => {
    setNotificationDialogOpen(false);
    setSelectedNotification(null);
  };

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      // Get IDs of unread notifications
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
        
      if (unreadIds.length === 0) return;
      
      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadNotifications(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  // Function to handle search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Filter searchable items based on query
    const query = value.toLowerCase();
    const results = searchableItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
  };

  // Function to handle search result click
  const handleSearchResultClick = (href: string) => {
    setIsSearchOpen(false);
    navigate(href);
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Utility function to check if a link is active
  const isActive = (href: string) => {
    if (href === '/mood-mentor-dashboard' || href === '/patient-dashboard') {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  // Function to get appropriate notification icon
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'message': return MessageSquare;
      case 'review': return Star;
      case 'update': return Info;
      case 'welcome': return Sparkles;
      case 'reminder': return Clock;
      default: return Bell;
    }
  };

  // Function to format notification time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  };

  // Get welcome message based on time of day
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ErrorBoundary fallback={<DashboardErrorFallback dashboardType={isMentor ? 'mood_mentor' : 'patient'} />}>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out md:translate-x-0 md:relative`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b h-16">
            <div className="flex items-center gap-2">
              <img
                src="/assets/emotions-logo-black.png"
                alt="Emotions App"
                className="h-8 w-auto"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-64px)]">
            {userNavigation.map((section) => (
              <div key={section.section}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`${
                            isActive(item.href)
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-100'
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all`}
                        >
                          {ItemIcon && (
                            <ItemIcon className={`mr-3 h-5 w-5 ${
                              isActive(item.href) ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-600'
                            }`} />
                          )}
                          {item.name}
                          
                          {/* Show unread indicators */}
                          {item.name === 'Notifications' && unreadNotifications > 0 && (
                            <Badge className="ml-auto bg-red-500">{unreadNotifications}</Badge>
                          )}
                          {item.name === 'Messages' && unreadMessages > 0 && (
                            <Badge className="ml-auto bg-red-500">{unreadMessages}</Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 h-16">
            <div className="flex items-center justify-between px-4 h-full">
              {/* Left side controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {/* Search Button */}
                <div className="hidden sm:block relative" ref={searchRef}>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 justify-start"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    <span>Search...</span>
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                  
                  {isSearchOpen && (
                    <div className="absolute top-full left-0 mt-1 w-96 bg-white shadow-lg rounded-md border z-50">
                      <div className="p-2">
                        <Input
                          type="search"
                          placeholder="Search..."
                          className="w-full"
                          value={searchQuery}
                          onChange={(e) => handleSearchInput(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {searchResults.length > 0 ? (
                          <div className="p-2">
                            {searchResults.map((result, index) => {
                              const ResultIcon = result.icon;
                              return (
                                <div
                                  key={index}
                                  className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                                  onClick={() => handleSearchResultClick(result.href)}
                                >
                                  <div className="flex items-center">
                                    {ResultIcon && <ResultIcon className="h-4 w-4 mr-2 text-gray-500" />}
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{result.title}</p>
                                      {result.description && (
                                        <p className="text-xs text-gray-500">{result.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : searchQuery ? (
                          <div className="p-4 text-center text-gray-500">
                            No results found
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Button>
                  
                  {notificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-md border z-50">
                      <div className="p-3 border-b flex items-center justify-between">
                        <h3 className="font-medium">Notifications</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllNotificationsAsRead}
                          disabled={unreadNotifications === 0}
                        >
                          Mark all as read
                        </Button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => {
                            const NotificationIcon = getNotificationIcon(notification.type);
                            return (
                              <div
                                key={notification.id}
                                className={`p-2 hover:bg-gray-100 rounded-md cursor-pointer ${
                                  !notification.read ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex items-start">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                                    !notification.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <NotificationIcon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                      {notification.content}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {formatTime(notification.created_at)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No notifications
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user?.user_metadata?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.name || "User")}`}
                          alt={user?.user_metadata?.name || "User"}
                        />
                        <AvatarFallback>
                          {user?.user_metadata?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email || ''}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(isMentor ? '/mood-mentor-dashboard/profile' : '/patient-dashboard/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(isMentor ? '/mood-mentor-dashboard/settings' : '/patient-dashboard/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} disabled={signOutLoading}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{signOutLoading ? 'Signing out...' : 'Sign out'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {/* Dashboard Content */}
            {children}
          </main>
        </div>
      </div>
      
      {/* Notification Dialog */}
      {selectedNotification && (
        <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedNotification.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>{selectedNotification.content}</p>
              <p className="text-sm text-gray-500 mt-4">
                Received {new Date(selectedNotification.created_at).toLocaleString()}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleNotificationDialogClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ErrorBoundary>
  );
}

// Error fallback component
const DashboardErrorFallback = ({ dashboardType }: { dashboardType: 'patient' | 'mood_mentor' }) => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  
  const handleTryAgain = async () => {
    setIsRecovering(true);
    try {
      // First try refreshing the auth session
      const refreshed = await refreshSession();
      
      if (refreshed) {
        // If refresh successful, reload the page
        window.location.reload();
      } else {
        // If refresh failed, try a simple page reload
        window.location.reload();
      }
    } catch (error) {
      console.error('Error during recovery attempt:', error);
      // Fall back to reload
      window.location.reload();
    } finally {
      setIsRecovering(false);
    }
  };
  
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          We encountered an error while loading your dashboard. Please try again or contact support if the issue persists.
        </p>
        <div className="space-y-4">
          <Button
            className="w-full"
            onClick={handleTryAgain}
            disabled={isRecovering}
          >
            {isRecovering ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Recovering...
              </>
            ) : (
              'Try Again'
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Instead of direct navigation which might lose auth state,
              // try to navigate with a page reload for fresh state
              window.location.href = dashboardType === 'mood_mentor' 
                ? '/mood-mentor-dashboard' 
                : '/patient-dashboard';
            }}
            disabled={isRecovering}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              // Go to home with page reload for fresh state
              window.location.href = '/';
            }}
            disabled={isRecovering}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};



