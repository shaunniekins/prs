import express from "express";
import {
  userService,
  supabase,
  supabaseAdmin,
} from "../services/supabaseService.js";

const router = express.Router();

// Helper function to wait for the Users record to be created by the database trigger
// This is necessary because the trigger runs asynchronously after auth.users insert
// If the trigger fails, this function will create the Users record manually as a fallback
const waitForUserRecord = async (
  userId,
  userMetadata = {},
  maxRetries = 10,
  delayMs = 200,
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("Users")
      .select("UserID")
      .eq("UserID", userId)
      .single();

    if (data && !error) {
      // console.log(`✅ Users record found on attempt ${attempt}`);
      return { success: true };
    }

    if (attempt < maxRetries) {
      // console.log(
      //   `⏳ Waiting for Users record (attempt ${attempt}/${maxRetries})...`,
      // );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Trigger failed to create the record - create it manually as a fallback
  // console.warn(
  //   `⚠️ Users record not found after ${maxRetries} attempts, creating manually...`,
  // );

  try {
    const { email, username, fullName, role } = userMetadata;
    const { data: manualData, error: manualError } = await supabaseAdmin
      .from("Users")
      .insert([
        {
          UserID: userId,
          Email: email,
          Username: username || email?.split("@")[0],
          fullName: fullName,
          RoleName: role?.toLowerCase() || "patient",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (manualError) {
      // Check if it's a duplicate error (record was created by trigger but we missed it)
      if (manualError.code === "23505") {
        // console.log("✅ Users record already exists (created by trigger)");
        return { success: true };
      }
      // console.error("❌ Manual Users record creation failed:", manualError);
      return { success: false, error: manualError.message };
    }

    console.log("✅ Users record created manually");
    return { success: true };
  } catch (err) {
    // console.error("❌ Exception during manual Users record creation:", err);
    return { success: false, error: err.message };
  }
};

// GET /api/admin/account-creation-history
router.get("/account-creation-history", async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin.from("Users").select(`
        UserID,
        Username,
        Email,
        RoleName,
        fullName,
        created_at,
        Patients:Patients!Patients_UserID_fkey ( UserID, FirstName, Surname ),
        Staff ( UserID, FirstName, Surname )
      `);

    if (error) {
      throw error;
    }

    // Fetch auth users to get last login info
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching auth users:", authError);
    }

    const authMap = new Map();
    if (authUsers) {
      authUsers.forEach((u) => authMap.set(u.id, u));
    }

    const accountHistory = users.map((user) => {
      const isPatient = user.RoleName === "patient";
      const profile = isPatient ? user.Patients?.[0] : user.Staff?.[0]; // Safe access using array result
      const authUser = authMap.get(user.UserID);

      return {
        id: user.UserID,
        type: isPatient ? "patient" : "staff",
        name: user.fullName,
        firstName: profile?.FirstName || "",
        surname: profile?.Surname || "",
        username: user.Username,
        email: user.Email,
        role: user.RoleName,
        status: "Active", // Assuming all fetched accounts are active
        createdAt: user.created_at,
        credentialsSent: "Email", // User requested specific placeholder
        lastLogin: authUser?.last_sign_in_at || null,
      };
    });

    res.status(200).json(accountHistory);
  } catch (error) {
    console.error("Error fetching account creation history:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
      details: error,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      username,
      email,
      role,
      password,
      firstName,
      lastName,
      suffix,
      gender,
      contactNumber,
      address,
      emergencyContactNumber,
      birthdate,
      department, // For Staff only
      specialty, // For Staff only
    } = req.body;

    // 1. Input Validation
    if (!username || !email || !role || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // 2. Register user in Supabase Auth
    // IMPORTANT: The database trigger 'handle_new_user_in_public_users' expects
    // specific metadata fields: 'username', 'fullName', and 'role'
    const fullName = `${firstName} ${lastName}`;
    const { data: authData, error: authError } = await userService.signUpUser(
      email,
      password,
      {
        username, // Required by database trigger
        fullName, // Required by database trigger
        role: role.toLowerCase(), // Required by database trigger (lowercase for consistency)
        firstName, // Additional data for reference
        lastName, // Additional data for reference
      },
    );

    if (authError) {
      console.error("Supabase Auth Error:", authError);
      return res.status(500).json({ message: authError.message });
    }

    const userId = authData.user.id;

    // Wait for the database trigger to create the Users record
    // This is necessary because the trigger runs after auth.users insert
    // and we need the Users record to exist before creating Patients/Staff (FK constraint)
    // If the trigger fails, the function will create the record manually
    const { success: userRecordExists, error: waitError } =
      await waitForUserRecord(userId, {
        email,
        username,
        fullName,
        role: role.toLowerCase(),
      });

    if (!userRecordExists) {
      console.error("Users record creation failed or timed out:", waitError);
      // Rollback: delete the auth user
      await userService.deleteUser(userId);
      return res.status(500).json({
        message:
          "Database error creating new user. The Users record was not created. Please try again.",
      });
    }

    // 3. Save account information to public.Patients or public.Staff table
    const roleLower = role.toLowerCase();

    if (roleLower === "patient") {
      const { data: patientData, error: patientError } =
        await userService.createPatientProfile({
          UserID: userId,
          FirstName: firstName,
          Surname: lastName,
          Suffix: suffix || null,
          BirthDate: birthdate,
          Gender: gender,
          ContactNumber: contactNumber,
          Address: address,
          EmergencyContact: emergencyContactNumber,
          IsActive: true,
        });

      if (patientError) {
        console.error("Supabase Patient Profile Error:", patientError);
        // Rollback: delete the auth user (this will cascade delete Users entry)
        await userService.deleteUser(userId);
        return res.status(500).json({ message: patientError.message });
      }
    } else if (["nurse", "admin"].includes(roleLower)) {
      // Get RoleID for the staff role
      const { data: roleData, error: roleError } = await supabase
        .from("Role")
        .select("RoleID")
        .eq("RoleName", roleLower)
        .single();

      if (roleError) {
        console.error("Error fetching RoleID:", roleError);
        // Rollback: delete the auth user
        await userService.deleteUser(userId);
        return res
          .status(500)
          .json({ message: "Failed to find role: " + roleLower });
      }

      const { data: staffData, error: staffError } =
        await userService.createStaffProfile({
          UserID: userId,
          RoleID: roleData?.RoleID,
          FirstName: firstName,
          Surname: lastName,
          Suffix: suffix || null,
          ContactNumber: contactNumber,
          IsActive: true,
        });

      if (staffError) {
        console.error("Supabase Staff Profile Error:", staffError);
        // Rollback: delete the auth user (this will cascade delete Users entry)
        await userService.deleteUser(userId);
        return res.status(500).json({ message: staffError.message });
      }
    }

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: userId,
        email,
        username,
        role,
        firstName,
        lastName,
        password, // Temporarily include for email sending, should be handled securely
      },
    });
  } catch (error) {
    console.error("Error creating account:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({
      message: error.message || "Internal server error",
      code: error.code,
      details: error.details,
    });
  }
});

// DELETE /api/admin/accounts/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Delete user from Supabase Auth and Users table
    const { error } = await userService.deleteUser(id);

    if (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: error.message });
    }

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
});

export default router;
