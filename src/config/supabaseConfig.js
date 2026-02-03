/**
 * Supabase Configuration and Connection Management
 * Central configuration for Supabase client with connection verification
 *
 * Uses new Supabase API key format:
 * - Frontend: sb_publishable_xxx (publishable key)
 * - Backend: sb_secret_xxx (secret key)
 */

import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Validate Supabase configuration
 * @throws {Error} if configuration is invalid
 */
export const validateSupabaseConfig = () => {
  const errors = [];

  // Validate URL
  if (!supabaseUrl) {
    errors.push("VITE_SUPABASE_URL environment variable is not set");
  } else if (
    !supabaseUrl.includes("supabase.co") &&
    !supabaseUrl.includes("localhost")
  ) {
    console.warn(
      "⚠️ Supabase URL doesn't appear to be a standard Supabase URL",
    );
  }

  // Validate publishable key - support both new format and legacy anon key
  if (!supabaseKey) {
    errors.push(
      "VITE_SUPABASE_PUBLISHABLE_KEY environment variable is not set",
    );
  } else if (
    !supabaseKey.startsWith("sb_publishable_") &&
    !supabaseKey.startsWith("eyJ")
  ) {
    errors.push(
      "Invalid publishable key format. Should start with 'sb_publishable_' or 'eyJ'",
    );
  }

  if (errors.length > 0) {
    const errorMessage = `Supabase configuration errors:\n${errors.join("\n")}`;
    console.error("❌", errorMessage);
    throw new Error(errorMessage);
  }

  return true;
};

/**
 * Supabase client options
 */
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: window.localStorage,
    storageKey: "patient-record-system-auth",
  },
  global: {
    headers: {
      "x-application-name": "patient-record-system",
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: "public",
  },
};

/**
 * Clear invalid or expired auth tokens from storage
 */
const clearInvalidTokens = () => {
  try {
    const storageKey = "patient-record-system-auth";
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      const parsed = JSON.parse(storedData);
      const now = Math.floor(Date.now() / 1000);

      // Clear if token is clearly expired (more than 1 hour ago)
      if (parsed?.expires_at && parsed.expires_at < now - 3600) {
        console.log("🔄 Clearing expired auth token");
        localStorage.removeItem(storageKey);
      }
    }
  } catch (error) {
    console.warn("⚠️ Error checking stored auth tokens:", error);
    // Clear potentially corrupted data
    try {
      localStorage.removeItem("patient-record-system-auth");
    } catch (clearError) {
      console.warn("⚠️ Error clearing auth tokens:", clearError);
    }
  }
};

// Validate configuration on module load
validateSupabaseConfig();

// Clear invalid tokens before creating client
clearInvalidTokens();

/**
 * Supabase client instance
 * Uses publishable key (new) or anon key (legacy) based on availability
 */
export const supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);

/**
 * Check Supabase connection health
 * @returns {Promise<{connected: boolean, latency: number, error?: string}>}
 */
export const checkConnection = async () => {
  const startTime = Date.now();

  try {
    // Simple health check by querying the Role table (publicly readable)
    const { data, error } = await supabase
      .from("Role")
      .select("RoleName")
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        connected: false,
        latency,
        error: error.message,
      };
    }

    return {
      connected: true,
      latency,
      roles: data?.map((r) => r.RoleName) || [],
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
};

/**
 * Get current authenticated user with profile data
 * @returns {Promise<{user: object|null, profile: object|null, error?: string}>}
 */
export const getCurrentUserWithProfile = async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: null, error: authError?.message };
    }

    // Fetch user profile from Users table
    const { data: profile, error: profileError } = await supabase
      .from("Users")
      .select("*, Role:RoleName(*)")
      .eq("UserID", user.id)
      .single();

    if (profileError) {
      console.warn("⚠️ Could not fetch user profile:", profileError.message);
      return { user, profile: null, error: profileError.message };
    }

    return { user, profile, error: null };
  } catch (error) {
    console.error("❌ Error fetching user with profile:", error);
    return { user: null, profile: null, error: error.message };
  }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function (event, session) => void
 * @returns {Object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

/**
 * Database table names (for reference and type safety)
 */
export const TABLES = {
  ROLE: "Role",
  USERS: "Users",
  STAFF: "Staff",
  PATIENTS: "Patients",
  APPOINTMENT: "Appointment",
  DIAGNOSIS: "Diagnosis",
  TREATMENT: "Treatment",
  MEDICAL_RECORD: "MedicalRecord",
  NOTES: "Notes",
  NOTIFICATION: "Notification",
  USER_SESSIONS: "UserSessions",
};

/**
 * Database views (for reference)
 */
export const VIEWS = {
  APPOINTMENT_DETAILS: "appointment_details",
  PATIENT_SUMMARY: "patient_summary",
};

/**
 * User roles (lowercase, matching database)
 */
export const ROLES = {
  ADMIN: "admin",
  NURSE: "nurse",
  PATIENT: "patient",
};

/**
 * Appointment statuses
 */
export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
};

/**
 * Medical record statuses
 */
export const RECORD_STATUS = {
  DRAFT: "Draft",
  FINALIZED: "Finalized",
  AMENDED: "Amended",
};

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  APPOINTMENT: "appointment",
  RECORD: "record",
};

export default supabase;
