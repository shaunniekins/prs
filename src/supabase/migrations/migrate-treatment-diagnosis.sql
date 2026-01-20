-- Migration: Add additional columns to Treatment and Diagnosis tables
-- For enhanced Treatment & Diagnosis management

-- Add additional columns to Treatment table
ALTER TABLE "Treatment" 
ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS "medications" JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "instructions" TEXT,
ADD COLUMN IF NOT EXISTS "contraindications" TEXT,
ADD COLUMN IF NOT EXISTS "sideEffects" TEXT,
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'Active';

-- Add additional columns to Diagnosis table
ALTER TABLE "Diagnosis"
ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS "symptoms" TEXT,
ADD COLUMN IF NOT EXISTS "riskFactors" TEXT,
ADD COLUMN IF NOT EXISTS "diagnosticCriteria" TEXT,
ADD COLUMN IF NOT EXISTS "complications" TEXT,
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'Active';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_treatment_category ON "Treatment"("category");
CREATE INDEX IF NOT EXISTS idx_treatment_status ON "Treatment"("status");
CREATE INDEX IF NOT EXISTS idx_diagnosis_category ON "Diagnosis"("category");
CREATE INDEX IF NOT EXISTS idx_diagnosis_status ON "Diagnosis"("status");

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Treatment'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Diagnosis'
ORDER BY ordinal_position;
