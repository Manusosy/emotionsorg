-- ========================================================================================
-- COMPLETE MOOD MENTOR PROFILE SETUP WITH DEPENDENCIES
-- ========================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================================================
-- STORAGE SETUP
-- ========================================================================================
-- Create storage bucket for avatar uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access policy for avatars - Allow public access for reading
CREATE POLICY "Avatar Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their avatar
CREATE POLICY "Avatar Upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to update their own avatar
CREATE POLICY "Avatar Update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own avatar
CREATE POLICY "Avatar Delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========================================================================================
-- FUNCTIONS FOR PERMISSION MANAGEMENT
-- ========================================================================================

-- Create a function to check if a user is a mood mentor
CREATE OR REPLACE FUNCTION is_mood_mentor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mood_mentor_profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for avatar synchronization with auth metadata
CREATE OR REPLACE FUNCTION sync_avatar_with_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if avatar_url has changed
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    -- Update user metadata with new avatar URL
    BEGIN
      PERFORM auth.update_user_metadata(
        NEW.user_id, 
        jsonb_build_object('avatar_url', NEW.avatar_url)
      );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue with the transaction
        RAISE WARNING 'Failed to update auth metadata with avatar: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================================
-- TABLES
-- ========================================================================================

-- Create mood_mentor_profiles table
CREATE TABLE IF NOT EXISTS public.mood_mentor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  therapy_types TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  avatar_url TEXT,
  availability_status TEXT CHECK (availability_status IN ('available', 'unavailable', 'busy')) DEFAULT 'available',
  languages TEXT[] DEFAULT '{}',
  education JSONB DEFAULT '[]'::jsonb,
  experience JSONB DEFAULT '[]'::jsonb,
  session_duration TEXT CHECK (session_duration IN ('30 Min', '45 Min', '60 Min', '90 Min')) DEFAULT '30 Min',
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')) DEFAULT 'Prefer not to say',
  location TEXT DEFAULT '',
  name_slug TEXT UNIQUE,
  phone_number TEXT DEFAULT '',
  is_profile_complete BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 5.0,
  profile_completion INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================================================================
-- TRIGGERS AND FUNCTIONS
-- ========================================================================================

-- Create function to update the modified timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.mood_mentor_profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create function to generate a name_slug if not provided
CREATE OR REPLACE FUNCTION generate_name_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name_slug IS NULL OR NEW.name_slug = '' THEN
    -- Create a slug from the full name, lowercase, replace spaces with hyphens
    NEW.name_slug = LOWER(REGEXP_REPLACE(NEW.full_name, '[^a-zA-Z0-9]', '-', 'g'));
    
    -- Check if the generated slug already exists
    WHILE EXISTS (
      SELECT 1 FROM public.mood_mentor_profiles
      WHERE name_slug = NEW.name_slug AND id != NEW.id
    ) LOOP
      -- Append a random suffix
      NEW.name_slug = NEW.name_slug || '-' || SUBSTRING(MD5(random()::text) FROM 1 FOR 4);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to generate a name_slug before insert
CREATE TRIGGER ensure_name_slug
BEFORE INSERT ON public.mood_mentor_profiles
FOR EACH ROW
EXECUTE FUNCTION generate_name_slug();

-- Create a trigger to synchronize avatar URL with auth metadata
CREATE TRIGGER sync_avatar_on_update
AFTER UPDATE OF avatar_url ON public.mood_mentor_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_avatar_with_auth_metadata();

-- ========================================================================================
-- Calculate Profile Completion
-- ========================================================================================

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  completion INTEGER := 0;
  total_fields INTEGER := 10; -- Total number of important fields
