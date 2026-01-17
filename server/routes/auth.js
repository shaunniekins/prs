/**
 * Authentication Routes
 * Handles login, logout, and authentication-related endpoints
 */

import express from "express";
import jwt from "jsonwebtoken";
import {
  auth,
  csrfProtection,
  securityHeaders,
  handleLogout,
} from "../middleware/auth.js";
import { logAccessActivity } from "../services/accessLogger.js";
import { userService, supabase } from "../services/supabaseService.js";

const router = express.Router();

// Apply security headers to all auth routes
router.use(securityHeaders);

// Generate JWT token for persistent sessions
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId || Date.now().toString(),
      persistent: true, // Mark as persistent session token
      issuedAt: Date.now(),
    },
    process.env.JWT_SECRET || "fallback-secret",
    {
      expiresIn: "24h", // Reasonable expiration for security
      issuer: "patient-record-system",
      audience: "patient-record-users",
    },
  );
};

// Generate CSRF token for session
import crypto from "crypto";

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Login endpoint
router.post("/login", async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || "Unknown";
  const userAgent = req.get("User-Agent") || "Unknown";

  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      // Log failed login attempt - missing credentials
      await logAccessActivity({
        action: "login_failed",
        reason: "missing_credentials",
        userEmail: email || "unknown",
        ipAddress: clientIP,
        userAgent: userAgent,
        url: req.originalUrl,
        method: req.method,
        critical: true,
      });

      return res.status(400).json({
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Authenticate with Supabase
    const { data, error } = await userService.authenticateUser(email, password);

    if (error || !data.user) {
      // Log failed login attempt - invalid credentials
      await logAccessActivity({
        action: "login_failed",
        reason: "invalid_credentials",
        userEmail: email,
        ipAddress: clientIP,
        userAgent: userAgent,
        url: req.originalUrl,
        method: req.method,
        critical: true,
      });

      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("Users")
      .select("*, Role(RoleName)")
      .eq("Email", data.user.email)
      .single();

    if (profileError) {
      console.error("❌ Error fetching user profile:", profileError);
      console.error("❌ Profile error details:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      // Continue with basic user info if profile fetch fails
    }

    const user = {
      id: profile?.UserID || data.user.id,
      email: data.user.email,
      role: profile?.Role?.RoleName || "patient",
      sessionId: data.session.id || Date.now().toString(),
    };

    const token = generateToken(user);
    const csrfToken = generateCSRFToken();

    // Store CSRF token
    const { storeCSRFToken } = await import("../middleware/auth.js");
    storeCSRFToken(user.sessionId, csrfToken);

    // Log successful persistent session login
    await logAccessActivity({
      action: "login_success",
      userEmail: email,
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      sessionId: user.sessionId,
      persistent: true,
      critical: true,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        token,
        csrfToken,
        expiresIn: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        persistent: true,
      },
    });
  } catch (error) {
    // Log login error
    await logAccessActivity({
      action: "login_error",
      reason: error.message,
      userEmail: req.body?.email || "unknown",
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      critical: true,
    });

    res.status(500).json({
      message: "Login failed",
      code: "LOGIN_FAILED",
    });
  }
});

// Logout endpoint
router.post("/logout", auth, handleLogout);

// Token refresh endpoint (modified for persistent sessions)
router.post("/refresh", auth, async (req, res) => {
  try {
    const oldToken = req.header("x-auth-token");

    // Generate new token with indefinite expiration
    const newToken = generateToken(req.user);
    const csrfToken = generateCSRFToken();

    // Store new CSRF token
    const { storeCSRFToken } = await import("../middleware/auth.js");
    storeCSRFToken(req.user.sessionId, csrfToken);

    // Blacklist old token
    const { blacklistToken } = await import("../middleware/auth.js");
    if (oldToken) {
      blacklistToken(oldToken);
    }

    // Enhanced response for persistent sessions
    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newToken,
        csrfToken,
        expiresIn: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        persistent: true,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Token refresh failed",
      code: "TOKEN_REFRESH_FAILED",
    });
  }
});

// Verify token endpoint
router.get("/verify", auth, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    data: {
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

// Get CSRF token for session
router.get("/csrf-token", auth, (req, res) => {
  try {
    const sessionId = req.user.sessionId;
    const { validateCSRFToken } = require("../middleware/auth.js");

    // Check if session already has a CSRF token
    const existingToken = validateCSRFToken(sessionId, "dummy");

    if (existingToken) {
      return res.json({
        success: true,
        csrfToken: existingToken,
      });
    }

    // Generate new CSRF token
    const csrfToken = generateCSRFToken();
    const { storeCSRFToken } = require("../middleware/auth.js");
    storeCSRFToken(sessionId, csrfToken);

    res.json({
      success: true,
      csrfToken,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate CSRF token",
      code: "CSRF_TOKEN_ERROR",
    });
  }
});

export default router;
