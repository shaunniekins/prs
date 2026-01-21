/**
 * Users Seeder
 * Seeds auth users, Users table, Staff table, and Patients table
 * Run with: node src/supabase/seeders/seedUsers.js
 */

import { supabase, DEFAULT_PASSWORD } from "./config.js";

// Users to seed
export const usersToSeed = [
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

/**
 * Seeds a single user including auth, Users table, and Staff/Patient table
 */
export async function seedUser(userData) {
  const { email, password, username, fullName, role, staffData, patientData } =
    userData;

  console.log(`\n📧 Processing: ${email}`);

  try {
    // Step 1: Check if user already exists in Users table
    const { data: existingUsers } = await supabase
      .from("Users")
      .select("UserID, Email")
      .eq("Email", email);

    if (existingUsers && existingUsers.length > 0) {
      console.log(
        `   ℹ️ User exists in public.Users, will update details and links...`,
      );
    }

    // Step 2: Create auth user
    let authData;
    const { data: createAuthData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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
          authData = { user: existingAuthUser };
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    } else {
      authData = createAuthData;
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created/found: ${userId}`);

    // Step 3: Create/update Users table entry
    // Note: The trigger should create this automatically, but we upsert to ensure it exists
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
      },
    );

    if (userError) {
      console.error(`   ❌ Failed to create Users entry:`, userError.message);
      throw userError;
    }
    console.log(`   ✅ Users table entry created/updated`);

    // Step 4: Get RoleID
    const { data: roleData } = await supabase
      .from("Role")
      .select("RoleID")
      .eq("RoleName", role)
      .single();

    const roleId = roleData?.RoleID;

    // Step 5: Create Staff or Patient record
    if (staffData && (role === "admin" || role === "nurse")) {
      const result = await seedStaffMember(userId, roleId, staffData);
      if (!result.success) {
        console.error(`   ❌ Failed to manage Staff entry:`, result.error);
      }
    }

    if (patientData && role === "patient") {
      const result = await seedPatientMember(userId, patientData);
      if (result.success) {
        // Link patient to user
        await supabase
          .from("Users")
          .update({ PatientID: result.patientId })
          .eq("UserID", userId);
        console.log(`   ✅ Patient linked to user`);
        return { success: true, email, userId, patientId: result.patientId };
      } else {
        console.error(`   ❌ Failed to manage Patients entry:`, result.error);
      }
    }

    return { success: true, email, userId };
  } catch (error) {
    console.error(`   ❌ Error seeding ${email}:`, error.message);
    return { success: false, email, error: error.message };
  }
}

/**
 * Seeds or updates a staff member
 */
async function seedStaffMember(userId, roleId, staffData) {
  try {
    // Check if staff record already exists for this user
    const { data: existingStaff } = await supabase
      .from("Staff")
      .select("StaffID")
      .eq("UserID", userId)
      .maybeSingle();

    let result;

    if (existingStaff) {
      console.log(`   🔄 Updating existing Staff record...`);
      result = await supabase
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
      result = await supabase
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

    const { data: staff, error: staffError } = result;

    if (staffError) {
      return { success: false, error: staffError.message };
    }

    console.log(`   ✅ Staff record managed: ${staff.StaffID}`);
    return { success: true, staffId: staff.StaffID };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Seeds or updates a patient member
 */
async function seedPatientMember(userId, patientData) {
  try {
    // Check if patient record already exists for this user
    const { data: existingPatient } = await supabase
      .from("Patients")
      .select("PatientID")
      .eq("UserID", userId)
      .maybeSingle();

    let result;

    if (existingPatient) {
      console.log(`   🔄 Updating existing Patient record...`);
      result = await supabase
        .from("Patients")
        .update({
          ...patientData,
        })
        .eq("PatientID", existingPatient.PatientID)
        .select()
        .single();
    } else {
      console.log(`   ➕ Creating new Patient record...`);
      result = await supabase
        .from("Patients")
        .insert({
          UserID: userId,
          ...patientData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    const { data: patient, error: patientError } = result;

    if (patientError) {
      return { success: false, error: patientError.message };
    }

    console.log(`   ✅ Patient record managed: ${patient.PatientID}`);
    return { success: true, patientId: patient.PatientID };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Seeds all users
 */
export async function seedAllUsers() {
  console.log("\n👥 Seeding Users...");

  const results = [];

  for (const user of usersToSeed) {
    const result = await seedUser(user);
    results.push(result);
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n📊 Users Seeding Summary:`);
  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed users:`);
    for (const f of failed) {
      console.log(`   - ${f.email}: ${f.error}`);
    }
  }

  return results;
}

// Run standalone if called directly
const isMainModule = process.argv[1]?.endsWith("seedUsers.js");
if (isMainModule) {
  seedAllUsers()
    .then((results) => {
      console.log("\n📋 Test Credentials:");
      console.log("-".repeat(50));
      for (const user of usersToSeed) {
        console.log(
          `   ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | ${DEFAULT_PASSWORD}`,
        );
      }
      console.log("\n✨ Users seeding completed!");
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
