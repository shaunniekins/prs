-- =========================================
-- Quick Setup Script for Patient Record System
-- Run this AFTER running complete-schema.sql
-- =========================================

-- Verify tables exist
DO $$
BEGIN
    -- Check if Role table has data
    IF NOT EXISTS (SELECT 1 FROM "Role" WHERE "RoleName" = 'admin') THEN
        INSERT INTO "Role" ("RoleName") VALUES ('admin'), ('nurse'), ('patient')
        ON CONFLICT ("RoleName") DO NOTHING;
        RAISE NOTICE 'Roles inserted successfully';
    ELSE
        RAISE NOTICE 'Roles already exist';
    END IF;
END $$;

-- Create an admin user (you'll need to replace with actual auth.users id after signup)
-- This is a placeholder - actual admin creation should be done through Supabase Auth

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('Role', 'Users', 'Staff', 'Patients', 'Appointment', 'Diagnosis', 'Treatment', 'MedicalRecord', 'Notes', 'Notification');

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Test helper functions (these should work for authenticated users)
-- SELECT get_user_role();
-- SELECT is_admin();
-- SELECT is_staff();
-- SELECT is_patient();

-- Insert sample diagnosis entries
INSERT INTO "Diagnosis" ("DiagnosisName", "DiagnosisCode", "Description") VALUES
    ('Hypertension', 'I10', 'High blood pressure'),
    ('Type 2 Diabetes Mellitus', 'E11', 'Type 2 diabetes'),
    ('Upper Respiratory Infection', 'J06.9', 'Common cold/URI'),
    ('Gastroenteritis', 'A09', 'Stomach flu'),
    ('Migraine', 'G43.9', 'Migraine headache'),
    ('Allergic Rhinitis', 'J30.9', 'Allergies'),
    ('Bronchitis', 'J40', 'Inflammation of bronchial tubes'),
    ('Urinary Tract Infection', 'N39.0', 'UTI'),
    ('Anxiety Disorder', 'F41.9', 'Anxiety'),
    ('Asthma', 'J45.9', 'Asthma')
ON CONFLICT DO NOTHING;

-- Insert sample treatment entries
INSERT INTO "Treatment" ("TreatmentName", "TreatmentCode", "Description") VALUES
    ('Acetaminophen', 'RX001', 'Pain reliever and fever reducer'),
    ('Ibuprofen', 'RX002', 'Anti-inflammatory pain reliever'),
    ('Amoxicillin', 'RX003', 'Antibiotic'),
    ('Lisinopril', 'RX004', 'Blood pressure medication'),
    ('Metformin', 'RX005', 'Diabetes medication'),
    ('Albuterol Inhaler', 'RX006', 'Bronchodilator'),
    ('Omeprazole', 'RX007', 'Acid reducer'),
    ('Loratadine', 'RX008', 'Antihistamine'),
    ('Prednisone', 'RX009', 'Corticosteroid'),
    ('Physical Therapy', 'TX001', 'Physical rehabilitation')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup verification complete!';
END $$;
