import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Supabase import removed
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuth } from "@/hooks/use-auth";
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
  MessageSquare,
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
  Search,
  Trash2,
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
  HeartPulse,
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: 'appointment' | 'message' | 'review' | 'update' | 'other';
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

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signout, getFullName, isAuthenticated } = useAuth();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const location = useLocation();

  // Add state for search dropdown
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update current path when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location]);

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

  // Fetch unread counts periodically
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Fetch notifications when drawer opens
  useEffect(() => {
    if (notificationOpen && isAuthenticated && user) {
      fetchNotifications();
    }
  }, [notificationOpen, isAuthenticated, user]);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Function to fetch unread counts
  const fetchUnreadCounts = async () => {
    if (!user) return;
    
    try {
      // Fetch unread notifications count
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (notifError) throw notifError;
      
      setUnreadNotifications(notifData ? notifData.length : 0);
      
      // Fetch unread messages count
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('read', false);
        
      if (msgError) throw msgError;
      
      setUnreadMessages(msgData ? msgData.length : 0);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
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
        
      if (error) throw error;
      
      if (data) {
        // Transform the data to match our Notification interface
        const formattedNotifications: Notification[] = data.map((item: DbNotification) => ({
          id: item.id,
          title: item.title,
          content: item.message,
          created_at: item.created_at,
          read: item.read,
          type: determineNotificationType(item.title), // Helper function to determine type
          user_id: item.user_id
        }));
        
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    }
  };
  
  // Helper function to determine notification type
  const determineNotificationType = (title: string): Notification['type'] => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('appointment')) return 'appointment';
    if (lowerTitle.includes('message')) return 'message';
    if (lowerTitle.includes('review')) return 'review';
    if (lowerTitle.includes('update')) return 'update';
    return 'other';
  };

  // Mark notification as read
  const markNotificationAsRead = async (id: string, read: boolean) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read } : notif
        )
      );
      
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

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    // Mark as read if not already
    if (!notification.read) {
      markNotificationAsRead(notification.id, true);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      // Get IDs of unread notifications
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
        
      if (unreadIds.length === 0) return;
      
      // Update database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadNotifications(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  // Format time for notifications
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.round(diffInHours)} hour${Math.round(diffInHours) === 1 ? '' : 's'} ago`;
    } else {
      const diffInDays = diffInHours / 24;
      if (diffInDays < 7) {
        return `${Math.round(diffInDays)} day${Math.round(diffInDays) === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  // Handle search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Filter searchable items
    const results = searchableItems.filter(item => 
      item.title.toLowerCase().includes(value.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(value.toLowerCase()))
    );
    
    setSearchResults(results);
  };

  // Handle search result click
  const handleSearchResultClick = (href: string) => {
    setSearchOpen(false);
    navigate(href);
  };

  // Handle sign out
  const handleSignout = async () => {
    console.log("Signing out from mood mentor dashboard");
    try {
      // First clear localStorage to prevent flashing of content
      localStorage.removeItem('auth_state');
      
      // Disable any signout buttons to prevent multiple clicks
      const signoutButtons = document.querySelectorAll('[data-signout-button]');
      signoutButtons.forEach(button => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
        }
      });
      
      // Show toast once
      const toastId = toast.loading("Signing out...");
      
      await signout();
      
      // Clear the toast
      toast.dismiss(toastId);
      toast.success("Signed out successfully!");
      
      // Use React Router navigation to avoid refresh issues
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  // Determine if a link is active
  const isActive = (href: string) => {
    if (href === '/mood-mentor-dashboard') {
      return currentPath === '/mood-mentor-dashboard';
    }
    return currentPath.startsWith(href);
  };

  // Get icon for notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'review':
        return <Star className="h-5 w-5 text-amber-500" />;
      case 'update':
        return <Info className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
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
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Mood Mentor</span>
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
        <div className="p-4 space-y-6 h-[calc(100vh-5rem)] overflow-y-auto">
          {moodMentorNavigation.map((section) => (
            <div key={section.section} className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg group transition-colors",
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive(item.href)
                          ? "text-blue-600"
                          : "text-gray-500 group-hover:text-gray-600"
                      )}
                    />
                    {item.name}
                    {item.name === 'Notifications' && unreadNotifications > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto bg-red-500 hover:bg-red-600"
                      >
                        {unreadNotifications}
                      </Badge>
                    )}
                    {item.name === 'Messages' && unreadMessages > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto bg-red-500 hover:bg-red-600"
                      >
                        {unreadMessages}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Sign Out */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={handleSignout}
              data-signout-button
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-500" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu and search */}
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              {/* Search */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-full flex items-center text-sm rounded-md border border-gray-300 bg-white px-3 h-9 text-gray-500 hover:bg-gray-50"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span>Search...</span>
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-gray-100 px-1.5 font-mono text-xs font-medium text-gray-500">
                    <span className="text-xs">Ctrl</span>K
                  </kbd>
                </button>
              </div>
            </div>

            {/* User menu and notifications */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <Bell className="h-5 w-5 text-gray-500" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </Button>
                
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs"
                          onClick={markAllNotificationsAsRead}
                        >
                          Mark all as read
                        </Button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p>No notifications yet</p>
                          <p className="text-sm mt-1">
                            We'll let you know when something happens
                          </p>
                        </div>
                      ) : (
                        <div>
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mr-3 mt-0.5">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium text-gray-900 ${
                                    !notification.read ? 'font-semibold' : ''
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {notification.content}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="ml-2 mt-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          ))}
                          {notifications.length > 0 && (
                            <div className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setNotificationOpen(false);
                                  navigate('/mood-mentor-dashboard/notifications');
                                }}
                              >
                                View all notifications
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 rounded-full" size="icon">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url || ""}
                        alt="User avatar"
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getFullName()
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getFullName()}</p>
                      <p className="text-xs leading-none text-gray-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/mood-mentor-dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/mood-mentor-dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignout} data-signout-button>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Welcome banner */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {getWelcomeMessage()}, {getFullName()?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what's happening with your patients and appointments today.
          </p>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 relative">
          <ErrorBoundary fallback={<DashboardErrorFallback dashboardType="mood_mentor" />}>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Notification dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
            <DialogDescription className="pt-4">
              {selectedNotification?.content}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={searchQuery}
          onValueChange={handleSearchInput}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup>
              {searchResults.map((result) => (
                <CommandItem
                  key={result.href}
                  onSelect={() => handleSearchResultClick(result.href)}
                >
                  {result.icon && <result.icon className="mr-2 h-4 w-4" />}
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

// Fallback component for errors
const DashboardErrorFallback = ({ dashboardType }: { dashboardType: 'patient' | 'mood_mentor' }) => {
  const navigate = useNavigate();
  const dashboardPath = dashboardType === 'patient' ? '/patient-dashboard' : '/mood-mentor-dashboard';
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">Something went wrong</h2>
        <p className="text-gray-600">
          We encountered an error while loading this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" onClick={() => navigate(dashboardPath)}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}; 


