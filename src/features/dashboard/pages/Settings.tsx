import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Supabase import removed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { getDeviceInfo, getFormattedDeviceInfo } from '@/utils/device-detection';
import { toast } from '@/components/ui/use-toast';
// Supabase import removed

// Define the schema for patient profile form
const patientFormSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone_number: z.string().min(10, 'Please enter a valid phone number'),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say'], {
    required_error: "Please select a gender",
  }),
  date_of_birth: z.string().optional(),
  country: z.string().min(1, 'Please select your country'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  avatar_url: z.string().optional(),
  about_me: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

// Define the patient profile type
interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  date_of_birth: string;
  country: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar_url: string;
  about_me: string;
  created_at: string;
  updated_at: string;
  patient_id?: string;
}

// Define gender options
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasUpdatedDeviceInfo, setHasUpdatedDeviceInfo] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-load form data with empty values to reduce flickering
  const defaultValues: PatientFormValues = {
    first_name: '',
    last_name: '',
    phone_number: '',
    gender: 'prefer-not-to-say',
    date_of_birth: '',
    country: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    avatar_url: '',
    about_me: '',
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues,
    // Don't validate on mount to reduce initial load time
    mode: 'onSubmit'
  });

  // Load user profile data only once
  useEffect(() => {
    const loadPatientProfile = async () => {
      // Skip if we've already initialized to prevent blinking
      if (hasInitialized) return;
      
      try {
        if (!user?.id) return;
        
        // Immediately set default values to prevent form field flickering
        Object.keys(defaultValues).forEach(key => {
          setValue(key as keyof PatientFormValues, defaultValues[key as keyof PatientFormValues]);
        });
        
        // Load both user metadata and profile data in parallel for speed
        const [userData, patientProfile] = await Promise.all([
          authService.getCurrentUser(),
          patientService.getPatientProfile(user.id)
        ]);
        
        if (userData) {
          // Set values from user data
          setValue('first_name', userData.name.split(' ')[0] || '');
          setValue('last_name', userData.name.split(' ')[1] || '');
          setValue('phone_number', userData.phoneNumber || '');
          setValue('gender', userData.gender || 'prefer-not-to-say');
          setValue('date_of_birth', userData.dateOfBirth || '');
          setValue('country', userData.country || '');
          setValue('address', userData.address || '');
          setValue('city', userData.city || '');
          setValue('state', userData.state || '');
          setValue('pincode', userData.pincode || '');
          setValue('avatar_url', userData.avatarUrl || '');
          setValue('about_me', userData.bio || '');
        }
        
        // Update with profile data if it exists
        if (patientProfile && patientProfile.data) {
          const profileData = patientProfile.data;
          setValue('first_name', profileData.firstName || watch('first_name'));
          setValue('last_name', profileData.lastName || watch('last_name'));
          setValue('phone_number', profileData.phoneNumber || watch('phone_number'));
          setValue('gender', profileData.gender || watch('gender'));
          setValue('date_of_birth', profileData.dateOfBirth || watch('date_of_birth'));
          setValue('country', profileData.country || watch('country'));
          setValue('address', profileData.address || watch('address'));
          setValue('city', profileData.city || watch('city'));
          setValue('state', profileData.state || watch('state'));
          setValue('pincode', profileData.pincode || watch('pincode'));
          setValue('avatar_url', profileData.avatarUrl || watch('avatar_url'));
          setValue('about_me', profileData.bio || watch('about_me'));
        }
        
        // Mark as initialized to prevent repeat loading
        setHasInitialized(true);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        // Remove loading state immediately
        setLoading(false);
      }
    };

    // If we have user data, load profile immediately
    if (user?.id) {
      loadPatientProfile();
    } else {
      // If no user yet, wait a bit and check again
      const timer = setTimeout(() => {
        if (user?.id && !hasInitialized) {
          loadPatientProfile();
        } else {
          // Give up and show the form without data after a short timeout
          setLoading(false);
        }
      }, 200); // Reduced timeout
      
      return () => clearTimeout(timer);
    }
  }, [user, setValue, watch, hasInitialized, defaultValues]);

  useEffect(() => {
    // Update device information when component mounts, but only after main data loads
    const updateDeviceInfo = async () => {
      // Skip if already updated to prevent rerenders
      if (hasUpdatedDeviceInfo) return;
      
      // Get current device info synchronously for UI
      const deviceInfo = getDeviceInfo();
      // Set device info immediately for UI
      setCurrentDeviceInfo(`${deviceInfo.os} • ${deviceInfo.deviceType} • ${deviceInfo.browser}`);
      setHasUpdatedDeviceInfo(true);
      
      // Do the API call asynchronously in the background later
      if (user?.id) {
        setTimeout(() => {
          authService.updateUserMetadata({
            current_session: {
              device_type: deviceInfo.deviceType,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              last_login: new Date().toISOString(),
              user_agent: deviceInfo.fullUserAgent
            }
          }).catch(err => {
            console.error('Non-critical error updating device metadata:', err);
          });
        }, 1000); // Delay by 1 second to prioritize UI rendering
      }
    };
    
    // Only run after main loading is done
    if (!loading && user?.id) {
      updateDeviceInfo();
    }
  }, [user, hasUpdatedDeviceInfo, loading, currentDeviceInfo]);

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      // Upload the file
      const response = await userService.updateAvatar(user?.id || '', file);
      
      if (!response.success) {
        throw new Error(response.error || "Failed to upload avatar");
      }

      // Update user profile with the new avatar URL
      const { error: updateError } = await authService.updateUser({
        data: { avatarUrl: response.url }
      });
      
      if (updateError) {
        throw new Error(updateError);
      }
      
      toast.success("Avatar updated successfully");
      
      // Refresh user data
      await refreshUserData();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    setUpdating(true);
    setSaveSuccess(false);
    setSaveError(false);
    
    try {
      // Update user metadata
      const updateUserPromise = authService.updateUser({
        data: {
          name: `${data.first_name} ${data.last_name}`,
        }
      });

      // Prepare profile data
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        gender: data.gender,
        date_of_birth: data.date_of_birth || '',
        about_me: data.about_me || '',
        country: data.country,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '', 
        pincode: data.pincode || '',
      };

      // Update user profile
      const updateProfilePromise = userService.updateUserProfile(user?.id || '', profileData);

      // Run both operations in parallel
      const [userResult, profileResult] = await Promise.all([
        updateUserPromise,
        updateProfilePromise
      ]);

      if (userResult.error) {
        console.error("Error updating user metadata:", userResult.error);
        throw userResult.error;
      }

      if (!profileResult) {
        console.error("Error updating profile in database");
        throw new Error("Failed to update profile");
      }

      console.log("Profile successfully updated");
      
      // Success notification
      setSaveSuccess(true);
      
      // Success notification will auto-hide after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveSuccess(false);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 px-4">
          <div className="flex flex-col items-center justify-center">
            <p className="text-[#20C0F3] font-medium mb-2">Please wait...</p>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {saveSuccess && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-4">
            Changes saved successfully
          </div>
        )}
        
        {saveError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
            There was an error saving your changes. Please try again.
          </div>
        )}
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-md border-none rounded-xl">
              <CardHeader className="border-b">
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                    <div className="relative cursor-pointer">
                      <Avatar className="h-24 w-24 cursor-pointer">
                        <AvatarImage 
                          src={watch('avatar_url')} 
                          alt="Profile picture"
                          onError={(e) => {
                            console.log("Avatar failed to load:", e);
                            // Hide the image if it fails to load
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-blue-600 text-white text-lg">
                          {watch('first_name')?.[0]}{watch('last_name')?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <label htmlFor="profile-upload" className="absolute inset-0 cursor-pointer">
                        <span className="sr-only">Upload profile picture</span>
                      </label>
                      <Input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAvatarUpload(e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-24 h-24"
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Profile Picture</h3>
                      <p className="text-sm text-slate-500">
                        Click on the avatar to update your profile picture
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Recommended: Square image, at least 300x300 pixels
                      </p>
                      {watch('avatar_url') && (
                        <p className="text-xs text-green-600 mt-1">
                          Avatar URL: {watch('avatar_url').substring(0, 30)}...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Personal Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="first_name"
                        {...register('first_name')}
                        className="mt-1"
                      />
                      {errors.first_name && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.first_name.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="last_name"
                        {...register('last_name')}
                        className="mt-1"
                      />
                      {errors.last_name && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.last_name.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone_number">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="phone_number"
                        {...register('phone_number')}
                        className="mt-1"
                      />
                      {errors.phone_number && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.phone_number.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        {...register('date_of_birth')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                      <Select 
                        onValueChange={(value) => setValue('gender', value as any)} 
                        defaultValue={watch('gender')}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.gender.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                      <Input
                        id="country"
                        {...register('country')}
                        className="mt-1"
                      />
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.country.message)}</p>
                      )}
                    </div>
                  </div>

                  {/* About Me Section */}
                  <div className="mt-6">
                    <Label htmlFor="about_me">About Me</Label>
                    <Textarea
                      id="about_me"
                      {...register('about_me')}
                      className="mt-1"
                      rows={4}
                      placeholder="Share a little about yourself, your interests, or why you're using this platform"
                    />
                  </div>

                  {/* Address Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          {...register('address')}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          {...register('city')}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          {...register('state')}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pincode">Postal/Zip Code</Label>
                        <Input
                          id="pincode"
                          {...register('pincode')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="bg-[#20C0F3] hover:bg-[#20C0F3]/90 text-white mt-6">
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="shadow-md border-none rounded-xl mb-6">
              <CardHeader className="border-b">
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="mt-1 bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Contact support to change your email</p>
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value="••••••••"
                        disabled
                        className="mt-1 bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs"
                          onClick={() => navigate('/forgot-password')}
                        >
                          Reset your password
                        </Button>
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t">
                    <h3 className="text-lg font-medium mb-2">Login History</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Recent logins to your account
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium">Current session</p>
                          <p className="text-sm text-slate-500">
                            {currentDeviceInfo || getFormattedDeviceInfo()}
                          </p>
                        </div>
                        <div className="text-sm text-right">
                          <p>
                            {format(new Date(), 'MMM d, yyyy')}
                          </p>
                          <p className="text-green-600">Active now</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Danger Zone - only in account tab */}
            <Card className="border-red-200 shadow-md rounded-xl">
              <CardHeader className="border-b border-red-100">
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium">Delete Account</h3>
                      <p className="text-sm text-slate-500">
                        Permanently delete your account and all of your data. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => navigate(`/patient-dashboard/delete-account`)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="shadow-md border-none rounded-xl">
              <CardHeader className="border-b">
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-slate-500">Receive email about your account activity</p>
                    </div>
                    <div>
                      <input type="checkbox" id="email-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="email-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Appointment Reminders</h4>
                      <p className="text-sm text-slate-500">Get notified about upcoming appointments</p>
                    </div>
                    <div>
                      <input type="checkbox" id="appointment-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="appointment-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Mood Tracking Reminders</h4>
                      <p className="text-sm text-slate-500">Receive reminders to track your mood</p>
                    </div>
                    <div>
                      <input type="checkbox" id="mood-tracking-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="mood-tracking-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Communications</h4>
                      <p className="text-sm text-slate-500">Receive updates about new features and promotions</p>
                    </div>
                    <div>
                      <input type="checkbox" id="marketing-notifications" className="mr-2" />
                      <Label htmlFor="marketing-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


