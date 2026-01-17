import express from "express";
import { userService, supabase } from "../services/supabaseService.js";

const router = express.Router();

// GET /api/admin/account-creation-history
router.get("/account-creation-history", async (req, res) => {
  try {
    const { data: users, error } = await supabase.from("Users").select(`
        UserID,
        Username,
        Email,
        RoleName,
        fullName,
        created_at,
        Patients!fk_users_patientid ( UserID, FirstName, Surname ),
        Staff ( UserID, FirstName, Surname )
      `);

    if (error) {
      throw error;
    }

    const accountHistory = users.map((user) => {
      const isPatient = user.RoleName === "patient";
      const profile = isPatient ? user.Patients[0] : user.Staff[0];
      return {
        id: user.UserID,
        type: isPatient ? "patient" : "staff",
        name: user.fullName,
        firstName: profile?.FirstName || "",
        surname: profile?.Surname || "",
        username: user.Username,
        email: user.Email,
        role: user.RoleName,
        status: "active", // Assuming all fetched accounts are active
        createdAt: user.created_at,
        credentialsSent: false, // This information is not stored in the DB
        lastLogin: null, // This information is not available
      };
    });

    res.status(200).json(accountHistory);
  } catch (error) {
    console.error("Error fetching account creation history:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const { data: authData, error: authError } = await userService.signUpUser(
      email,
      password,
      {
        firstName,
        lastName,
        role,
      }
    );

    if (authError) {
      console.error("Supabase Auth Error:", authError);
      return res.status(500).json({ message: authError.message });
    }

    const userId = authData.user.id;

    // 3. Save account information to public.Users table
    const { data: userProfile, error: userProfileError } =
      await userService.createUserProfile({
        UserID: userId,
        Username: username,
        Email: email,
        RoleName: role.toLowerCase(),
        fullName: `${firstName} ${lastName}`,
        // Add other user-related fields as needed
      });

    if (userProfileError) {
      console.error("Supabase User Profile Error:", userProfileError);
      // Attempt to rollback Supabase Auth user creation if user profile creation fails
      await userService.deleteUser(userId); // This might require service role key
      return res.status(500).json({ message: userProfileError.message });
    }

    // 4. Save account information to public.Patients or public.Staff table
    if (role === "Patient") {
      const { data: patientData, error: patientError } =
        await userService.createPatientProfile({
          UserID: userId,
          FirstName: firstName,
          Surname: lastName,
          BirthDate: birthdate,
          Gender: gender,
          ContactNumber: contactNumber,
          Address: address,
          EmergencyContact: emergencyContactNumber,
        });

      if (patientError) {
        console.error("Supabase Patient Profile Error:", patientError);
        await userService.deleteUser(userId);
        await userService.deleteUserProfile(userId);
        return res.status(500).json({ message: patientError.message });
      }
    } else if (["Staff", "Nurse", "Admin"].includes(role)) {
      const { data: staffData, error: staffError } =
        await userService.createStaffProfile({
          UserID: userId,
          FirstName: firstName,
          Surname: lastName,
          ContactNumber: contactNumber,
          Address: address,
          Gender: gender,
          EmergencyContact: emergencyContactNumber,
          // Note: Department and Specialty fields not in schema
        });

      if (staffError) {
        console.error("Supabase Staff Profile Error:", staffError);
        await userService.deleteUser(userId);
        await userService.deleteUserProfile(userId);
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
