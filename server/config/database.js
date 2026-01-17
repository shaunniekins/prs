import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Supabase client with new key format
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

// Validate configuration
if (!supabaseUrl) {
  console.error("❌ SUPABASE_URL environment variable is not set");
  throw new Error("SUPABASE_URL is required");
}

if (!supabaseKey) {
  console.error("❌ SUPABASE_SECRET_KEY environment variable is not set");
  throw new Error("SUPABASE_SECRET_KEY is required");
}

if (!supabaseKey.startsWith("sb_secret_")) {
  console.error(
    "❌ Invalid SUPABASE_SECRET_KEY format. Should start with 'sb_secret_'",
  );
  throw new Error("Invalid SUPABASE_SECRET_KEY format");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Test the connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("Role")
      .select("count")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "table doesn't exist" error
      console.error("Supabase connection error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to connect to Supabase:", error);
    return false;
  }
};

// Helper function to handle Supabase responses
export const handleSupabaseResponse = (response) => {
  if (response.error) {
    // Enhanced error handling with more context
    const error = new Error(response.error.message);
    error.code = response.error.code;
    error.details = response.error.details;
    error.hint = response.error.hint;
    error.status = response.status;
    throw error;
  }
  return response.data;
};

// Initialize database tables if they don't exist
export const initializeTables = async () => {
  try {
    // Check if tables exist by trying to query them
    const { data, error } = await supabase
      .from("Role")
      .select("count")
      .limit(1);

    if (error && error.code === "PGRST116") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking tables:", error);
    return false;
  }
};

export default supabase;
