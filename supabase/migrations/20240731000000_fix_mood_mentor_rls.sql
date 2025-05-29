-- Fix for mood_mentor_profiles row-level security policy
-- This script fixes the issue with updating mood mentor profiles

-- First, check if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mood_mentor_profiles') THEN
    -- Drop existing policies to start fresh
    DROP POLICY IF EXISTS "Public can view active profiles" ON public.mood_mentor_profiles;
    DROP POLICY IF EXISTS "Mentors can view own profile" ON public.mood_mentor_profiles;
    DROP POLICY IF EXISTS "Mentors can update own profile" ON public.mood_mentor_profiles;
    DROP POLICY IF EXISTS "Mentors can insert own profile" ON public.mood_mentor_profiles;
    DROP POLICY IF EXISTS "Mentors can delete own profile" ON public.mood_mentor_profiles;

    -- Recreate the policies with proper permissions
    -- Create a policy for anyone to view active and complete profiles
    CREATE POLICY "Public can view active profiles" ON public.mood_mentor_profiles
      FOR SELECT
      USING (is_active = true);

    -- Create a policy for mentors to view their own profile (even if incomplete)
    CREATE POLICY "Mentors can view own profile" ON public.mood_mentor_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'mood_mentor'));

    -- Create a policy for mentors to update their own profile
    CREATE POLICY "Mentors can update own profile" ON public.mood_mentor_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'mood_mentor'));

    -- Create a policy for mentors to insert their own profile
    CREATE POLICY "Mentors can insert own profile" ON public.mood_mentor_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'mood_mentor'));

    -- Create a policy for mentors to delete their own profile
    CREATE POLICY "Mentors can delete own profile" ON public.mood_mentor_profiles
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'mood_mentor'));

    -- Output success message
    RAISE NOTICE 'Successfully updated mood_mentor_profiles RLS policies';
  ELSE
    RAISE NOTICE 'Table mood_mentor_profiles does not exist, no action taken';
  END IF;
END $$; 