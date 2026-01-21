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

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const createAdminAccount = async () => {
  try {
    console.log("🚀 Creating admin account...");

    // First, check if admin user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from("Users")
      .select("*")
      .eq("Email", "admin@baankm3clinic.ph");

    if (checkError) {
      console.error("❌ Error checking existing users:", checkError);
      return false;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log("ℹ️ Admin user record already exists in Users table");
      console.log("🎉 Admin account setup completed successfully!");
      console.log("📧 Email: admin@baankm3clinic.ph");
      console.log("🔑 Password: adminbaan");
      console.log("👤 Role: admin");
      return true;
    }

    // Create admin user in Supabase Auth
    console.log("📧 Creating admin user in Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "admin@baankm3clinic.ph",
      password: "adminbaan",
      options: {
        data: {
          firstName: "System",
          surname: "Administrator",
        },
      },
    });

    if (authError) {
      if (authError.code === "user_already_exists") {
        console.log("ℹ️ Admin user already exists in Supabase Auth");
      } else {
        console.error("❌ Error creating admin user in auth:", authError);
        return false;
      }
    }

    if (!authData.user && !authError) {
      console.error("❌ No user data returned from auth signup");
      return false;
    }

    let userId;
    if (authData.user) {
      userId = authData.user.id;
      console.log("✅ Admin user created in Supabase Auth:", userId);
    } else {
      // User already exists, try to sign in to get the user ID
      console.log("📧 Signing in to get existing admin user ID...");
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: "admin@baankm3clinic.ph",
          password: "adminbaan",
        });

      if (signInError || !signInData.user) {
        console.error(
          "❌ Error signing in to existing admin user:",
          signInError
        );
        return false;
      }

      userId = signInData.user.id;
      console.log("✅ Found existing admin user:", userId);

      // Sign out immediately since we just needed the user ID
      await supabase.auth.signOut();
    }

    // Check if user record exists in Users table
    console.log("🔍 Checking if user record exists in Users table...");
    const { data: userRecord, error: userRecordError } = await supabase
      .from("Users")
      .select("*")
      .eq("Username", "admin")
      .single();

    if (userRecordError && userRecordError.code !== "PGRST116") {
      console.error("❌ Error checking user record:", userRecordError);
      return false;
    }

    if (userRecord) {
      console.log("✅ User record already exists in Users table");
    } else {
      console.log(
        "ℹ️ User record not found in Users table (schema differences may exist)"
      );
    }

    // Create user record in Users table if it doesn't exist
    console.log("🔍 Checking/creating user record in Users table...");
    const { data: newUserRecord, error: newUserRecordError } = await supabase
      .from("Users")
      .upsert(
        {
          UserID: userId,
          Email: "admin@baankm3clinic.ph",
          Username: "admin",
          CreatedAt: new Date().toISOString(),
        },
        {
          onConflict: "UserID",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (newUserRecordError) {
      console.error("❌ Error creating user record:", newUserRecordError);
      return false;
    }

    console.log("✅ User record created/updated in Users table");

    // Create role record in Role table if it doesn't exist
    console.log("🔍 Checking/creating admin role...");
    const { data: adminRoleRecord, error: adminRoleError } = await supabase
      .from("Role")
      .upsert(
        {
          RoleName: "admin",
        },
        {
          onConflict: "RoleName",
          ignoreDuplicates: true,
        }
      )
      .select()
      .single();

    if (adminRoleError) {
      console.error("❌ Error creating role record:", adminRoleError);
      return false;
    }

    console.log("✅ Admin role created/verified");

    // Update user record to link to admin role (RoleID = 1 for admin)
    console.log("🔗 Linking user to admin role...");
    const { error: updateUserRoleError } = await supabase
      .from("Users")
      .update({
        RoleID: 1,
      })
      .eq("UserID", userId);

    if (updateUserRoleError) {
      console.error("❌ Error linking user to role:", updateUserRoleError);
      return false;
    }

    console.log("✅ User linked to admin role successfully");
    console.log("\n🎉 Admin account created successfully!");
    console.log("📧 Email: admin@baankm3clinic.ph");
    console.log("🔑 Password: adminbaan");
    console.log("👤 Role: admin");
    console.log("🆔 User ID:", userId);

    return true;
  } catch (error) {
    console.error("💥 Error creating admin account:", error);
    return false;
  }
};

// Run the script
createAdminAccount()
  .then((success) => {
    if (success) {
      console.log("\n✅ Admin account creation completed successfully!");
    } else {
      console.log("\n❌ Admin account creation failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\n💥 Admin account creation error:", error);
    process.exit(1);
  });
