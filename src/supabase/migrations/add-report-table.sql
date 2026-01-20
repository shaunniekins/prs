-- Migration: Add Report table for saving analytics snapshots
-- For use with Supabase Analytics

-- Create Report table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_generatedby ON "Report"("GeneratedBy");
CREATE INDEX IF NOT EXISTS idx_report_createdat ON "Report"("CreatedAt");

-- Enable RLS
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can read all reports" ON "Report"
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "Users" 
            WHERE "UserID" = auth.uid() 
            AND "RoleName" = 'admin'
        )
    );

CREATE POLICY "Admins can create reports" ON "Report"
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Users" 
            WHERE "UserID" = auth.uid() 
            AND "RoleName" = 'admin'
        )
    );

CREATE POLICY "Admins can update reports" ON "Report"
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "Users" 
            WHERE "UserID" = auth.uid() 
            AND "RoleName" = 'admin'
        )
    );

CREATE POLICY "Admins can delete reports" ON "Report"
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "Users" 
            WHERE "UserID" = auth.uid() 
            AND "RoleName" = 'admin'
        )
    );

CREATE POLICY "Service role full access reports" ON "Report"
    FOR ALL TO service_role
    USING (true);

-- Grant permissions
GRANT ALL ON "Report" TO authenticated;
GRANT ALL ON "Report" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "Report_ReportID_seq" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "Report_ReportID_seq" TO service_role;

-- Success message
SELECT 'Report table created successfully!' as message;