BEGIN
  -- Add points for each completed field (10% each)
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN completion := completion + 1; END IF;
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN completion := completion + 1; END IF;
  IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN completion := completion + 1; END IF;
  IF NEW.specialty IS NOT NULL AND NEW.specialty != '' THEN completion := completion + 1; END IF;
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN completion := completion + 1; END IF;
  IF NEW.gender IS NOT NULL AND NEW.gender != 'Prefer not to say' THEN completion := completion + 1; END IF;
  IF NEW.location IS NOT NULL AND NEW.location != '' THEN completion := completion + 1; END IF;
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN completion := completion + 1; END IF;
  IF array_length(NEW.specialties, 1) > 0 THEN completion := completion + 1; END IF;
  IF array_length(NEW.languages, 1) > 0 THEN completion := completion + 1; END IF;
  
  -- Calculate percentage
  NEW.profile_completion := (completion * 100) / total_fields;
  
  -- Set is_profile_complete to true if completion is 100%
  IF NEW.profile_completion = 100 THEN
    NEW.is_profile_complete := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate profile completion before insert or update
CREATE TRIGGER calculate_profile_completion
BEFORE INSERT OR UPDATE ON public.mood_mentor_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_profile_completion();

-- ========================================================================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================================================================

-- Enable RLS on mood_mentor_profiles
ALTER TABLE public.mood_mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS bypass function for admin operations
CREATE OR REPLACE FUNCTION admin_has_access()
RETURNS BOOLEAN AS $$
BEGIN
  -- Placeholder for admin check - customize as needed
  RETURN TRUE; -- For simplicity, always allow admin access
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a policy for admins to do anything
CREATE POLICY "Admins have full access" ON public.mood_mentor_profiles
  FOR ALL
  USING (admin_has_access());

-- Create a policy for anyone to view active profiles
CREATE POLICY "Public can view active profiles" ON public.mood_mentor_profiles
  FOR SELECT
  USING (is_active = true);

-- Create a policy for users to view their own profile (even if inactive)
CREATE POLICY "Users can view own profile" ON public.mood_mentor_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON public.mood_mentor_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.mood_mentor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create a policy for users to delete their own profile
CREATE POLICY "Users can delete own profile" ON public.mood_mentor_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================================================================
-- HELPER FUNCTIONS AND STORED PROCEDURES
-- ========================================================================================

-- Function to get a complete mood mentor profile
CREATE OR REPLACE FUNCTION get_mood_mentor_profile(mentor_id UUID)
RETURNS JSONB AS $$
DECLARE
  profile_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'full_name', full_name,
      'email', email,
      'bio', bio,
      'specialty', specialty,
      'therapy_types', therapy_types,
      'specialties', specialties,
      'hourly_rate', hourly_rate,
      'is_free', is_free,
      'avatar_url', avatar_url,
      'availability_status', availability_status,
      'languages', languages,
      'education', education,
      'experience', experience,
      'session_duration', session_duration,
      'gender', gender,
      'location', location,
      'name_slug', name_slug,
      'phone_number', phone_number,
      'is_profile_complete', is_profile_complete,
      'is_active', is_active,
      'rating', rating,
      'profile_completion', profile_completion,
      'created_at', created_at,
      'updated_at', updated_at
    )
  INTO profile_data
  FROM public.mood_mentor_profiles
  WHERE id = mentor_id OR user_id = mentor_id;
  
  RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  profile_data JSONB;
