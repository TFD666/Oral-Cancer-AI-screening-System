-- ============================================================
-- Migration: Upgrade chat_messages for the AI Chat System
-- Run this in Supabase SQL Editor ONCE
-- ============================================================

-- Drop old table if it exists (it used user_email + role='ai')
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create the new chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient retrieval
CREATE INDEX idx_chat_user_created ON chat_messages (user_id, created_at DESC);
CREATE INDEX idx_chat_scan ON chat_messages (scan_id);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own messages
CREATE POLICY "Users select own chat" ON chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own chat" ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
