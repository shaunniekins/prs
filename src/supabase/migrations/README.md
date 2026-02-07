# Database Migrations

This folder contains SQL migration files for the Baan KM-3 Patient Record System.

## Available Migrations

1. **migrate-notes.sql** - Migrates consultation notes structure
2. **migrate-treatment-diagnosis.sql** - Updates treatment and diagnosis tables
3. **add-report-table.sql** - Adds reporting functionality
4. **add-credential-tracking.sql** - Adds credential email tracking to Users table
5. **add-users-auth-view.sql** - Creates view to access last login from auth.users

## How to Apply Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file you want to apply
4. Copy all the SQL content
5. Paste into the SQL Editor
6. Click **Run** to execute

## Latest Migrations

### Credential Tracking (add-credential-tracking.sql)

Adds the following columns to the `Users` table:

- `credentials_sent_at` - Timestamp when credentials were first sent
- `credentials_last_sent_at` - Timestamp when credentials were last sent (for resends)
- `credentials_sent_count` - Number of times credentials have been sent

### Users Auth View (add-users-auth-view.sql)

Creates a `users_with_auth_info` view that:

- Joins public `Users` table with `auth.users`
- Provides access to `last_sign_in_at` (last login timestamp)
- Shows email confirmation status
- Includes all credential tracking fields

**Usage in frontend:**

```javascript
const { data } = await supabase
  .from("users_with_auth_info")
  .select("UserID, Username, Email, last_sign_in_at, credentials_sent_at");
```

After applying these migrations:

1. Restart your backend server
2. The "Credentials Sent" column will update automatically when emails are sent
3. The "Last Login" column will show actual login timestamps from Supabase Auth

## Migration Order

Migrations should be applied in the order they were created (by filename or date). The system is designed to handle migrations gracefully - if a column or table already exists, the migration will skip that step.
