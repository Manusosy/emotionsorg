import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
// Supabase import removed
import { Separator } from '@/components/ui/separator';
import { Loader2, KeyRound, Bell, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Supabase import removed

interface MoodMentorSettings {
  id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  appointment_reminders: boolean;
  message_notifications: boolean;
  review_notifications: boolean;
  marketing_emails: boolean;
  profile_privacy: 'public' | 'private' | 'connections_only';
  two_factor_enabled: boolean;
  auto_accept_appointments: boolean;
  working_hours: {
    monday: { enabled: boolean, start: string, end: string },
    tuesday: { enabled: boolean, start: string, end: string },
    wednesday: { enabled: boolean, start: string, end: string },
    thursday: { enabled: boolean, start: string, end: string },
    friday: { enabled: boolean, start: string, end: string },
    saturday: { enabled: boolean, start: string, end: string },
    sunday: { enabled: boolean, start: string, end: string },
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  
  const [settings, setSettings] = useState<MoodMentorSettings>({
    id: '',
    notifications_enabled: true,
    email_notifications: true,
    appointment_reminders: true,
    message_notifications: true,
    review_notifications: true,
    marketing_emails: false,
    profile_privacy: 'public',
    two_factor_enabled: false,
    auto_accept_appointments: false,
    working_hours: {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '10:00', end: '14:00' },
      sunday: { enabled: false, start: '10:00', end: '14:00' },
    },
  });

  // Fetch settings data
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const response = await moodMentorService.getMoodMentorSettings(user.id);
        
        if (response.success && response.data) {
          setSettings({
            ...settings,
            ...response.data,
            id: user.id,
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user?.id]);

  // Handle switch change
  const handleSwitchChange = (field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle nested switch change (for working hours)
  const handleWorkingHoursChange = (day: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day as keyof typeof prev.working_hours],
          [field]: value
        }
      }
    }));
  };
  
  // Handle radio change
  const handleRadioChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear any previous error
    setPasswordError('');
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle password update
  const handlePasswordUpdate = async () => {
    try {
      setIsSaving(true);
      setPasswordError('');
      
      // Basic validation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return;
      }
      
      // Call auth service to update password
      const response = await authService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.error) {
        setPasswordError(response.error.message);
        return;
      }
      
      toast.success('Password updated successfully');
      
      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Update settings
      const response = await moodMentorService.updateMoodMentorSettings(user?.id || '', settings);
      
      if (response.success) {
        toast.success('Settings updated successfully');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full bg-muted border-b rounded-none justify-start h-auto p-0">
              <TabsTrigger
                value="general"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Security & Privacy
              </TabsTrigger>
              <TabsTrigger
                value="working-hours"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Working Hours
              </TabsTrigger>
            </TabsList>
            
            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure your account preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto_accept_appointments" className="text-base">
                          Auto-accept appointment requests
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically accept appointment requests from patients
                        </p>
                      </div>
                      <Switch 
                        id="auto_accept_appointments"
                        checked={settings.auto_accept_appointments}
                        onCheckedChange={(checked) => handleSwitchChange('auto_accept_appointments', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Management</CardTitle>
                  <CardDescription>
                    Manage your account or delete it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={() => navigate('/mood-mentor-dashboard/settings/delete-account')}
                      >
                        Delete Account
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        This will permanently delete your account and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifications_enabled" className="text-base">
                          Enable all notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Master control for all notifications
                        </p>
                      </div>
                      <Switch 
                        id="notifications_enabled"
                        checked={settings.notifications_enabled}
                        onCheckedChange={(checked) => handleSwitchChange('notifications_enabled', checked)}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">App Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="appointment_reminders" className="text-sm">
                            Appointment reminders
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications about upcoming appointments
                          </p>
                        </div>
                        <Switch 
                          id="appointment_reminders"
                          checked={settings.appointment_reminders}
                          disabled={!settings.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('appointment_reminders', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="message_notifications" className="text-sm">
                            Message notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications when you get new messages
                          </p>
                        </div>
                        <Switch 
                          id="message_notifications"
                          checked={settings.message_notifications}
                          disabled={!settings.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('message_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="review_notifications" className="text-sm">
                            Review notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications when patients leave reviews
                          </p>
                        </div>
                        <Switch 
                          id="review_notifications"
                          checked={settings.review_notifications}
                          disabled={!settings.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('review_notifications', checked)}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Email Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_notifications" className="text-sm">
                            Email notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch 
                          id="email_notifications"
                          checked={settings.email_notifications}
                          disabled={!settings.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('email_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="marketing_emails" className="text-sm">
                            Marketing emails
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive emails about new features and updates
                          </p>
                        </div>
                        <Switch 
                          id="marketing_emails"
                          checked={settings.marketing_emails}
                          disabled={!settings.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('marketing_emails', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    
                    {passwordError && (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button
                      onClick={handlePasswordUpdate}
                      disabled={
                        isSaving || 
                        !passwordData.currentPassword || 
                        !passwordData.newPassword || 
                        !passwordData.confirmPassword
                      }
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : 'Update Password'}
                    </Button>
                    
                    <p className="text-sm text-muted-foreground">
                      Passwords must be at least 8 characters long and should include a mix of letters, numbers, and special characters.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="two_factor_enabled" className="text-base">
                        Enable Two-Factor Authentication
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Protect your account with an additional security layer
                      </p>
                    </div>
                    <Switch 
                      id="two_factor_enabled"
                      checked={settings.two_factor_enabled}
                      onCheckedChange={(checked) => handleSwitchChange('two_factor_enabled', checked)}
                    />
                  </div>
                  
                  {settings.two_factor_enabled && (
                    <Alert>
                      <KeyRound className="h-4 w-4" />
                      <AlertTitle>Two-Factor Authentication is enabled</AlertTitle>
                      <AlertDescription>
                        You will be asked for a verification code when you sign in on a new device.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control who can see your profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Profile Privacy</Label>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="privacy-public"
                            name="profile_privacy"
                            value="public"
                            className="rounded text-primary focus:ring-primary"
                            checked={settings.profile_privacy === 'public'}
                            onChange={() => handleRadioChange('profile_privacy', 'public')}
                          />
                          <Label htmlFor="privacy-public" className="text-sm font-normal">
                            Public - Anyone can view your profile
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="privacy-connections"
                            name="profile_privacy"
                            value="connections_only"
                            className="rounded text-primary focus:ring-primary"
                            checked={settings.profile_privacy === 'connections_only'}
                            onChange={() => handleRadioChange('profile_privacy', 'connections_only')}
                          />
                          <Label htmlFor="privacy-connections" className="text-sm font-normal">
                            Connections Only - Only your patients can view your profile
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="privacy-private"
                            name="profile_privacy"
                            value="private"
                            className="rounded text-primary focus:ring-primary"
                            checked={settings.profile_privacy === 'private'}
                            onChange={() => handleRadioChange('profile_privacy', 'private')}
                          />
                          <Label htmlFor="privacy-private" className="text-sm font-normal">
                            Private - Your profile is not visible to others
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Working Hours Tab */}
            <TabsContent value="working-hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Working Hours</CardTitle>
                  <CardDescription>
                    Set your working hours for each day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {daysOfWeek.map((day, index) => (
                      <div key={day} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium">{dayNames[index]}</h3>
                          <Switch 
                            checked={settings.working_hours[day as keyof typeof settings.working_hours].enabled}
                            onCheckedChange={(checked) => handleWorkingHoursChange(day, 'enabled', checked)}
                          />
                        </div>
                        
                        {settings.working_hours[day as keyof typeof settings.working_hours].enabled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`${day}-start`} className="text-xs">Start Time</Label>
                              <Input
                                id={`${day}-start`}
                                type="time"
                                value={settings.working_hours[day as keyof typeof settings.working_hours].start}
                                onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`${day}-end`} className="text-xs">End Time</Label>
                              <Input
                                id={`${day}-end`}
                                type="time"
                                value={settings.working_hours[day as keyof typeof settings.working_hours].end}
                                onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
} 


