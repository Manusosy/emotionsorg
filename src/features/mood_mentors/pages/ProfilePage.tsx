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
import { Loader2, Upload, UserCheck, Medal, Briefcase, GraduationCap, Languages, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<MoodMentorProfile>({
    id: '',
    full_name: '',
    email: '',
    bio: '',
    specialties: [],
    avatar_url: '',
    education: [{ degree: '', institution: '', year: '' }],
    experience: [{ title: '', place: '', duration: '' }],
    languages: [],
    location: '',
    therapyTypes: [],
    specialty: '',
    consultation_fee: 0,
    profile_completion: 0,
    isFree: true,
    availability_status: 'Available'
  });

  // Languages options
  const languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Arabic'
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
    'Anxiety',
    'Depression',
    'Trauma',
    'Relationships',
    'Addiction',
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
        const response = await moodMentorService.getMoodMentorById(user.id);
        
        if (response.success && response.data) {
          setProfile({
            ...profile,
            ...response.data,
            id: user.id,
            // Ensure arrays are initialized even if not in the data
            education: response.data.education || [{ degree: '', institution: '', year: '' }],
            experience: response.data.experience || [{ title: '', place: '', duration: '' }],
            languages: response.data.languages || [],
            specialties: response.data.specialties || [],
            therapyTypes: response.data.therapyTypes || []
          });
          
          if (response.data.avatar_url) {
            setAvatarPreview(response.data.avatar_url);
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
    setProfile(prev => ({ ...prev, [name]: value }));
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

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Calculate profile completion
      const completionPercentage = calculateProfileCompletion();
      
      // Prepare profile data
      const profileData = {
        ...profile,
        profile_completion: completionPercentage
      };
      
      // If there's a new avatar, upload it first
      if (avatarFile) {
        const uploadResponse = await moodMentorService.uploadProfileImage(user?.id || '', avatarFile);
        if (uploadResponse.success && uploadResponse.data) {
          profileData.avatar_url = uploadResponse.data.url;
        } else {
          throw new Error('Failed to upload profile image');
        }
      }
      
      // Update profile
      const response = await moodMentorService.updateMoodMentorProfile(profileData);
      
      if (response.success) {
        toast.success('Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
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
          </div>
          <Button 
            onClick={handleSaveProfile} 
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
                    <div className="space-y-2">
                      <Label htmlFor="avatar" className="text-sm font-medium">
                        Profile Picture
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="w-full max-w-sm"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recommended size: 300x300 pixels. Max size: 2MB.
                      </p>
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
                      />
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
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        value={profile.location || ''}
                        onChange={handleInputChange}
                        placeholder="Your location (e.g., New York, NY)"
                      />
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
                      />
                      <p className="text-sm text-muted-foreground">
                        This will be displayed on your public profile.
                      </p>
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
                  </div>
                  
                  {/* Specialties */}
                  <div className="space-y-2">
                    <Label>Areas of Expertise</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {specialtyOptions.map((specialty) => (
                        <div 
                          key={specialty}
                          className={`
                            flex items-center p-2 rounded-md cursor-pointer transition-colors
                            ${profile.specialties?.includes(specialty) 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/40 hover:bg-muted/60'}
                            border
                          `}
                          onClick={() => handleArraySelectChange('specialties', specialty)}
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
                  </div>
                  
                  {/* Therapy Types */}
                  <div className="space-y-2">
                    <Label>Therapy Methods Used</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {therapyOptions.map((therapy) => (
                        <div 
                          key={therapy}
                          className={`
                            flex items-center p-2 rounded-md cursor-pointer transition-colors
                            ${profile.therapyTypes?.includes(therapy) 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/40 hover:bg-muted/60'}
                            border
                          `}
                          onClick={() => handleArraySelectChange('therapyTypes', therapy)}
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
                  </div>
                  
                  {/* Languages */}
                  <div className="space-y-2">
                    <Label>Languages Spoken</Label>
                    <div className="flex flex-wrap gap-2">
                      {languageOptions.map((language) => (
                        <div 
                          key={language}
                          className={`
                            flex items-center p-2 rounded-md cursor-pointer transition-colors
                            ${profile.languages?.includes(language) 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/40 hover:bg-muted/60'}
                            border
                          `}
                          onClick={() => handleArraySelectChange('languages', language)}
                        >
                          <div className={`
                            w-4 h-4 rounded-sm mr-2 flex items-center justify-center
                            ${profile.languages?.includes(language) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted border'}
                          `}>
                            {profile.languages?.includes(language) && <UserCheck className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{language}</span>
                        </div>
                      ))}
                    </div>
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="consultation_fee">Consultation Fee (USD)</Label>
                      <Input
                        id="consultation_fee"
                        name="consultation_fee"
                        value={profile.consultation_fee || ''}
                        onChange={handleInputChange}
                        type="number"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="availability_status">Availability Status</Label>
                      <Select
                        value={profile.availability_status || 'Available'}
                        onValueChange={(value) => handleSelectChange('availability_status', value)}
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
                        {profile.education && profile.education.length > 1 && (
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`education-institution-${index}`}>Institution</Label>
                          <Input
                            id={`education-institution-${index}`}
                            value={edu.institution}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                            placeholder="e.g., University of California"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`education-year-${index}`}>Year</Label>
                          <Input
                            id={`education-year-${index}`}
                            value={edu.year}
                            onChange={(e) => updateEducation(index, 'year', e.target.value)}
                            placeholder="e.g., 2015"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addEducation}
                    className="w-full"
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
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
                        {profile.experience && profile.experience.length > 1 && (
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`experience-place-${index}`}>Place</Label>
                          <Input
                            id={`experience-place-${index}`}
                            value={exp.place}
                            onChange={(e) => updateExperience(index, 'place', e.target.value)}
                            placeholder="e.g., City Medical Center"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`experience-duration-${index}`}>Duration</Label>
                          <Input
                            id={`experience-duration-${index}`}
                            value={exp.duration}
                            onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                            placeholder="e.g., 2018-2022"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addExperience}
                    className="w-full"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Add Experience
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
} 


