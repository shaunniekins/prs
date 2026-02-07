-- =========================================
-- Migration: Add Credential Email Tracking
-- Date: 2026-02-07
-- Purpose: Track when account credentials are sent to users
-- =========================================

-- Add columns to Users table for tracking credential emails
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS "credentials_sent_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "credentials_last_sent_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "credentials_sent_count" INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN "Users"."credentials_sent_at" IS 'Timestamp when credentials were first sent via email';
COMMENT ON COLUMN "Users"."credentials_last_sent_at" IS 'Timestamp when credentials were last sent (for resends)';
COMMENT ON COLUMN "Users"."credentials_sent_count" IS 'Number of times credentials have been sent';

-- Create index for faster queries on credential tracking
CREATE INDEX IF NOT EXISTS idx_users_credentials_sent 
  ON "Users"("credentials_sent_at") 
  WHERE "credentials_sent_at" IS NOT NULL;
