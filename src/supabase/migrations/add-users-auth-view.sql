-- =========================================
-- Migration: Add Users with Auth Info View
-- Date: 2026-02-07
-- Purpose: Create view to access last login info from auth.users
-- =========================================

-- Create view that joins public.Users with auth.users to get login info
CREATE OR REPLACE VIEW users_with_auth_info AS
SELECT 
    u."UserID",
    u."Username",
    u."Email",
    u."RoleName",
    u."fullName",
    u."created_at",
    u."updated_at",
    u."credentials_sent_at",
    u."credentials_last_sent_at",
    u."credentials_sent_count",
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.created_at as auth_created_at
FROM "Users" u
LEFT JOIN auth.users au ON u."UserID" = au.id;

-- Grant access to the view
GRANT SELECT ON users_with_auth_info TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON VIEW users_with_auth_info IS 'View combining public Users table with auth.users to provide last login information';
