-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  meeting_link TEXT,
  appointment_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_mentor_id ON appointments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Create view for patient appointments
CREATE OR REPLACE VIEW patient_appointments_view AS
SELECT 
  a.*,
  p.name as mentor_name,
  p.metadata->>'specialty' as mentor_specialty,
  p.avatar_url as mentor_avatar_url
FROM 
  appointments a
JOIN 
  profiles p ON a.mentor_id = p.id;

-- Create view for mentor appointments
CREATE OR REPLACE VIEW mentor_appointments_view AS
SELECT 
  a.*,
  p.name as patient_name,
  p.email as patient_email,
  p.avatar_url as patient_avatar_url
FROM 
  appointments a
JOIN 
  profiles p ON a.patient_id = p.id;

-- Add RLS policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own appointments (as patient or mentor)
CREATE POLICY "Users can view their own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = mentor_id);

-- Policy: Patients can insert their own appointments
CREATE POLICY "Patients can insert their own appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Policy: Users can update their own appointments
CREATE POLICY "Users can update their own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = mentor_id);

-- Policy: Users can delete their own appointments
CREATE POLICY "Users can delete their own appointments"
  ON appointments FOR DELETE
  USING (auth.uid() = patient_id OR auth.uid() = mentor_id); 