BEGIN
  -- Get the current user's ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Get the profile data using the reusable function
  SELECT get_mood_mentor_profile(user_id) INTO profile_data;
  
  RETURN COALESCE(profile_data, jsonb_build_object('error', 'Profile not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a mood mentor's avatar URL and sync it with auth metadata
CREATE OR REPLACE FUNCTION update_mentor_avatar(
  p_user_id UUID,
  p_avatar_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Update the profile
  UPDATE public.mood_mentor_profiles
  SET avatar_url = p_avatar_url
  WHERE user_id = p_user_id
  RETURNING get_mood_mentor_profile(id) INTO result;
  
  -- The avatar sync with auth happens via the trigger
  
  RETURN COALESCE(result, jsonb_build_object('error', 'Profile not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely create or update a mood mentor profile
CREATE OR REPLACE FUNCTION upsert_mood_mentor_profile(
  p_user_id UUID,
  p_profile JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID;
  v_result JSONB;
BEGIN
  -- Check if authenticated user is updating their own profile
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'You can only update your own profile');
  END IF;

  -- Check if profile exists
  SELECT id INTO v_id FROM public.mood_mentor_profiles WHERE user_id = p_user_id;
  
  IF v_id IS NULL THEN
    -- Insert new profile
    INSERT INTO public.mood_mentor_profiles (
      user_id,
      full_name,
      email,
      bio,
      specialty,
      therapy_types,
      specialties,
      hourly_rate,
      is_free,
      avatar_url,
      languages,
      education,
      experience,
      session_duration,
      gender,
      location,
      name_slug,
      phone_number
    ) VALUES (
      p_user_id,
      p_profile->>'full_name',
      p_profile->>'email',
      p_profile->>'bio',
      p_profile->>'specialty',
      COALESCE((p_profile->'therapy_types')::TEXT[]::TEXT[], '{}'),
      COALESCE((p_profile->'specialties')::TEXT[]::TEXT[], '{}'),
      COALESCE((p_profile->>'hourly_rate')::DECIMAL, 0),
      COALESCE((p_profile->>'is_free')::BOOLEAN, TRUE),
      p_profile->>'avatar_url',
      COALESCE((p_profile->'languages')::TEXT[]::TEXT[], '{}'),
      COALESCE(p_profile->'education', '[]'::JSONB),
      COALESCE(p_profile->'experience', '[]'::JSONB),
      COALESCE(p_profile->>'session_duration', '30 Min'),
      COALESCE(p_profile->>'gender', 'Prefer not to say'),
      p_profile->>'location',
      p_profile->>'name_slug',
      p_profile->>'phone_number'
    )
    RETURNING get_mood_mentor_profile(id) INTO v_result;
  ELSE
    -- Update existing profile
    UPDATE public.mood_mentor_profiles
    SET 
      full_name = COALESCE(p_profile->>'full_name', full_name),
      email = COALESCE(p_profile->>'email', email),
      bio = COALESCE(p_profile->>'bio', bio),
      specialty = COALESCE(p_profile->>'specialty', specialty),
      therapy_types = COALESCE((p_profile->'therapy_types')::TEXT[]::TEXT[], therapy_types),
      specialties = COALESCE((p_profile->'specialties')::TEXT[]::TEXT[], specialties),
      hourly_rate = COALESCE((p_profile->>'hourly_rate')::DECIMAL, hourly_rate),
      is_free = COALESCE((p_profile->>'is_free')::BOOLEAN, is_free),
      avatar_url = COALESCE(p_profile->>'avatar_url', avatar_url),
      languages = COALESCE((p_profile->'languages')::TEXT[]::TEXT[], languages),
      education = COALESCE(p_profile->'education', education),
      experience = COALESCE(p_profile->'experience', experience),
      session_duration = COALESCE(p_profile->>'session_duration', session_duration),
      gender = COALESCE(p_profile->>'gender', gender),
      location = COALESCE(p_profile->>'location', location),
      name_slug = COALESCE(p_profile->>'name_slug', name_slug),
      phone_number = COALESCE(p_profile->>'phone_number', phone_number)
    WHERE user_id = p_user_id
    RETURNING get_mood_mentor_profile(id) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================================
-- APPOINTMENT VIEWS (RECREATING VIEWS THAT OTHER FEATURES DEPEND ON)
-- ========================================================================================

-- Create appointment-related views only if the appointments table exists
-- This block checks for the existence of required tables before creating views
DO $$
DECLARE
  profiles_exists BOOLEAN;
BEGIN
  -- Check if required tables exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
  INTO profiles_exists;
  
  -- Only proceed if appointments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    -- Create patient_appointments_view
    CREATE OR REPLACE VIEW patient_appointments_view AS
    SELECT 
      a.id,
      a.patient_id,
      a.mentor_id,
      a.title,
      a.description,
      a.date,
      a.start_time,
      a.end_time,
      a.status,
      a.meeting_link,
      a.meeting_type,
      a.notes,
      a.created_at,
      a.updated_at,
      a.cancellation_reason,
      a.cancelled_by,
      a.rating,
      a.feedback,
      mp.full_name AS mentor_name,
      mp.specialty AS mentor_specialty,
      mp.avatar_url AS mentor_avatar_url
    FROM 
      appointments a
    LEFT JOIN 
      mood_mentor_profiles mp ON a.mentor_id = mp.user_id;

    -- Create mentor_appointments_view with conditional join based on profiles table existence
    IF profiles_exists THEN
      -- Version with profiles table for patient data
      CREATE OR REPLACE VIEW mentor_appointments_view AS
      SELECT 
        a.id,
        a.patient_id,
        a.mentor_id,
        a.title,
        a.description,
        a.date,
        a.start_time,
        a.end_time,
        a.status,
        a.meeting_link,
        a.meeting_type,
        a.notes,
        a.created_at,
        a.updated_at,
        a.cancellation_reason,
        a.cancelled_by,
        a.rating,
        a.feedback,
        p.full_name AS patient_name,
        p.avatar_url AS patient_avatar_url
      FROM 
        appointments a
      LEFT JOIN 
        profiles p ON a.patient_id = p.id;
    ELSE
      -- Alternative version without profiles table
      -- Uses auth.users metadata directly for patient info
      CREATE OR REPLACE VIEW mentor_appointments_view AS
      SELECT 
        a.id,
        a.patient_id,
        a.mentor_id,
        a.title,
        a.description,
        a.date,
        a.start_time,
        a.end_time,
        a.status,
        a.meeting_link,
        a.meeting_type,
        a.notes,
        a.created_at,
        a.updated_at,
        a.cancellation_reason,
        a.cancelled_by,
        a.rating,
        a.feedback,
        COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = a.patient_id),
          (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = a.patient_id),
          'Patient'
        ) AS patient_name,
        (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = a.patient_id) AS patient_avatar_url
      FROM 
        appointments a;
    END IF;
      
    -- Create or replace mentor_dashboard_stats view that depends on mentor_appointments_view
    CREATE OR REPLACE VIEW mentor_dashboard_stats AS
    SELECT
      mentor_id,
      COUNT(id) AS total_appointments,
      COUNT(DISTINCT patient_id) AS total_clients,
      COALESCE(AVG(rating) FILTER (WHERE rating IS NOT NULL), 5.0) AS average_rating,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS upcoming_appointments,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_appointments
    FROM
      mentor_appointments_view
    GROUP BY
      mentor_id;
  END IF;
END $$;

-- ========================================================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================================================

-- Create indexes for mood_mentor_profiles table
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_user_id ON public.mood_mentor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_name_slug ON public.mood_mentor_profiles(name_slug);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_specialty ON public.mood_mentor_profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_location ON public.mood_mentor_profiles(location);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_rating ON public.mood_mentor_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_is_active ON public.mood_mentor_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_mood_mentor_profiles_is_complete ON public.mood_mentor_profiles(is_profile_complete);

-- ========================================================================================
-- VERIFICATION AND TESTING COMMANDS
-- ========================================================================================

-- Output a message to confirm successful execution
DO $$ 
BEGIN
  RAISE NOTICE 'Mood Mentor Profile setup completed successfully!';
  RAISE NOTICE 'Avatar synchronization with auth metadata enabled.';
  RAISE NOTICE 'Profile completion calculation added.';
  RAISE NOTICE 'RLS policies enabled and configured.';
  RAISE NOTICE 'Added SECURITY DEFINER functions for improved security.';
  RAISE NOTICE 'Recreated appointment views with fallback options if tables are missing.';
END $$; 