/**
 * Quick diagnostic script to check database contents
 * Run with: node src/supabase/check-data.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

console.log("🔍 Checking database contents...");
console.log("📍 Supabase URL:", supabaseUrl);

// Create admin client to bypass RLS
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkData() {
  console.log("\n" + "=".repeat(50));

  // Check Role table
  console.log("\n📋 Checking Role table...");
  const { data: roles, error: rolesError } = await supabase
    .from("Role")
    .select("*");

  if (rolesError) {
    console.error("  ❌ Error:", rolesError.message);
  } else {
    console.log("  ✅ Roles found:", roles?.length || 0);
    roles?.forEach((r) =>
      console.log(`     - ${r.RoleName} (ID: ${r.RoleID})`)
    );
  }

  // Check Users table
  console.log("\n👤 Checking Users table...");
  const { data: users, error: usersError } = await supabase
    .from("Users")
    .select("UserID, Email, RoleName, Username");

  if (usersError) {
    console.error("  ❌ Error:", usersError.message);
  } else {
    console.log("  ✅ Users found:", users?.length || 0);
    users?.forEach((u) => console.log(`     - ${u.Email} (${u.RoleName})`));
  }

  // Check Staff table
  console.log("\n👨‍⚕️ Checking Staff table...");
  const { data: staff, error: staffError } = await supabase
    .from("Staff")
    .select("StaffID, UserID, FirstName, Surname, IsActive");

  if (staffError) {
    console.error("  ❌ Error:", staffError.message);
  } else {
    console.log("  ✅ Staff found:", staff?.length || 0);
    staff?.forEach((s) =>
      console.log(`     - ${s.FirstName} ${s.Surname} (Active: ${s.IsActive})`)
    );
  }

  // Check Patients table
  console.log("\n🏥 Checking Patients table...");
  const { data: patients, error: patientsError } = await supabase
    .from("Patients")
    .select("PatientID, UserID, FirstName, Surname, IsActive");

  if (patientsError) {
    console.error("  ❌ Error:", patientsError.message);
  } else {
    console.log("  ✅ Patients found:", patients?.length || 0);
    patients?.forEach((p) =>
      console.log(`     - ${p.FirstName} ${p.Surname} (Active: ${p.IsActive})`)
    );
  }

  // Check auth.users count
  console.log("\n🔐 Checking auth.users...");
  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();
    if (authError) {
      console.error("  ❌ Error:", authError.message);
    } else {
      console.log("  ✅ Auth users found:", authData?.users?.length || 0);
      authData?.users?.forEach((u) =>
        console.log(`     - ${u.email} (ID: ${u.id.substring(0, 8)}...)`)
      );
    }
  } catch (err) {
    console.error("  ❌ Error:", err.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ Diagnostic complete!");
}

checkData().catch(console.error);
