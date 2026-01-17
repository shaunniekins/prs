import express from "express";
import { staffService, userService } from "../services/supabaseService.js";

const router = express.Router();

// Get all staff (with auth info including last_sign_in_at)
router.get("/", async (req, res) => {
  try {
    console.log("📡 [Server /api/staff] Fetching staff with auth info...");
    // Use the new method that includes auth info
    const { data, error } = await staffService.getAllStaffWithAuthInfo();
    console.log("📊 [Server /api/staff] Result:", data?.length || 0, "records");
    if (error) {
      console.error("❌ [Server /api/staff] Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    console.log("✅ [Server /api/staff] Sending response...");
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ [Server /api/staff] Catch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get staff by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await staffService.getStaffById(req.params.id);

    if (error) {
      console.error("Error fetching staff:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new staff
router.post("/", async (req, res) => {
  try {
    const { user, firstName, surname, suffix, contactNumber } = req.body;

    // Create user first if provided
    let userRecord = null;
    if (user) {
      // Get roles to find the appropriate role ID
      const { data: roles, error: rolesError } = await userService.getRoles();
      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        return res.status(500).json({ message: "Error fetching roles" });
      }

      const role = roles.find((r) => r.RoleName === (user.role || "nurse"));

      if (!role) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Create user profile in Users table
      const { data: newUser, error: userError } =
        await userService.createUserProfile({
          UserID: user.UserID || `user-${Date.now()}`,
          fullName: `${firstName} ${surname}`,
          email: user.Email,
          RoleID: role.RoleID,
        });

      if (userError) {
        console.error("Error creating user:", userError);
        return res.status(500).json({ message: "Error creating user" });
      }

      userRecord = newUser;
    }

    // Create staff record
    const { data: newStaff, error: staffError } =
      await staffService.createStaff({
        UserID: userRecord ? userRecord.UserID : req.body.UserID,
        FirstName: firstName,
        Surname: surname,
        Suffix: suffix,
        ContactNumber: contactNumber,
      });

    if (staffError) {
      console.error("Error creating staff:", staffError);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(newStaff);
  } catch (error) {
    console.error("Error creating staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update staff
router.put("/:id", async (req, res) => {
  try {
    const { user, firstName, surname, suffix, contactNumber } = req.body;

    // Update user if provided
    if (user) {
      const { data: staff, error: fetchError } =
        await staffService.getStaffById(req.params.id);
      if (fetchError) {
        console.error("Error fetching staff:", fetchError);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (staff && staff.UserID) {
        await userService.updateUserProfile(staff.UserID, user);
      }
    }

    // Update staff
    const { data: updatedStaff, error: updateError } =
      await staffService.updateStaff(req.params.id, {
        FirstName: firstName,
        Surname: surname,
        Suffix: suffix,
        ContactNumber: contactNumber,
      });

    if (updateError) {
      console.error("Error updating staff:", updateError);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete staff
router.delete("/:id", async (req, res) => {
  try {
    const { data: staff, error: fetchError } = await staffService.getStaffById(
      req.params.id
    );
    if (fetchError) {
      console.error("Error fetching staff:", fetchError);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Delete associated user if exists
    if (staff.UserID) {
      await userService.deleteUser(staff.UserID);
    }

    // Delete staff
    const { error: deleteError } = await staffService.deleteStaff(
      req.params.id
    );

    if (deleteError) {
      console.error("Error deleting staff:", deleteError);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
