# Supabase Database Setup Guide

This guide explains how to set up the Supabase database for the Patient Record System.

## Prerequisites

1. A Supabase account and project at [supabase.com](https://supabase.com)
2. Node.js 18+ installed
3. The project environment variables configured

## Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Update the following variables with your Supabase project credentials:

```env
# Supabase URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co

# Frontend key (publishable - safe for client-side)
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Backend key (secret - server-side only, NEVER expose to client)
SUPABASE_SECRET_KEY=sb_secret_xxx
```

You can find these values in your Supabase project:

- **Settings** → **API** → **Project URL** (for `VITE_SUPABASE_URL`)
- **Settings** → **API** → **Project API keys** → **Publishable key** (for `VITE_SUPABASE_PUBLISHABLE_KEY`)
- **Settings** → **API** → **Project API keys** → **Secret key** (for `SUPABASE_SECRET_KEY`)

## Database Setup

### Step 1: Run the Complete Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `src/supabase/complete-schema.sql`
5. Run the query

This will create:

- All tables with proper relationships
- Indexes for performance
- Row Level Security (RLS) policies
- Helper functions
- Triggers for automatic timestamp updates
- Views for common queries

### Step 2: Verify Setup

Run the verification script:

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `src/supabase/setup-verification.sql`
3. Run the query to verify all tables, policies, and triggers are created

### Step 3: Create Initial Admin User

1. Use Supabase Auth to create a user (Dashboard → Authentication → Users → Add User)
2. After the user is created, run this SQL to set them as admin:

```sql
-- Replace 'admin@example.com' with your admin email
UPDATE "Users"
SET "RoleName" = 'admin'
WHERE "Email" = 'admin@example.com';
```

## Schema Overview

### Tables

| Table           | Description                           |
| --------------- | ------------------------------------- |
| `Role`          | User roles (admin, nurse, patient)    |
| `Users`         | User profiles linked to Supabase Auth |
| `Staff`         | Medical staff information             |
| `Patients`      | Patient information                   |
| `Appointment`   | Scheduled appointments                |
| `Diagnosis`     | Diagnosis lookup table                |
| `Treatment`     | Treatment lookup table                |
| `MedicalRecord` | Patient medical records               |
| `Notes`         | Consultation notes                    |
| `Notification`  | System notifications                  |
| `UserSessions`  | Active session tracking               |

### Views

| View                  | Description                                |
| --------------------- | ------------------------------------------ |
| `appointment_details` | Appointment with patient and staff names   |
| `patient_summary`     | Patient with record and appointment counts |

### Functions

| Function          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `get_user_role()` | Returns current user's role                    |
| `is_admin()`      | Returns true if current user is admin          |
| `is_staff()`      | Returns true if current user is admin or nurse |
| `is_patient()`    | Returns true if current user is patient        |

## Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:

- **Admins**: Full access to all data
- **Nurses**: Read/write access to patients, appointments, and medical records
- **Patients**: Read access to their own data only

## Frontend Integration

The frontend uses these files for Supabase integration:

- `src/config/supabaseConfig.js` - Supabase client configuration
- `src/services/supabaseService.js` - CRUD operations and services
- `src/composables/useSupabase.js` - Vue composable for Supabase operations
- `src/stores/auth.js` - Authentication state management

### Usage Examples

```javascript
// Import the supabase client
import { supabase } from "@/services/supabaseService";

// Or use the composable
import { useSupabase } from "@/composables/useSupabase";

const { patientOps, loading, error } = useSupabase();

// Fetch all patients
const patients = await patientOps.getAllPatients();
```

### Real-time Subscriptions

```javascript
import { realtimeService } from "@/services/supabaseService";

// Subscribe to patient changes
const subscription = realtimeService.subscribeToPatients((payload) => {
  console.log("Patient changed:", payload);
});

// Unsubscribe when done
realtimeService.unsubscribe(subscription);
```

## File Structure

```
src/supabase/
├── complete-schema.sql               # Complete database schema (run this for new setups)
├── migrate-treatment-diagnosis.sql   # Migration for Treatment/Diagnosis extended columns
├── migrate-notes.sql                 # Migration for Notes (Consultation Notes) extended columns
├── setup-verification.sql            # Verify setup and seed data
├── seed-auth-users.js                # Node.js script to seed test users
├── check-data.js                     # Script to check data in the database
└── README.md                         # This file
```

## Migrations

### Treatment & Diagnosis Extended Fields

If your database was created before the extended Treatment/Diagnosis features, run the migration:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `src/supabase/migrate-treatment-diagnosis.sql`
5. Run the query

This adds extended columns for:

- **Treatment**: `category`, `medications` (JSONB), `instructions`, `contraindications`, `sideEffects`, `status`
- **Diagnosis**: `category`, `symptoms`, `riskFactors`, `diagnosticCriteria`, `complications`, `status`

### Consultation Notes Extended Fields

If your database was created before the extended Consultation Notes features, run the migration:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `src/supabase/migrate-notes.sql`
5. Run the query

This adds extended columns for:

- **Notes**: `PatientName`, `StaffName`, `AppointmentID`, `Type`, `Subject`, `VitalSigns` (JSONB), `Assessment`, `Plan`, `FollowUp`, `Status`

## Security Notes

1. **Never expose the secret key (SUPABASE_SECRET_KEY)** to the client
2. RLS policies ensure data isolation between users
3. All passwords are handled by Supabase Auth (bcrypt hashed)
4. Session tokens are automatically refreshed
5. Use the helper functions (`is_admin()`, etc.) in custom policies

## Support

For issues with Supabase setup, check:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

SEED:
node src/supabase/seeders/seed.js
