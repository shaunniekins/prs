-- =========================================
-- Baan KM-3 Patient Record System
-- Complete Supabase PostgreSQL Schema
-- Version: 2.0 - Consolidated and Production-Ready
-- =========================================

-- =========================================
-- EXTENSIONS
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- DROP EXISTING OBJECTS (For Clean Setup)
-- =========================================

-- Drop policies first
DROP POLICY IF EXISTS "Role read access" ON "Role";
DROP POLICY IF EXISTS "Role service role access" ON "Role";
DROP POLICY IF EXISTS "Users select own" ON "Users";
DROP POLICY IF EXISTS "Users update own" ON "Users";
DROP POLICY IF EXISTS "Admins can read all users" ON "Users";
DROP POLICY IF EXISTS "Allow admins to insert new users" ON "Users";
DROP POLICY IF EXISTS "Service role full access users" ON "Users";
DROP POLICY IF EXISTS "Staff read patients" ON "Patients";
DROP POLICY IF EXISTS "Admins can read all patients" ON "Patients";
DROP POLICY IF EXISTS "Patients read own" ON "Patients";
DROP POLICY IF EXISTS "Allow admins to insert new patients" ON "Patients";
DROP POLICY IF EXISTS "Service role full access patients" ON "Patients";
DROP POLICY IF EXISTS "Admins can read all staff" ON "Staff";
DROP POLICY IF EXISTS "Allow admins to insert new staff" ON "Staff";
DROP POLICY IF EXISTS "Staff read own" ON "Staff";
DROP POLICY IF EXISTS "Service role full access staff" ON "Staff";
DROP POLICY IF EXISTS "Admins can read all appointments" ON "Appointment";
DROP POLICY IF EXISTS "Staff can read all appointments" ON "Appointment";
DROP POLICY IF EXISTS "Patients can read own appointments" ON "Appointment";
DROP POLICY IF EXISTS "Staff manage appointments" ON "Appointment";
DROP POLICY IF EXISTS "Service role full access appointments" ON "Appointment";
DROP POLICY IF EXISTS "Authenticated read diagnosis" ON "Diagnosis";
DROP POLICY IF EXISTS "Staff manage diagnosis" ON "Diagnosis";
DROP POLICY IF EXISTS "Service role full access diagnosis" ON "Diagnosis";
DROP POLICY IF EXISTS "Authenticated read treatment" ON "Treatment";
DROP POLICY IF EXISTS "Staff manage treatment" ON "Treatment";
DROP POLICY IF EXISTS "Service role full access treatment" ON "Treatment";
DROP POLICY IF EXISTS "Admins read all records" ON "MedicalRecord";
DROP POLICY IF EXISTS "Staff read all records" ON "MedicalRecord";
DROP POLICY IF EXISTS "Patients read own records" ON "MedicalRecord";
DROP POLICY IF EXISTS "Staff manage records" ON "MedicalRecord";
DROP POLICY IF EXISTS "Service role full access records" ON "MedicalRecord";
DROP POLICY IF EXISTS "Admins read all notes" ON "Notes";
DROP POLICY IF EXISTS "Staff read all notes" ON "Notes";
DROP POLICY IF EXISTS "Patients read own notes" ON "Notes";
DROP POLICY IF EXISTS "Staff manage notes" ON "Notes";
DROP POLICY IF EXISTS "Service role full access notes" ON "Notes";
DROP POLICY IF EXISTS "Users see own notifications" ON "Notification";
DROP POLICY IF EXISTS "Admins see all notifications" ON "Notification";
DROP POLICY IF EXISTS "Staff manage notifications" ON "Notification";
DROP POLICY IF EXISTS "Service role full access notifications" ON "Notification";

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON "Users";
DROP TRIGGER IF EXISTS update_staff_updated_at ON "Staff";
DROP TRIGGER IF EXISTS update_patients_updated_at ON "Patients";
DROP TRIGGER IF EXISTS update_medicalrecord_updated_at ON "MedicalRecord";
DROP TRIGGER IF EXISTS update_diagnosis_updated_at ON "Diagnosis";
DROP TRIGGER IF EXISTS update_treatment_updated_at ON "Treatment";
DROP TRIGGER IF EXISTS on_auth_user_created_in_public_users ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS public.handle_new_user_in_public_users();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_staff();
DROP FUNCTION IF EXISTS is_patient();

