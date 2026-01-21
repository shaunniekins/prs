// Enhanced Authentication middleware with security features
import jwt from "jsonwebtoken";
import { logAccessActivity } from "../services/accessLogger.js";
import {
  monitorAccessPattern,
  isIPBlocked,
  blockIPAddress,
} from "../services/securityMonitor.js";

// Token blacklist storage (in production, use Redis or database)
const tokenBlacklist = new Set();
const revokedTokens = new Set();

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map();

const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");
  const clientIP = req.ip || req.connection.remoteAddress || "Unknown";
  const userAgent = req.get("User-Agent") || "Unknown";

  // Check if IP is blocked for security reasons
  if (isIPBlocked(clientIP)) {
    // Log blocked IP access attempt
    await logAccessActivity({
      action: "access_denied",
      reason: "ip_blocked",
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      critical: true,
    });

    return res.status(403).json({
      message: "Access denied: IP address is blocked",
      code: "IP_BLOCKED",
    });
  }

  // Check if no token
  if (!token) {
    // Log access attempt without token
    await logAccessActivity({
      action: "access_denied",
      reason: "no_token",
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      critical: true,
    });

    // Monitor access pattern for security
    await monitorAccessPattern({
      action: "access_denied",
      reason: "no_token",
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(401).json({
      message: "No token, authorization denied",
      code: "NO_TOKEN",
    });
  }

  // Check if token is blacklisted
  if (tokenBlacklist.has(token) || revokedTokens.has(token)) {
    // Log revoked token access attempt
    await logAccessActivity({
      action: "access_denied",
      reason: "token_revoked",
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      critical: true,
    });

    return res.status(401).json({
      message: "Token has been revoked",
      code: "TOKEN_REVOKED",
    });
  }

  try {
    // Verify JWT token with proper secret
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );

    // Check token expiration for all tokens (including persistent ones)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      // Log token expiration
      await logAccessActivity({
        action: "token_expired",
        userEmail: decoded.email,
        ipAddress: clientIP,
        userAgent: userAgent,
        url: req.originalUrl,
        method: req.method,
        critical: true,
      });

      return res.status(401).json({
        message: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    // Log successful authentication for persistent session
    await logAccessActivity({
      action: "authenticated_access",
      userEmail: decoded.email,
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      sessionId: decoded.sessionId,
      persistent: decoded.persistent || false,
    });

    // Monitor access pattern for security
    await monitorAccessPattern({
      action: "authenticated_access",
      userEmail: decoded.email,
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      sessionId: decoded.sessionId,
      persistent: decoded.persistent || false,
    });

    next();
  } catch (err) {
    // Log token verification failure
    await logAccessActivity({
      action: "invalid_token",
      reason: err.name,
      ipAddress: clientIP,
      userAgent: userAgent,
      url: req.originalUrl,
      method: req.method,
      critical: true,
    });

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Token is not valid",
        code: "INVALID_TOKEN",
      });
    } else if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    } else {
      console.error("Token verification error:", err);
      return res.status(401).json({
        message: "Token verification failed",
        code: "TOKEN_VERIFICATION_FAILED",
      });
    }
  }
};

// Token management functions
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Auto-remove from blacklist after 24 hours
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000);
};

const revokeToken = (token) => {
  revokedTokens.add(token);
  // Revoked tokens stay revoked until server restart (or persistent storage)
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token) || revokedTokens.has(token);
};

const generateCSRFToken = () => {
  return require("crypto").randomBytes(32).toString("hex");
};

const storeCSRFToken = (sessionId, token) => {
  // For production, consider using Redis or database storage
  // For now, we'll use in-memory storage with proper expiration
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours for security
    persistent: true,
  });

  // Set up cleanup after expiration
  setTimeout(() => {
    csrfTokens.delete(sessionId);
  }, 24 * 60 * 60 * 1000);
};

const validateCSRFToken = (sessionId, token) => {
  const stored = csrfTokens.get(sessionId);
  if (!stored) {
    return false;
  }

  // Check if token has expired
  if (Date.now() > stored.expires) {
    csrfTokens.delete(sessionId);
    return false;
  }

  const isValid = stored.token === token;

  return isValid;
};

// Enhanced role-based authorization middleware
const authorize = (roles = []) => {
  // roles param can be a single role string (e.g., 'admin')
  // or an array of roles (e.g., ['admin', 'nurse'])
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Get user role from token
    const userRole = req.user.role || "patient";

    // Check if user's role is authorized
    if (roles.length && !roles.includes(userRole)) {
      return res.status(403).json({
        message: "Forbidden: insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        required: roles,
        current: userRole,
      });
    }

    // Authentication and authorization successful
    next();
  };
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const sessionId = req.user?.sessionId || req.sessionID;
  const csrfToken = req.header("x-csrf-token") || req.body._csrf;

  if (!sessionId || !csrfToken) {
    return res.status(403).json({
      message: "CSRF token required",
      code: "CSRF_TOKEN_REQUIRED",
    });
  }

  if (!validateCSRFToken(sessionId, csrfToken)) {
    return res.status(403).json({
      message: "Invalid CSRF token",
      code: "INVALID_CSRF_TOKEN",
    });
  }

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (basic)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com"
  );

  next();
};

// Logout endpoint handler
const handleLogout = async (req, res) => {
  try {
    const token = req.header("x-auth-token");
    const sessionId = req.user?.sessionId;

    if (token) {
      // Blacklist the current token
      blacklistToken(token);
    }

    if (sessionId) {
      // Clear CSRF token
      csrfTokens.delete(sessionId);

      // In a real application, you would also:
      // - Clear server-side session
      // - Invalidate refresh tokens
      // - Log the logout event
      // - Update user's last logout time
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed",
      code: "LOGOUT_FAILED",
    });
  }
};

export {
  auth,
  authorize,
  csrfProtection,
  securityHeaders,
  handleLogout,
  blacklistToken,
  revokeToken,
  isTokenBlacklisted,
  generateCSRFToken,
  storeCSRFToken,
  validateCSRFToken,
};
