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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Supabase import removed
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, UserCheck, Medal, Briefcase, GraduationCap, Languages, MapPin, ChevronDown, Check, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Types for profile data
interface MoodMentorProfile {
  id: string;
  full_name: string;
  email: string;
  bio?: string;
  specialties?: string[];
  avatar_url?: string;
  education?: Array<{degree: string, institution: string, year: string}>;
  experience?: Array<{title: string, place: string, duration: string}>;
  languages?: string[];
  location?: string;
  therapyTypes?: string[];
  specialty?: string;
  consultation_fee?: number;
  profile_completion?: number;
  isFree?: boolean;
  availability_status?: string;
  gender: string;
  name_slug?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  
  const [profile, setProfile] = useState<MoodMentorProfile>({
    id: '',
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    bio: '',
    specialties: [],
    avatar_url: '',
    education: [{ degree: '', institution: '', year: '' }],
    experience: [{ title: '', place: '', duration: '' }],
    languages: [],
    location: user?.user_metadata?.country || '',
    therapyTypes: [],
    specialty: '',
    consultation_fee: 0,
    profile_completion: 0,
    isFree: true,
    availability_status: 'Available',
    gender: user?.user_metadata?.gender || '',
    name_slug: ''
  });

  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Gender options
  const genderOptions = [
    'Male',
    'Female',
    'Non-binary',
    'Prefer not to say'
  ];

  // Languages options
  const languageOptions = [
    'English', 'French', 'Arabic', 'Swahili', 'Amharic',
    'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Xhosa',
    'Afrikaans', 'Somali', 'Oromo', 'Kinyarwanda', 'Tigrinya',
    'Berber', 'Wolof', 'Shona', 'Twi', 'Lingala',
    // Nigerian languages
    'Fulfulde', 'Edo', 'Ibibio', 'Efik', 'Kanuri', 'Tiv',
    // Ghanaian languages
    'Akan', 'Ewe', 'Ga', 'Dagaare', 'Dagbani',
    // Sierra Leone languages
    'Krio', 'Mende', 'Temne', 'Limba',
    // Rwandan languages
    'Kirundi', 'Swahili-Rwanda',
    // Kenyan languages
    'Kikuyu', 'Luo', 'Luhya', 'Kalenjin', 'Kamba', 'Kisii', 'Meru'
  ];