-- Drop views
DROP VIEW IF EXISTS appointment_details;

-- =========================================
-- TABLES
-- =========================================

-- Role table (lookup table for user roles)
CREATE TABLE IF NOT EXISTS "Role" (
    "RoleID" SERIAL PRIMARY KEY,
    "RoleName" VARCHAR(50) NOT NULL UNIQUE
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS "Users" (
    "UserID" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "PatientID" UUID,
    "Username" VARCHAR(100) NOT NULL UNIQUE,
    "Password" VARCHAR(255), -- Legacy field, auth handled by Supabase
    "Email" VARCHAR(255) NOT NULL UNIQUE,
    "RoleName" VARCHAR(50) REFERENCES "Role"("RoleName"),
    "fullName" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table (for medical staff)
CREATE TABLE IF NOT EXISTS "Staff" (
    "StaffID" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserID" UUID REFERENCES "Users"("UserID") ON DELETE SET NULL,
    "FirstName" VARCHAR(100) NOT NULL,
    "Surname" VARCHAR(100) NOT NULL,
    "Suffix" VARCHAR(20),
    "ContactNumber" VARCHAR(20),
    "RoleID" INTEGER REFERENCES "Role"("RoleID"),
    "Specialization" VARCHAR(100),
    "LicenseNumber" VARCHAR(50),
    "IsActive" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS "Patients" (
    "PatientID" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserID" UUID REFERENCES "Users"("UserID") ON DELETE SET NULL,
    "FirstName" VARCHAR(100) NOT NULL,
    "Surname" VARCHAR(100) NOT NULL,
    "Suffix" VARCHAR(20),
    "Address" TEXT,
    "Gender" VARCHAR(20),
    "BirthDate" DATE,
    "ContactNumber" VARCHAR(20),
    "EmergencyContact" VARCHAR(20),
    "EmergencyContactName" VARCHAR(200),
    "BloodType" VARCHAR(5),
    "Allergies" TEXT,
    "IsActive" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from Users to Patients (circular dependency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_patientid') THEN
        ALTER TABLE "Users" ADD CONSTRAINT fk_users_patientid 
        FOREIGN KEY ("PatientID") REFERENCES "Patients"("PatientID") ON DELETE SET NULL;
    END IF;
END $$;

-- Appointment table
CREATE TABLE IF NOT EXISTS "Appointment" (
    "AppointmentID" SERIAL PRIMARY KEY,
    "ScheduledBy" UUID,
    "PatientID" UUID,
    "DateTime" TIMESTAMPTZ NOT NULL,
    "EndDateTime" TIMESTAMPTZ,
    "Status" VARCHAR(50) DEFAULT 'pending',
    "Reason" TEXT,
    "Notes" TEXT,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_appointment_patientid FOREIGN KEY ("PatientID") REFERENCES "Patients"("PatientID") ON DELETE CASCADE,
    CONSTRAINT fk_appointment_scheduledby FOREIGN KEY ("ScheduledBy") REFERENCES "Staff"("StaffID") ON DELETE SET NULL
);

-- Diagnosis table
CREATE TABLE IF NOT EXISTS "Diagnosis" (
    "DiagnosisID" SERIAL PRIMARY KEY,
    "DiagnosisName" TEXT NOT NULL,
    "DiagnosisCode" VARCHAR(20), -- ICD-10 code
    "Description" TEXT,
    "category" VARCHAR(50) DEFAULT 'General',
    "symptoms" TEXT,
    "riskFactors" TEXT,
    "diagnosticCriteria" TEXT,
    "complications" TEXT,
    "status" VARCHAR(20) DEFAULT 'Active',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment table
CREATE TABLE IF NOT EXISTS "Treatment" (
    "TreatmentID" SERIAL PRIMARY KEY,
    "TreatmentName" TEXT NOT NULL,
    "TreatmentCode" VARCHAR(20),
    "Description" TEXT,
    "category" VARCHAR(50) DEFAULT 'General',
    "medications" JSONB DEFAULT '[]',
    "instructions" TEXT,
    "contraindications" TEXT,
    "sideEffects" TEXT,
    "status" VARCHAR(20) DEFAULT 'Active',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table (consultation notes)
CREATE TABLE IF NOT EXISTS "Notes" (
    "NoteID" SERIAL PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "PatientID" UUID,
    "PatientName" VARCHAR(255),
    "EnteredBy" UUID,
    "StaffName" VARCHAR(255),
    "AppointmentID" INTEGER,
    "Type" VARCHAR(50) DEFAULT 'Consultation',
    "Subject" VARCHAR(255),
    "VitalSigns" JSONB,
    "Assessment" TEXT,
    "Plan" TEXT,
    "FollowUp" TEXT,
    "Status" VARCHAR(50) DEFAULT 'Draft',
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_notes_patientid FOREIGN KEY ("PatientID") REFERENCES "Patients"("PatientID") ON DELETE CASCADE,
    CONSTRAINT fk_notes_enteredby FOREIGN KEY ("EnteredBy") REFERENCES "Staff"("StaffID") ON DELETE SET NULL,
    CONSTRAINT fk_notes_appointmentid FOREIGN KEY ("AppointmentID") REFERENCES "Appointment"("AppointmentID") ON DELETE SET NULL
);

-- MedicalRecord table
CREATE TABLE IF NOT EXISTS "MedicalRecord" (
    "MedicalRecordID" SERIAL PRIMARY KEY,
    "AppointmentID" INTEGER,
    "EnteredBy" UUID,
    "DiagnosisID" INTEGER,
    "TreatmentID" INTEGER,
    "NoteID" INTEGER,
    "PatientID" UUID,
    "Status" VARCHAR(50) DEFAULT 'Draft',
    "VitalSigns" JSONB,
    "Notes" TEXT,
    "Prescriptions" JSONB,
    "LabResults" JSONB,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_medicalrecord_appointmentid FOREIGN KEY ("AppointmentID") REFERENCES "Appointment"("AppointmentID") ON DELETE SET NULL,
    CONSTRAINT fk_medicalrecord_enteredby FOREIGN KEY ("EnteredBy") REFERENCES "Staff"("StaffID") ON DELETE SET NULL,
    CONSTRAINT fk_medicalrecord_diagnosisid FOREIGN KEY ("DiagnosisID") REFERENCES "Diagnosis"("DiagnosisID") ON DELETE SET NULL,
    CONSTRAINT fk_medicalrecord_treatmentid FOREIGN KEY ("TreatmentID") REFERENCES "Treatment"("TreatmentID") ON DELETE SET NULL,
    CONSTRAINT fk_medicalrecord_patientid FOREIGN KEY ("PatientID") REFERENCES "Patients"("PatientID") ON DELETE CASCADE
);

-- Add foreign key from MedicalRecord to Notes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_medicalrecord_noteid') THEN
        ALTER TABLE "MedicalRecord" ADD CONSTRAINT fk_medicalrecord_noteid 
        FOREIGN KEY ("NoteID") REFERENCES "Notes"("NoteID") ON DELETE SET NULL;
    END IF;
END $$;

-- Notification table (enhanced)
CREATE TABLE IF NOT EXISTS "Notification" (
    "NotificationID" SERIAL PRIMARY KEY,
    "UserID" UUID,
    "Title" VARCHAR(255),
    "Message" TEXT NOT NULL,
    "Type" VARCHAR(50) DEFAULT 'info', -- info, success, warning, error, appointment, record
    "IsRead" BOOLEAN DEFAULT false,
    "ReadAt" TIMESTAMPTZ,
    "RelatedEntityType" VARCHAR(50), -- appointment, record, patient, etc.
    "RelatedEntityID" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_notification_userid FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE CASCADE
);

-- UserSessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS "UserSessions" (
    "SessionID" VARCHAR(255) PRIMARY KEY,
    "UserID" UUID NOT NULL,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "ExpiresAt" TIMESTAMPTZ NOT NULL,
    "LastActivity" TIMESTAMPTZ DEFAULT NOW(),
    "IPAddress" VARCHAR(45),
    "UserAgent" TEXT,
    CONSTRAINT fk_usersessions_userid FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE CASCADE
);

-- Report table for saved analytics reports
CREATE TABLE IF NOT EXISTS "Report" (
    "ReportID" SERIAL PRIMARY KEY,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "ReportType" VARCHAR(50) DEFAULT 'summary',
    "Data" JSONB, -- Stores the analytics data snapshot
    "Parameters" JSONB, -- Stores date range and other parameters
    "GeneratedBy" UUID,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_report_generatedby FOREIGN KEY ("GeneratedBy") REFERENCES "Users"("UserID") ON DELETE SET NULL
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"("Email");
CREATE INDEX IF NOT EXISTS idx_users_username ON "Users"("Username");
CREATE INDEX IF NOT EXISTS idx_users_rolename ON "Users"("RoleName");

CREATE INDEX IF NOT EXISTS idx_staff_userid ON "Staff"("UserID");
CREATE INDEX IF NOT EXISTS idx_staff_roleid ON "Staff"("RoleID");

CREATE INDEX IF NOT EXISTS idx_patients_userid ON "Patients"("UserID");
CREATE INDEX IF NOT EXISTS idx_patients_name ON "Patients"("FirstName", "Surname");

CREATE INDEX IF NOT EXISTS idx_appointment_patientid ON "Appointment"("PatientID");
CREATE INDEX IF NOT EXISTS idx_appointment_scheduledby ON "Appointment"("ScheduledBy");
CREATE INDEX IF NOT EXISTS idx_appointment_datetime ON "Appointment"("DateTime");
CREATE INDEX IF NOT EXISTS idx_appointment_status ON "Appointment"("Status");

CREATE INDEX IF NOT EXISTS idx_medicalrecord_patientid ON "MedicalRecord"("PatientID");
CREATE INDEX IF NOT EXISTS idx_medicalrecord_enteredby ON "MedicalRecord"("EnteredBy");
CREATE INDEX IF NOT EXISTS idx_medicalrecord_appointmentid ON "MedicalRecord"("AppointmentID");

CREATE INDEX IF NOT EXISTS idx_notes_patientid ON "Notes"("PatientID");
CREATE INDEX IF NOT EXISTS idx_notes_enteredby ON "Notes"("EnteredBy");

CREATE INDEX IF NOT EXISTS idx_notification_userid ON "Notification"("UserID");
CREATE INDEX IF NOT EXISTS idx_notification_isread ON "Notification"("IsRead");
CREATE INDEX IF NOT EXISTS idx_notification_createdat ON "Notification"("CreatedAt");

CREATE INDEX IF NOT EXISTS idx_usersessions_userid ON "UserSessions"("UserID");
CREATE INDEX IF NOT EXISTS idx_usersessions_expiresat ON "UserSessions"("ExpiresAt");

CREATE INDEX IF NOT EXISTS idx_report_generatedby ON "Report"("GeneratedBy");
CREATE INDEX IF NOT EXISTS idx_report_createdat ON "Report"("CreatedAt");

-- =========================================
-- FUNCTIONS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create a user profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user_in_public_users()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."Users" ("UserID", "Email", "Username", "fullName", "RoleName")
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'fullName',
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
    )
    ON CONFLICT ("UserID") DO UPDATE SET
        "Email" = EXCLUDED."Email",
        "fullName" = COALESCE(EXCLUDED."fullName", "Users"."fullName"),
        "updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT "RoleName"
        FROM "Users"
        WHERE "UserID" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT "RoleName" = 'admin'
        FROM "Users"
        WHERE "UserID" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if current user is staff (admin or nurse)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT "RoleName" IN ('admin', 'nurse')
        FROM "Users"
        WHERE "UserID" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if current user is patient
CREATE OR REPLACE FUNCTION is_patient()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT "RoleName" = 'patient'
        FROM "Users"
        WHERE "UserID" = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================
-- TRIGGERS
-- =========================================

-- Auth trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_in_public_users ON auth.users;
CREATE TRIGGER on_auth_user_created_in_public_users
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_in_public_users();

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON "Users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at 
    BEFORE UPDATE ON "Staff"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON "Patients"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicalrecord_updated_at 
    BEFORE UPDATE ON "MedicalRecord"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnosis_updated_at 
    BEFORE UPDATE ON "Diagnosis"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_updated_at 
    BEFORE UPDATE ON "Treatment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- VIEWS
-- =========================================

-- View for appointment details
CREATE OR REPLACE VIEW appointment_details AS
SELECT
    a."AppointmentID",
    a."DateTime",
    a."EndDateTime",
    a."Status",
    a."Reason",
    a."Notes",
    a."CreatedAt",
    p."PatientID",
    p."FirstName" || ' ' || p."Surname" AS "PatientName",
    p."ContactNumber" AS "PatientContact",
    s."StaffID",
    s."FirstName" || ' ' || s."Surname" AS "StaffName",
    s."Specialization"
FROM "Appointment" a
LEFT JOIN "Patients" p ON a."PatientID" = p."PatientID"
LEFT JOIN "Staff" s ON a."ScheduledBy" = s."StaffID";

-- View for patient summary with latest record
CREATE OR REPLACE VIEW patient_summary AS
SELECT 
    p."PatientID",
    p."FirstName",
    p."Surname",
    p."FirstName" || ' ' || p."Surname" AS "FullName",
    p."Gender",
    p."BirthDate",
    p."ContactNumber",
    p."Address",
    p."BloodType",
    p."Allergies",
    p."created_at",
    u."Email",
    (SELECT COUNT(*) FROM "MedicalRecord" mr WHERE mr."PatientID" = p."PatientID") AS "RecordCount",
    (SELECT COUNT(*) FROM "Appointment" apt WHERE apt."PatientID" = p."PatientID") AS "AppointmentCount"
FROM "Patients" p
LEFT JOIN "Users" u ON p."UserID" = u."UserID";

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on all tables
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Diagnosis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Treatment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSessions" ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES - Role Table
-- =========================================

CREATE POLICY "Role read access" ON "Role"
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Role service role access" ON "Role"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Users Table
-- =========================================

-- Users can view their own profile
CREATE POLICY "Users select own" ON "Users"
    FOR SELECT TO authenticated
    USING (auth.uid() = "UserID");

-- Users can update their own profile
CREATE POLICY "Users update own" ON "Users"
    FOR UPDATE TO authenticated
    USING (auth.uid() = "UserID");

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON "Users"
    FOR SELECT TO authenticated
    USING (is_admin());

-- Admins can insert users
CREATE POLICY "Allow admins to insert new users" ON "Users"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

-- Service role full access
CREATE POLICY "Service role full access users" ON "Users"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Staff Table
-- =========================================

-- Staff can read their own profile
CREATE POLICY "Staff read own" ON "Staff"
    FOR SELECT TO authenticated
    USING ("UserID" = auth.uid());

-- Admins can read all staff
CREATE POLICY "Admins can read all staff" ON "Staff"
    FOR SELECT TO authenticated
    USING (is_admin());

-- Staff can read all staff (for collaboration)
CREATE POLICY "Staff read all staff" ON "Staff"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Admins can manage staff
CREATE POLICY "Allow admins to insert new staff" ON "Staff"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Allow admins to update staff" ON "Staff"
    FOR UPDATE TO authenticated
    USING (is_admin());

CREATE POLICY "Allow admins to delete staff" ON "Staff"
    FOR DELETE TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access staff" ON "Staff"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Patients Table
-- =========================================

-- Patients can view their own record
CREATE POLICY "Patients read own" ON "Patients"
    FOR SELECT TO authenticated
    USING ("UserID" = auth.uid());

-- Staff can read all patients
CREATE POLICY "Staff read patients" ON "Patients"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Admins can manage patients
CREATE POLICY "Allow admins to insert new patients" ON "Patients"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Staff can update patients" ON "Patients"
    FOR UPDATE TO authenticated
    USING (is_staff());

CREATE POLICY "Admins can delete patients" ON "Patients"
    FOR DELETE TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access patients" ON "Patients"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Appointment Table
-- =========================================

-- Patients can view their own appointments
CREATE POLICY "Patients can read own appointments" ON "Appointment"
    FOR SELECT TO authenticated
    USING (
        "PatientID" IN (SELECT "PatientID" FROM "Patients" WHERE "UserID" = auth.uid())
    );

-- Staff can read all appointments
CREATE POLICY "Staff can read all appointments" ON "Appointment"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Staff can manage appointments
CREATE POLICY "Staff manage appointments" ON "Appointment"
    FOR INSERT TO authenticated
    WITH CHECK (is_staff());

CREATE POLICY "Staff update appointments" ON "Appointment"
    FOR UPDATE TO authenticated
    USING (is_staff());

CREATE POLICY "Staff delete appointments" ON "Appointment"
    FOR DELETE TO authenticated
    USING (is_staff());

-- Patients can request appointments (insert only)
CREATE POLICY "Patients can request appointments" ON "Appointment"
    FOR INSERT TO authenticated
    WITH CHECK (
        "PatientID" IN (SELECT "PatientID" FROM "Patients" WHERE "UserID" = auth.uid())
    );

-- Service role full access
CREATE POLICY "Service role full access appointments" ON "Appointment"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Diagnosis Table (Lookup)
-- =========================================

CREATE POLICY "Authenticated read diagnosis" ON "Diagnosis"
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff manage diagnosis" ON "Diagnosis"
    FOR ALL TO authenticated
    USING (is_staff());

CREATE POLICY "Service role full access diagnosis" ON "Diagnosis"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Treatment Table (Lookup)
-- =========================================

CREATE POLICY "Authenticated read treatment" ON "Treatment"
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff manage treatment" ON "Treatment"
    FOR ALL TO authenticated
    USING (is_staff());

CREATE POLICY "Service role full access treatment" ON "Treatment"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - MedicalRecord Table
-- =========================================

-- Patients can view their own records
CREATE POLICY "Patients read own records" ON "MedicalRecord"
    FOR SELECT TO authenticated
    USING (
        "PatientID" IN (SELECT "PatientID" FROM "Patients" WHERE "UserID" = auth.uid())
    );

-- Staff can read all records
CREATE POLICY "Staff read all records" ON "MedicalRecord"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Staff can manage records
CREATE POLICY "Staff manage records" ON "MedicalRecord"
    FOR INSERT TO authenticated
    WITH CHECK (is_staff());

CREATE POLICY "Staff update records" ON "MedicalRecord"
    FOR UPDATE TO authenticated
    USING (is_staff());

CREATE POLICY "Staff delete records" ON "MedicalRecord"
    FOR DELETE TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access records" ON "MedicalRecord"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Notes Table
-- =========================================

-- Patients can view notes about them
CREATE POLICY "Patients read own notes" ON "Notes"
    FOR SELECT TO authenticated
    USING (
        "PatientID" IN (SELECT "PatientID" FROM "Patients" WHERE "UserID" = auth.uid())
    );

-- Staff can read all notes
CREATE POLICY "Staff read all notes" ON "Notes"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Staff can manage notes
CREATE POLICY "Staff manage notes" ON "Notes"
    FOR INSERT TO authenticated
    WITH CHECK (is_staff());

CREATE POLICY "Staff update notes" ON "Notes"
    FOR UPDATE TO authenticated
    USING (is_staff());

CREATE POLICY "Staff delete notes" ON "Notes"
    FOR DELETE TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access notes" ON "Notes"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Notification Table
-- =========================================

-- Users can view their own notifications
CREATE POLICY "Users see own notifications" ON "Notification"
    FOR SELECT TO authenticated
    USING ("UserID" = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON "Notification"
    FOR UPDATE TO authenticated
    USING ("UserID" = auth.uid());

-- Staff can manage notifications
CREATE POLICY "Staff manage notifications" ON "Notification"
    FOR INSERT TO authenticated
    WITH CHECK (is_staff());

CREATE POLICY "Staff see all notifications" ON "Notification"
    FOR SELECT TO authenticated
    USING (is_staff());

-- Service role full access
CREATE POLICY "Service role full access notifications" ON "Notification"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - UserSessions Table
-- =========================================

-- Users can view their own sessions
CREATE POLICY "Users see own sessions" ON "UserSessions"
    FOR SELECT TO authenticated
    USING ("UserID" = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users delete own sessions" ON "UserSessions"
    FOR DELETE TO authenticated
    USING ("UserID" = auth.uid());

-- Admins can view all sessions
CREATE POLICY "Admins see all sessions" ON "UserSessions"
    FOR SELECT TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access sessions" ON "UserSessions"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- RLS POLICIES - Report Table
-- =========================================

-- Enable RLS on Report table
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

-- Admins can read all reports
CREATE POLICY "Admins can read all reports" ON "Report"
    FOR SELECT TO authenticated
    USING (is_admin());

-- Admins can create reports
CREATE POLICY "Admins can create reports" ON "Report"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON "Report"
    FOR UPDATE TO authenticated
    USING (is_admin());

-- Admins can delete reports
CREATE POLICY "Admins can delete reports" ON "Report"
    FOR DELETE TO authenticated
    USING (is_admin());

-- Service role full access
CREATE POLICY "Service role full access reports" ON "Report"
    FOR ALL TO service_role
    USING (true);

-- =========================================
-- INITIAL DATA
-- =========================================

-- Insert default roles (lowercase for consistency)
INSERT INTO "Role" ("RoleName") VALUES 
    ('admin'),
    ('nurse'),
    ('patient')
ON CONFLICT ("RoleName") DO NOTHING;

-- =========================================
-- GRANTS
-- =========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant table access
GRANT SELECT ON "Role" TO anon, authenticated;
GRANT ALL ON "Role" TO service_role;

GRANT SELECT, INSERT, UPDATE ON "Users" TO authenticated;
GRANT ALL ON "Users" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Staff" TO authenticated;
GRANT ALL ON "Staff" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Patients" TO authenticated;
GRANT ALL ON "Patients" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Appointment" TO authenticated;
GRANT ALL ON "Appointment" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Diagnosis" TO authenticated;
GRANT ALL ON "Diagnosis" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Treatment" TO authenticated;
GRANT ALL ON "Treatment" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "MedicalRecord" TO authenticated;
GRANT ALL ON "MedicalRecord" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Notes" TO authenticated;
GRANT ALL ON "Notes" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Notification" TO authenticated;
GRANT ALL ON "Notification" TO service_role;

GRANT SELECT, INSERT, DELETE ON "UserSessions" TO authenticated;
GRANT ALL ON "UserSessions" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Report" TO authenticated;
GRANT ALL ON "Report" TO service_role;

-- Grant access to views
GRANT SELECT ON appointment_details TO authenticated, service_role;
GRANT SELECT ON patient_summary TO authenticated, service_role;

-- =========================================
-- END OF COMPLETE SCHEMA
-- =========================================
