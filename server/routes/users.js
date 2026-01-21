import express from "express";
import { userService } from "../services/supabaseService.js";

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Authenticate with Supabase
    const { data, error } = await userService.authenticateUser(email, password);

    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Get user profile from Users table
    const { data: profile, error: profileError } =
      await userService.getUserProfile(data.user.id);

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return res.status(500).json({ message: "Error fetching user profile" });
    }

    // Return user data with JWT token
    const userData = {
      id: data.user.id,
      email: data.user.email,
      role: profile?.Role?.RoleName || "patient",
      fullName: profile?.fullName || data.user.user_metadata?.firstName || "",
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all users (admin only)
router.get("/", async (req, res) => {
  try {
    // TODO: Add admin authorization check using JWT token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: userData, error: userError } =
      await userService.getCurrentUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Check if user is admin
    const { data: profile } = await userService.getUserProfile(
      userData.user.id
    );
    if (profile?.Role?.RoleName !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all users
    const { data, error } = await userService.getAllUsers();

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    // Filter out sensitive information and admin users from response
    const safeUsers = data
      .filter((user) => user.Role?.RoleName !== "admin")
      .map(({ UserID, fullName, email, Role, created_at }) => ({
        id: UserID,
        fullName,
        email,
        role: Role?.RoleName,
        createdAt: created_at,
      }));

    res.status(200).json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  try {
    const { error } = await userService.signOut();

    if (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
