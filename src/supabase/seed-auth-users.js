/**
 * Auth Users Seeder Script
 * Run with: node src/supabase/seed-auth-users.js
 *
 * This script creates test users in Supabase Auth and links them to the database
 * Uses new Supabase API key format (sb_secret_xxx)
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Supabase configuration - new key format only
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
    "❌ Invalid SUPABASE_SECRET_KEY format. Should start with 'sb_secret_'"
  );
  process.exit(1);
}

console.log("🔑 Using secret key format");

// Create Supabase admin client with secret key
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Default password for all seeded users
const DEFAULT_PASSWORD = "Test@123456";

// Users to seed
const usersToSeed = [
  {
    email: "admin@clinic.com",
    password: DEFAULT_PASSWORD,
    username: "admin",
    fullName: "System Administrator",
    role: "admin",
    staffData: {
      FirstName: "System",
      Surname: "Administrator",
      ContactNumber: "+1234567890",
      Specialization: "Administration",
      IsActive: true,
    },
  },
  {
    email: "nurse@clinic.com",
    password: DEFAULT_PASSWORD,
    username: "nurse",
    fullName: "Jane Smith",
    role: "nurse",
    staffData: {
      FirstName: "Jane",
      Surname: "Smith",
      ContactNumber: "+1234567891",
      Specialization: "General Nursing",
      IsActive: true,
    },
  },
  {
    email: "nurse2@clinic.com",
    password: DEFAULT_PASSWORD,
    username: "nurse2",
    fullName: "Emily Johnson",
    role: "nurse",
    staffData: {
      FirstName: "Emily",
      Surname: "Johnson",
      ContactNumber: "+1234567894",
      Specialization: "Pediatric Nursing",
      IsActive: true,
    },
  },
  {
    email: "patient@example.com",
    password: DEFAULT_PASSWORD,
    username: "patient",
    fullName: "John Doe",
    role: "patient",
    patientData: {
      FirstName: "John",
      Surname: "Doe",
      Gender: "Male",
      BirthDate: "1990-01-15",
      ContactNumber: "+1234567892",
      Address: "123 Main Street, City",
      BloodType: "O+",
      IsActive: true,
    },
  },
  {
    email: "patient2@example.com",
    password: DEFAULT_PASSWORD,
    username: "patient2",
    fullName: "Maria Garcia",
    role: "patient",
    patientData: {
      FirstName: "Maria",
      Surname: "Garcia",
      Gender: "Female",
      BirthDate: "1985-06-20",
      ContactNumber: "+1234567893",
      Address: "456 Oak Avenue, Town",
      BloodType: "A+",
      IsActive: true,
    },
  },
];

async function seedUser(userData) {
  const { email, password, username, fullName, role, staffData, patientData } =
    userData;

  console.log(`\n📧 Processing: ${email}`);

  try {
    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabase
      .from("Users")
      .select("UserID, Email")
      .eq("Email", email);

    if (existingUsers && existingUsers.length > 0) {
      console.log(
        `   ℹ️ User exists in public.Users, will update details and links...`
      );
    }

    // Step 2: Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username,
          fullName,
          role,
        },
      });

    if (authError) {
      // Check if user already exists in auth
      if (authError.message.includes("already been registered")) {
        console.log(`   ⚠️ Auth user exists, fetching...`);

        // Get user by email
        const {
          data: { users },
        } = await supabase.auth.admin.listUsers();
        const existingAuthUser = users.find((u) => u.email === email);

        if (existingAuthUser) {
          authData.user = existingAuthUser;
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created/found: ${userId}`);

    // Step 3: Create/update Users table entry
    const { error: userError } = await supabase.from("Users").upsert(
      {
        UserID: userId,
        Email: email,
        Username: username,
        fullName: fullName,
        RoleName: role,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "UserID",
      }
    );

    if (userError) {
      console.error(`   ❌ Failed to create Users entry:`, userError.message);
      throw userError;
    }
    console.log(`   ✅ Users table entry created`);

    // Step 4: Get RoleID
    const { data: roleData } = await supabase
      .from("Role")
      .select("RoleID")
      .eq("RoleName", role)
      .single();

    const roleId = roleData?.RoleID;

    // Step 5: Create Staff or Patient record
    if (staffData && (role === "admin" || role === "nurse")) {
      // Check if staff record already exists for this user
      const { data: existingStaff } = await supabase
        .from("Staff")
        .select("StaffID")
        .eq("UserID", userId)
        .maybeSingle();

      let staffOp;

      if (existingStaff) {
        console.log(`   🔄 Updating existing Staff record...`);
        staffOp = await supabase
          .from("Staff")
          .update({
            RoleID: roleId,
            ...staffData,
          })
          .eq("StaffID", existingStaff.StaffID)
          .select()
          .single();
      } else {
        console.log(`   ➕ Creating new Staff record...`);
        staffOp = await supabase
          .from("Staff")
          .insert({
            UserID: userId,
            RoleID: roleId,
            ...staffData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
      }

      const { data: staff, error: staffError } = staffOp;

      if (staffError) {
        console.error(
          `   ❌ Failed to manage Staff entry:`,
          staffError.message
        );
      } else {
        console.log(`   ✅ Staff record managed: ${staff.StaffID}`);
      }
    }

    if (patientData && role === "patient") {
      // Check if patient record already exists for this user
      const { data: existingPatient } = await supabase
        .from("Patients")
        .select("PatientID")
        .eq("UserID", userId)
        .maybeSingle();

      let patientOp;

      if (existingPatient) {
        console.log(`   🔄 Updating existing Patient record...`);
        patientOp = await supabase
          .from("Patients")
          .update({
            ...patientData,
          })
          .eq("PatientID", existingPatient.PatientID)
          .select()
          .single();
      } else {
        console.log(`   ➕ Creating new Patient record...`);
        patientOp = await supabase
          .from("Patients")
          .insert({
            UserID: userId,
            ...patientData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
      }

      const { data: patient, error: patientError } = patientOp;

      if (patientError) {
        console.error(
          `   ❌ Failed to manage Patients entry:`,
          patientError.message
        );
      } else {
        console.log(`   ✅ Patient record managed: ${patient.PatientID}`);

        // Link patient to user
        await supabase
          .from("Users")
          .update({ PatientID: patient.PatientID })
          .eq("UserID", userId);
        console.log(`   ✅ Patient linked to user`);
      }
    }

    return { success: true, email, userId };
  } catch (error) {
    console.error(`   ❌ Error seeding ${email}:`, error.message);
    return { success: false, email, error: error.message };
  }
}

async function main() {
  console.log("🌱 Starting Auth Users Seeder...");
  console.log("=".repeat(50));
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Default password: ${DEFAULT_PASSWORD}`);
  console.log("=".repeat(50));

  // Ensure Roles exist before seeding users
  console.log("\n🛠  Ensuring Roles exist...");
  const { error: rolesError } = await supabase
    .from("Role")
    .upsert(
      [{ RoleName: "admin" }, { RoleName: "nurse" }, { RoleName: "patient" }],
      { onConflict: "RoleName" }
    );

  if (rolesError) {
    console.error("❌ Failed to insert roles:", rolesError.message);
  } else {
    console.log("✅ Roles ensured.");
  }

  const results = [];

  for (const user of usersToSeed) {
    const result = await seedUser(user);
    results.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Seeding Summary:");
  console.log("=".repeat(50));

  const successful = results.filter((r) => r.success && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => !r.success);

  console.log(`   ✅ Created: ${successful.length}`);
  console.log(`   ⚠️ Skipped: ${skipped.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);

  if (successful.length > 0 || skipped.length > 0) {
    console.log("\n📋 Test Credentials:");
    console.log("-".repeat(50));
    for (const user of usersToSeed) {
      console.log(
        `   ${user.role.padEnd(8)} | ${user.email.padEnd(
          25
        )} | ${DEFAULT_PASSWORD}`
      );
    }
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed users:");
    for (const f of failed) {
      console.log(`   - ${f.email}: ${f.error}`);
    }
  }

  console.log("\n✨ Done!");
}

main().catch(console.error);
