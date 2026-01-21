/**
 * Access Logger Service
 * Handles logging of access activities for security and audit purposes
 */

import { supabase } from "./supabaseService.js";

// Log access activity
export const logAccessActivity = async (activity) => {
  try {
    const logEntry = {
      action: activity.action,
      reason: activity.reason || null,
      userEmail: activity.userEmail || null,
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null,
      url: activity.url || null,
      method: activity.method || null,
      sessionId: activity.sessionId || null,
      persistent: activity.persistent || false,
      critical: activity.critical || false,
      timestamp: new Date().toISOString(),
    };

    // Insert into AccessLogs table (assuming it exists)
    const { error } = await supabase.from("AccessLogs").insert(logEntry);

    if (error) {
      console.error("Failed to log access activity:", error);
    }
  } catch (error) {
    console.error("Error in logAccessActivity:", error);
  }
};

// Log security events
export const logSecurityEvent = async (event) => {
  try {
    const logEntry = {
      event: event.event,
      severity: event.severity || "info",
      details: event.details || null,
      userEmail: event.userEmail || null,
      ipAddress: event.ipAddress || null,
      timestamp: new Date().toISOString(),
    };

    // Insert into SecurityLogs table (assuming it exists)
    const { error } = await supabase.from("SecurityLogs").insert(logEntry);

    if (error) {
      console.error("Failed to log security event:", error);
    }
  } catch (error) {
    console.error("Error in logSecurityEvent:", error);
  }
};

export default {
  logAccessActivity,
  logSecurityEvent,
};
