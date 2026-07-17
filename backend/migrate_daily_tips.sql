CREATE TABLE IF NOT EXISTS daily_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'general')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_tips_valid
  ON daily_tips (risk_level, expires_at DESC);

ALTER TABLE daily_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read valid daily tips" ON daily_tips;
CREATE POLICY "Authenticated users read valid daily tips" ON daily_tips
  FOR SELECT TO authenticated
  USING (expires_at IS NULL OR expires_at > NOW());