  // Therapy types options
  const therapyOptions = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Psychodynamic Therapy',
    'Interpersonal Therapy',
    'Humanistic Therapy',
    'Mindfulness-Based Therapy',
    'Exposure Therapy',
    'Group Therapy',
    'Family Therapy',
    'Art Therapy'
  ];

  // Specialty options
  const specialtyOptions = [
    'Depression & Anxiety',
    'Trauma & PTSD',
    'Relationship Issues',
    'Addiction & Recovery',
    'Stress Management',
    'Self-Esteem',
    'Grief',
    'Life Transitions',
    'LGBTQ+ Issues'
  ];

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Try to load from localStorage first for faster display
        let localProfileData = null;
        try {
          const storedData = localStorage.getItem('mentor_profile_data');
          if (storedData) {
            localProfileData = JSON.parse(storedData);
          }
        } catch (storageError) {
          console.error('Error loading from localStorage:', storageError);
        }
        
        // Then get server data
        const response = await moodMentorService.getMoodMentorById(user.id);
        
        if (response.success && response.data) {
          // Preserve pre-filled fields
          const currentEmail = profile.email;
          const currentFullName = profile.full_name;
          const currentLocation = profile.location;
          const currentGender = profile.gender;
          
          // Merge local storage data (if available) with server data for best persistence
          const mergedData = {
            ...response.data,
            ...(localProfileData || {}),
          };
          
          setProfile({
            ...profile,
            ...mergedData,
            id: user.id,
            // Preserve pre-filled fields from user data
            email: currentEmail,
            full_name: currentFullName,
            location: currentLocation || mergedData.location,
            gender: currentGender || mergedData.gender,
            // Ensure arrays are initialized even if not in the data
            education: mergedData.education || [{ degree: '', institution: '', year: '' }],
            // Handle case where experience might be a string instead of an array
            experience: Array.isArray(mergedData.experience) 
              ? mergedData.experience 
              : (typeof mergedData.experience === 'string' && mergedData.experience)
                ? [{ title: 'Previous Experience', place: '', duration: mergedData.experience }]
                : [{ title: '', place: '', duration: '' }],
            languages: mergedData.languages || [],
            specialties: mergedData.specialties || [],
            therapyTypes: mergedData.therapyTypes || [],
            name_slug: mergedData.name_slug || ''
          });
          
          if (mergedData.avatar_url) {
            setAvatarPreview(mergedData.avatar_url);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user?.id]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Debug logs to track changes to the bio field
    if (name === 'bio') {
      console.log('BIO FIELD CHANGED:', value);
    }
    
    setProfile(prev => {
      const updatedProfile = { ...prev, [name]: value };
      
      // Generate name_slug when full_name changes
      if (name === 'full_name') {
        updatedProfile.name_slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      
      return updatedProfile;
    });
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle array select change (multi-select)
  const handleArraySelectChange = (name: string, value: string) => {
    setProfile(prev => {
      const currentArray = prev[name as keyof MoodMentorProfile] as string[] || [];
      if (currentArray.includes(value)) {
        return { 
          ...prev, 
          [name]: currentArray.filter(item => item !== value) 
        };
      } else {
        return { 
          ...prev, 
          [name]: [...currentArray, value] 
        };
      }
    });
  };

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add education field
  const addEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [...(prev.education || []), { degree: '', institution: '', year: '' }]
    }));
  };

  // Update education field
  const updateEducation = (index: number, field: string, value: string) => {
    setProfile(prev => {
      const updatedEducation = [...(prev.education || [])];
      updatedEducation[index] = { 
        ...updatedEducation[index], 
        [field]: value 
      };
      return { ...prev, education: updatedEducation };
    });
  };

  // Remove education field
  const removeEducation = (index: number) => {
    setProfile(prev => {
      const updatedEducation = [...(prev.education || [])];
      updatedEducation.splice(index, 1);
      return { ...prev, education: updatedEducation };
    });
  };

  // Add experience field
  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [...(prev.experience || []), { title: '', place: '', duration: '' }]
    }));
  };

  // Update experience field
  const updateExperience = (index: number, field: string, value: string) => {
    setProfile(prev => {
      const updatedExperience = [...(prev.experience || [])];
      updatedExperience[index] = { 
        ...updatedExperience[index], 
        [field]: value 
      };
      return { ...prev, experience: updatedExperience };
    });
  };

  // Remove experience field
  const removeExperience = (index: number) => {
    setProfile(prev => {
      const updatedExperience = [...(prev.experience || [])];
      updatedExperience.splice(index, 1);
      return { ...prev, experience: updatedExperience };
    });
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const requiredFields = [
      'full_name',
      'email',
      'bio',
      'specialties',
      'avatar_url',
      'education',
      'experience',
      'languages',
      'location',
      'therapyTypes',
      'specialty'
    ];
    
    let completedFields = 0;
    
    requiredFields.forEach(field => {
      const value = profile[field as keyof MoodMentorProfile];
      if (value) {
        if (Array.isArray(value)) {
          if (value.length > 0) completedFields++;
        } else if (typeof value === 'string') {
          if (value.trim() !== '') completedFields++;
        } else {
          completedFields++;
        }
      }
    });
    
    return Math.round((completedFields / requiredFields.length) * 100);
  };

  // Validate all required fields are filled
  const isFormValid = () => {
    if (
      !profile.full_name?.trim() ||
      !profile.email?.trim() ||
      !profile.bio?.trim() ||
      !profile.location?.trim() ||
      !profile.specialty?.trim() ||
      !profile.gender ||
      profile.specialties?.length === 0 ||
      profile.therapyTypes?.length === 0 ||
      profile.languages?.length === 0 ||
      !profile.education || profile.education.length === 0 ||
      !profile.experience || profile.experience.length === 0
    ) {
      return false;
    }

    // Validate education fields
    const isEducationValid = profile.education?.every(
      edu => edu.degree?.trim() && edu.institution?.trim() && edu.year?.trim()
    );
    if (!isEducationValid) return false;

    // Validate experience fields
    const isExperienceValid = profile.experience?.every(
      exp => exp.title?.trim() && exp.place?.trim() && exp.duration?.trim()
    );
    if (!isExperienceValid) return false;

    return true;
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Debug log for bio field
    console.log('BIO FIELD BEFORE SAVE:', {
      inProfileState: profile.bio,
      length: profile.bio?.length || 0,
      trimmed: profile.bio?.trim() || '',
      isEmpty: !profile.bio?.trim()
    });
    
    try {
      setIsSaving(true);
      
      // Upload avatar if changed
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const { success, url, error } = await moodMentorService.uploadProfileImage(user?.id || '', avatarFile);
        if (success && url) {
          avatarUrl = url;
        } else {
          console.error('Error uploading avatar:', error);
        }
      }
      
      // Generate name_slug from full_name if not present
      const nameSlug = profile.name_slug || profile.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Prepare data for update
      // Ensure all fields needed for the mentor card display are included
      const profileData = {
        id: profile.id,
        userId: user?.id,
        name: profile.full_name,
        full_name: profile.full_name,
        title: profile.specialty || 'Mood Mentor',
        specialties: profile.specialties || [],
        bio: profile.bio || '',
        experience: typeof profile.experience === 'object' 
          ? profile.experience.reduce((total, exp) => total + parseInt(exp.duration) || 0, 0)
          : 1,
        // Include the full experience array for the profile page
        experience_details: profile.experience || [],
        // Include the education array
        education: profile.education || [],
        avatar_url: avatarUrl,
        avatarUrl: avatarUrl, // Include both naming formats for consistency
        location: profile.location,
        gender: profile.gender,
        languages: profile.languages,
        hourlyRate: profile.consultation_fee || 0,
        rating: 5.0, // Default for new mentors
        reviewCount: 0, // Default for new mentors
        availability: [], // Will be updated in availability settings
        // Always set as completed since all required fields are validated by isFormValid()
        profileCompleted: true,
        name_slug: nameSlug,
        nameSlug: nameSlug, // Include both naming formats for consistency
        therapyTypes: profile.therapyTypes || [],
        specialty: profile.specialty || 'Mental Health'
      };
      
      // Debug log profile data bio field
      console.log('BIO FIELD IN PROFILE DATA:', {
        bioValue: profileData.bio,
        bioLength: profileData.bio?.length || 0,
        bioEmpty: !profileData.bio?.trim()
      });
      
      console.log('Saving profile data:', profileData);
      
      // Call API to update profile
      const { success, data, error } = await moodMentorService.updateMoodMentorProfile(profileData);
      
      if (success) {
        // Save to localStorage for faster loading next time
        try {
          // Save with consistent key
          localStorage.setItem('mentor_profile_data', JSON.stringify(profileData));
          localStorage.setItem('test_mentor_profile', JSON.stringify(profileData));
          console.log('Profile data saved to both localStorage keys', profileData);
          
          // Also sync the test mentor profile to ensure consistency
          await moodMentorService.syncTestMentorProfile();
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
        
        toast.success('Profile updated successfully');
        setIsEditMode(false);
        
        // Update profile state with new data
        setProfile(prev => ({
          ...prev,
          avatar_url: avatarUrl,
          name_slug: nameSlug,
          profile_completion: 100 // Always set to 100% when saved
        }));
        
        // Offer to view the public profile page
        const shouldViewProfile = window.confirm('Profile saved successfully! Would you like to view your public profile?');
        if (shouldViewProfile) {
          // Navigate to the public profile page
          navigate(`/mood-mentor/${nameSlug}`);
        } else {
          // Force reload the profile data to ensure everything is in sync
          const response = await moodMentorService.getMoodMentorById(user?.id || '');
          if (response.success && response.data) {
            console.log('Updated profile data retrieved:', response.data);
          }
        }
      } else {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error in profile update:', err);
      toast.error('An error occurred while updating your profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile information and credentials
            </p>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
              <Info className="inline-block h-4 w-4 mr-2" />
              All fields are required to complete your profile. Your profile must be complete before you can be visible to patients.
            </div>
          </div>
          {isEditMode ? (
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditMode(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving || isLoading || !isFormValid()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={toggleEditMode} 
              disabled={isLoading}
            >
              Edit Profile
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading profile data...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full bg-muted border-b rounded-none justify-start h-auto p-0">
              <TabsTrigger
                value="personal"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Personal Info
              </TabsTrigger>
              <TabsTrigger
                value="professional"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Professional Details
              </TabsTrigger>
              <TabsTrigger
                value="qualifications"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Qualifications
              </TabsTrigger>
            </TabsList>
            
            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={avatarPreview || ''} alt="Profile picture" />
                        <AvatarFallback className="text-lg">
                          {profile.full_name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="avatar" className="text-sm font-medium">
                        Profile Picture
                      </Label>
                      <div 
                        className={`border-2 border-dashed ${!isEditMode ? 'border-gray-200 cursor-default' : 'border-gray-300 cursor-pointer hover:border-primary transition-colors'} rounded-lg p-6 flex flex-col items-center justify-center`}
                        onClick={() => isEditMode && document.getElementById('avatar')?.click()}
                      >
                        <Upload className={`h-10 w-10 ${!isEditMode ? 'text-gray-300' : 'text-gray-400'} mb-2`} />
                        <p className="text-sm font-medium">{isEditMode ? "Click to upload" : "Profile picture"}</p>
                        {isEditMode && (
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG or GIF. Maximum size 2MB.
                          </p>
                        )}
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          disabled={!isEditMode}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={profile.full_name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        readOnly={!isEditMode}
                        className={!isEditMode ? "bg-gray-100" : ""}
                      />
                      {!profile.full_name?.trim() && (
                        <p className="text-xs text-red-500 mt-1">*Required</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        value={profile.email}
                        onChange={handleInputChange}
                        placeholder="Your email address"
                        type="email"
                        readOnly
                        className="bg-gray-100"
                      />
                      {!profile.email?.trim() && (
                        <p className="text-xs text-red-500 mt-1">*Required</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Country</Label>
                      <Input
                        id="location"
                        name="location"
                        value={profile.location || ''}
                        onChange={handleInputChange}
                        placeholder="Your country"
                        readOnly={!isEditMode}
                        className={!isEditMode ? "bg-gray-100" : ""}
                      />
                      {!profile.location?.trim() && (
                        <p className="text-xs text-red-500 mt-1">*Required</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={profile.gender || ''}
                        onValueChange={(value) => handleSelectChange('gender', value)}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genderOptions.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!profile.gender && (
                        <p className="text-xs text-red-500 mt-1">*Required</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profile.bio || ''}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself"
                        rows={5}
                        readOnly={!isEditMode}
                        className={!isEditMode ? "bg-gray-100" : ""}
                      />
                      <p className="text-sm text-muted-foreground">
                        This will be displayed on your public profile.
                      </p>
                      {!profile.bio?.trim() && (
                        <p className="text-xs text-red-500 mt-1">*Required</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Professional Details Tab */}
            <TabsContent value="professional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Details</CardTitle>
                  <CardDescription>
                    Set your professional specialties and areas of expertise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Specialty */}
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Primary Specialty</Label>
                    <Select
                      value={profile.specialty || ''}
                      onValueChange={(value) => handleSelectChange('specialty', value)}
                      disabled={!isEditMode}
                    >
                      <SelectTrigger id="specialty">
                        <SelectValue placeholder="Select a specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialtyOptions.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!profile.specialty && (
                      <p className="text-xs text-red-500 mt-1">*Required</p>
                    )}
                  </div>
                  
                  {/* Specialties */}
                  <div className="space-y-2">
                    <Label>Areas of Expertise</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {specialtyOptions.map((specialty) => (
                        <div 
                          key={specialty}
                          className={`
                            flex items-center p-2 rounded-md ${isEditMode ? "cursor-pointer" : "cursor-default"} transition-colors
                            ${profile.specialties?.includes(specialty) 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/40 hover:bg-muted/60'}
                            border
                          `}
                          onClick={() => isEditMode && handleArraySelectChange('specialties', specialty)}
                        >
                          <div className={`
                            w-4 h-4 rounded-sm mr-2 flex items-center justify-center
                            ${profile.specialties?.includes(specialty) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted border'}
                          `}>
                            {profile.specialties?.includes(specialty) && <UserCheck className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{specialty}</span>
                        </div>
                      ))}
                    </div>
                    {(!profile.specialties || profile.specialties.length === 0) && (
                      <p className="text-xs text-red-500 mt-1">*Please select at least one area of expertise</p>
                    )}
                  </div>
                  
                  {/* Therapy Types */}
                  <div className="space-y-2">
                    <Label>Therapy Methods Used</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {therapyOptions.map((therapy) => (
                        <div 
                          key={therapy}
                          className={`
                            flex items-center p-2 rounded-md ${isEditMode ? "cursor-pointer" : "cursor-default"} transition-colors
                            ${profile.therapyTypes?.includes(therapy) 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/40 hover:bg-muted/60'}
                            border
                          `}
                          onClick={() => isEditMode && handleArraySelectChange('therapyTypes', therapy)}
                        >
                          <div className={`
                            w-4 h-4 rounded-sm mr-2 flex items-center justify-center
                            ${profile.therapyTypes?.includes(therapy) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted border'}
                          `}>
                            {profile.therapyTypes?.includes(therapy) && <UserCheck className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{therapy}</span>
                        </div>
                      ))}
                    </div>
                    {(!profile.therapyTypes || profile.therapyTypes.length === 0) && (
                      <p className="text-xs text-red-500 mt-1">*Please select at least one therapy method</p>
                    )}
                  </div>
                  
                  {/* Languages */}
                  <div className="space-y-2">
                    <Label>Languages Spoken</Label>
                    <div className="relative">
                      <div 
                        className={`p-2 border rounded-md flex justify-between ${isEditMode ? "cursor-pointer" : "cursor-default"} items-center ${!isEditMode ? "bg-gray-100" : ""}`}
                        onClick={() => isEditMode && setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                      >
                        <div className="flex flex-wrap gap-1">
                          {profile.languages && profile.languages.length > 0 ? (
                            profile.languages.map((lang, i) => (
                              <Badge key={lang} className="bg-primary/10 text-primary border-primary/30">
                                {lang}{i < profile.languages!.length - 1 ? ',' : ''}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500">Select languages...</span>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isLanguageDropdownOpen ? 'transform rotate-180' : ''}`} />
                      </div>
                      
                      {isLanguageDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2 grid grid-cols-1 gap-1">
                            {languageOptions.map((language) => (
                              <div 
                                key={language}
                                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArraySelectChange('languages', language);
                                }}
                              >
                                <div className={`
                                  w-4 h-4 rounded-sm mr-2 flex items-center justify-center
                                  ${profile.languages?.includes(language) 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted border'}
                                `}>
                                  {profile.languages?.includes(language) && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-sm">{language}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Please select all languages you speak fluently</p>
                    {(!profile.languages || profile.languages.length === 0) && (
                      <p className="text-xs text-red-500">*Please select at least one language</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Session Settings</CardTitle>
                  <CardDescription>
                    Configure your session and consultation settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Consultation Fee - Disabled for now */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="consultation_fee" className="mb-2 block">Consultation Fee</Label>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Currently Free</Badge>
                    </div>
                    <div className="relative">
                      <Input
                        id="consultation_fee"
                        name="consultation_fee"
                        type="number"
                        value={0}
                        disabled={true}
                        className="pl-8 bg-gray-50 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Info className="h-3 w-3 mr-1" />
                      Sessions are currently free. This may change in the future.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability_status">Availability Status</Label>
                    <Select
                      value={profile.availability_status || 'Available'}
                      onValueChange={(value) => handleSelectChange('availability_status', value)}
                      disabled={!isEditMode}
                    >
                      <SelectTrigger id="availability_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Limited Availability">Limited Availability</SelectItem>
                        <SelectItem value="Unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Qualifications Tab */}
            <TabsContent value="qualifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                  <CardDescription>
                    Add your educational background and qualifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile.education?.map((edu, index) => (
                    <div key={index} className="border rounded-md p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Education #{index + 1}</h4>
                        {profile.education && profile.education.length > 1 && isEditMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`education-degree-${index}`}>Degree</Label>
                          <Input
                            id={`education-degree-${index}`}
                            value={edu.degree}
                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                            placeholder="e.g., Master of Psychology"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!edu.degree?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`education-institution-${index}`}>Institution</Label>
                          <Input
                            id={`education-institution-${index}`}
                            value={edu.institution}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                            placeholder="e.g., University of California"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!edu.institution?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`education-year-${index}`}>Year</Label>
                          <Input
                            id={`education-year-${index}`}
                            value={edu.year}
                            onChange={(e) => updateEducation(index, 'year', e.target.value)}
                            placeholder="e.g., 2015"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!edu.year?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addEducation}
                    className="w-full"
                    disabled={!isEditMode}
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                  {(!profile.education || profile.education.length === 0) && (
                    <p className="text-xs text-red-500 mt-2">*At least one education entry is required</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Experience</CardTitle>
                  <CardDescription>
                    Add your professional experience and work history
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile.experience?.map((exp, index) => (
                    <div key={index} className="border rounded-md p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Experience #{index + 1}</h4>
                        {profile.experience && profile.experience.length > 1 && isEditMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExperience(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`experience-title-${index}`}>Title</Label>
                          <Input
                            id={`experience-title-${index}`}
                            value={exp.title}
                            onChange={(e) => updateExperience(index, 'title', e.target.value)}
                            placeholder="e.g., Clinical Psychologist"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!exp.title?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`experience-place-${index}`}>Place</Label>
                          <Input
                            id={`experience-place-${index}`}
                            value={exp.place}
                            onChange={(e) => updateExperience(index, 'place', e.target.value)}
                            placeholder="e.g., City Medical Center"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!exp.place?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`experience-duration-${index}`}>Duration</Label>
                          <Input
                            id={`experience-duration-${index}`}
                            value={exp.duration}
                            onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                            placeholder="e.g., 2018-2022"
                            readOnly={!isEditMode}
                            className={!isEditMode ? "bg-gray-100" : ""}
                          />
                          {!exp.duration?.trim() && (
                            <p className="text-xs text-red-500">*Required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addExperience}
                    className="w-full"
                    disabled={!isEditMode}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Add Experience
                  </Button>
                  {(!profile.experience || profile.experience.length === 0) && (
                    <p className="text-xs text-red-500 mt-2">*At least one experience entry is required</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Debug section - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Debug Tools</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={async () => {
                await moodMentorService.completeResetAndCreateTestProfile();
                toast.success("Reset completed and test profile created");
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-md"
            >
              Reset All & Create Test Profile
            </button>
            
            <button
              type="button"
              onClick={async () => {
                await moodMentorService.registerTestMentorProfile();
                toast.success("Test mentor profile registered");
              }}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md"
            >
              Register Test Profile
            </button>
            
            <button
              type="button"
              onClick={async () => {
                await moodMentorService.syncTestMentorProfile();
                toast.success("Test mentor profile synced");
              }}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded-md"
            >
              Sync Profile Data
            </button>
            
            <button
              type="button"
              onClick={() => {
                console.log("Current localStorage data:");
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.includes('mentor') || key.includes('mood'))) {
                    console.log(`- ${key}:`, localStorage.getItem(key));
                  }
                }
                toast.success("Check console for localStorage data");
              }}
              className="px-3 py-1 bg-purple-500 text-white text-sm rounded-md"
            >
              Log Storage Data
            </button>
          </div>
          
          <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-md text-sm mb-3">
            <h4 className="font-medium mb-1">Current Bio Field Data:</h4>
            <p className="text-xs mb-1"><strong>Bio content:</strong> {profile.bio ? profile.bio.substring(0, 50) + '...' : 'None'}</p>
            <p className="text-xs mb-1"><strong>Bio length:</strong> {profile.bio?.length || 0} characters</p>
            <p className="text-xs"><strong>About field:</strong> {profile.about || 'Not set'}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                // Open test mentor profile in new tab
                const nameSlug = profile.name_slug || profile.nameSlug || 
                  profile.full_name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'test-mentor';
                window.open(`/mood-mentor/${nameSlug}`, '_blank');
              }}
              className="px-3 py-1 bg-teal-500 text-white text-sm rounded-md"
            >
              Open Public Profile
            </button>
            
            <button
              type="button"
              onClick={() => {
                // Sync and directly redirect to profile
                const nameSlug = profile.name_slug || profile.nameSlug || 
                  profile.full_name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'test-mentor';
                
                // First sync the profile data to ensure consistency
                moodMentorService.syncTestMentorProfile().then(() => {
                  window.location.href = `/mood-mentor/${nameSlug}`;
                });
              }}
              className="px-3 py-1 bg-indigo-500 text-white text-sm rounded-md"
            >
              Sync & View Profile
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 


