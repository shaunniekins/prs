import express from "express";
import {
  userService,
  supabase,
  supabaseAdmin,
} from "../services/supabaseService.js";

const router = express.Router();

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

    // Note: The database trigger 'handle_new_user_in_public_users' automatically
    // creates the Users table entry, so we skip manual user profile creation.

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
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
