-- Migration: Add extended fields to Notes table for Consultation Notes
-- For use with Supabase Analytics

-- Add missing columns to Notes table
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "PatientName" VARCHAR(255);
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "StaffName" VARCHAR(255);
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "AppointmentID" INTEGER REFERENCES "Appointment"("AppointmentID") ON DELETE SET NULL;
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "Type" VARCHAR(50) DEFAULT 'Consultation';
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "Subject" VARCHAR(255);
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "VitalSigns" JSONB;
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "Assessment" TEXT;
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "Plan" TEXT;
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "FollowUp" TEXT;
ALTER TABLE "Notes" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(50) DEFAULT 'Draft';

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_patient ON "Notes"("PatientID");
CREATE INDEX IF NOT EXISTS idx_notes_type ON "Notes"("Type");
CREATE INDEX IF NOT EXISTS idx_notes_status ON "Notes"("Status");

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Notes'
ORDER BY ordinal_position;
