/**
 * Seeder Configuration
 * Shared configuration for all seed files
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  console.error("❌ SUPABASE_URL environment variable is not set");
  process.exit(1);
}

if (!supabaseSecretKey) {
  console.error("❌ SUPABASE_SECRET_KEY environment variable is not set");
  process.exit(1);
}

if (!supabaseSecretKey.startsWith("sb_secret_")) {
  console.error(
    "❌ Invalid SUPABASE_SECRET_KEY format. Should start with 'sb_secret_'",
  );
  process.exit(1);
}

// Create Supabase admin client with secret key
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const SUPABASE_URL = supabaseUrl;

// Default password for all seeded users
export const DEFAULT_PASSWORD = "Test@123456";

export default {
  supabase,
  SUPABASE_URL,
  DEFAULT_PASSWORD,
};
