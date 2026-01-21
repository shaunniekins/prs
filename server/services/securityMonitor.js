/**
 * Security Monitor Service
 * Monitors access patterns and implements security measures
 */

import { logSecurityEvent } from "./accessLogger.js";

// In-memory storage for IP blocking (in production, use Redis or database)
const blockedIPs = new Set();
const accessPatterns = new Map();

// Security thresholds
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const MONITOR_WINDOW = 10 * 60 * 1000; // 10 minutes

// Monitor access patterns for security threats
export const monitorAccessPattern = async (activity) => {
  try {
    const ip = activity.ipAddress;
    if (!ip || ip === "Unknown") return;

    const now = Date.now();
    const key = `${ip}-${activity.action}`;

    if (!accessPatterns.has(key)) {
      accessPatterns.set(key, []);
    }

    const patterns = accessPatterns.get(key);
    patterns.push({
      timestamp: now,
      action: activity.action,
      reason: activity.reason,
      userAgent: activity.userAgent,
      url: activity.url,
      method: activity.method,
    });

    // Clean old entries
    const recentPatterns = patterns.filter(
      (p) => now - p.timestamp < MONITOR_WINDOW
    );
    accessPatterns.set(key, recentPatterns);

    // Check for suspicious patterns
    if (recentPatterns.length >= MAX_FAILED_ATTEMPTS) {
      const failedAttempts = recentPatterns.filter(
        (p) => p.action === "access_denied" || p.action === "login_failed"
      );

      if (failedAttempts.length >= MAX_FAILED_ATTEMPTS) {
        // Block the IP
        blockIPAddress(
          ip,
          `Too many failed attempts: ${failedAttempts.length}`
        );

        // Log security event
        await logSecurityEvent({
          event: "ip_blocked",
          severity: "high",
          details: `IP ${ip} blocked due to ${failedAttempts.length} failed attempts`,
          ipAddress: ip,
        });
      }
    }

    // Check for brute force patterns
    const loginAttempts = recentPatterns.filter(
      (p) => p.action === "login_failed"
    );
    if (loginAttempts.length >= MAX_FAILED_ATTEMPTS) {
      await logSecurityEvent({
        event: "brute_force_attempt",
        severity: "medium",
        details: `Potential brute force attack from ${ip}: ${loginAttempts.length} failed logins`,
        ipAddress: ip,
      });
    }
  } catch (error) {
    console.error("Error in monitorAccessPattern:", error);
  }
};

// Check if IP is blocked
export const isIPBlocked = (ip) => {
  return blockedIPs.has(ip);
};

// Block an IP address
export const blockIPAddress = (ip, reason = "Security violation") => {
  blockedIPs.add(ip);

  // Auto-unblock after BLOCK_DURATION
  setTimeout(() => {
    blockedIPs.delete(ip);
  }, BLOCK_DURATION);
};

// Unblock an IP address manually
export const unblockIPAddress = (ip) => {
  blockedIPs.delete(ip);
};

// Get blocked IPs list
export const getBlockedIPs = () => {
  return Array.from(blockedIPs);
};

// Get access patterns for an IP
export const getAccessPatterns = (ip) => {
  const patterns = [];
  for (const [key, value] of accessPatterns.entries()) {
    if (key.startsWith(`${ip}-`)) {
      patterns.push(...value);
    }
  }
  return patterns;
};

// Clear old access patterns (cleanup function)
export const cleanupAccessPatterns = () => {
  const now = Date.now();
  for (const [key, patterns] of accessPatterns.entries()) {
    const recentPatterns = patterns.filter(
      (p) => now - p.timestamp < MONITOR_WINDOW
    );
    if (recentPatterns.length === 0) {
      accessPatterns.delete(key);
    } else {
      accessPatterns.set(key, recentPatterns);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupAccessPatterns, 5 * 60 * 1000);

export default {
  monitorAccessPattern,
  isIPBlocked,
  blockIPAddress,
  unblockIPAddress,
  getBlockedIPs,
  getAccessPatterns,
  cleanupAccessPatterns,
};
