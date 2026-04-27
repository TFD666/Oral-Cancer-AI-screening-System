CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Self-patient records: each authenticated user has exactly one row here,
-- auto-created on their first scan.  The FK from predictions is preserved.
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 130),
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  prediction TEXT NOT NULL CHECK (prediction IN ('Cancer', 'Non-Cancer')),
  confidence DOUBLE PRECISION NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  recommendation TEXT NOT NULL,
  image_path TEXT NOT NULL,
  heatmap_path TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- User preferences for profile page toggles and display name
CREATE TABLE IF NOT EXISTS user_preferences (
  user_email TEXT PRIMARY KEY,
  display_name TEXT,
  scan_reminders BOOLEAN DEFAULT true,
  daily_tips BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history for the Care & Guidance AI assistant
-- user_id references auth.users(id) for RLS via auth.uid()
-- scan_id links messages to a specific scan context (nullable for general chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients (created_by);
CREATE INDEX IF NOT EXISTS idx_predictions_created_by ON predictions (created_by);
CREATE INDEX IF NOT EXISTS idx_predictions_patient_id ON predictions (patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_scan ON chat_messages (scan_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_email ON user_preferences (user_email);

-- Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- patients policies
DROP POLICY IF EXISTS "Doctors see own patients" ON patients;
DROP POLICY IF EXISTS "Doctors insert own patients" ON patients;
DROP POLICY IF EXISTS "Doctors update own patients" ON patients;
DROP POLICY IF EXISTS "Doctors delete own patients" ON patients;
DROP POLICY IF EXISTS "Users see own patients" ON patients;
DROP POLICY IF EXISTS "Users insert own patients" ON patients;
DROP POLICY IF EXISTS "Users update own patients" ON patients;
DROP POLICY IF EXISTS "Users delete own patients" ON patients;

CREATE POLICY "Users see own patients" ON patients
  FOR SELECT USING (created_by = auth.jwt()->>'email');
CREATE POLICY "Users insert own patients" ON patients
  FOR INSERT WITH CHECK (created_by = auth.jwt()->>'email');
CREATE POLICY "Users update own patients" ON patients
  FOR UPDATE USING (created_by = auth.jwt()->>'email')
  WITH CHECK (created_by = auth.jwt()->>'email');
CREATE POLICY "Users delete own patients" ON patients
  FOR DELETE USING (created_by = auth.jwt()->>'email');

-- predictions policies
DROP POLICY IF EXISTS "Doctors see own predictions" ON predictions;
DROP POLICY IF EXISTS "Doctors insert own predictions" ON predictions;
DROP POLICY IF EXISTS "Doctors update own predictions" ON predictions;
DROP POLICY IF EXISTS "Doctors delete own predictions" ON predictions;
DROP POLICY IF EXISTS "Users see own predictions" ON predictions;
DROP POLICY IF EXISTS "Users insert own predictions" ON predictions;
DROP POLICY IF EXISTS "Users update own predictions" ON predictions;
DROP POLICY IF EXISTS "Users delete own predictions" ON predictions;

CREATE POLICY "Users see own predictions" ON predictions
  FOR SELECT USING (created_by = auth.jwt()->>'email');
CREATE POLICY "Users insert own predictions" ON predictions
  FOR INSERT WITH CHECK (created_by = auth.jwt()->>'email');
CREATE POLICY "Users update own predictions" ON predictions
  FOR UPDATE USING (created_by = auth.jwt()->>'email')
  WITH CHECK (created_by = auth.jwt()->>'email');
CREATE POLICY "Users delete own predictions" ON predictions
  FOR DELETE USING (created_by = auth.jwt()->>'email');

-- user_preferences policies
DROP POLICY IF EXISTS "Users manage own preferences" ON user_preferences;
CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (user_email = auth.jwt()->>'email')
  WITH CHECK (user_email = auth.jwt()->>'email');

-- chat_messages policies (RLS by user_id = auth.uid())
DROP POLICY IF EXISTS "Users manage own chat" ON chat_messages;
DROP POLICY IF EXISTS "Users select own chat" ON chat_messages;
DROP POLICY IF EXISTS "Users insert own chat" ON chat_messages;

CREATE POLICY "Users select own chat" ON chat_messages
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own chat" ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
