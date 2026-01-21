/**
 * Enhanced notification service with Supabase integration
 * Handles real-time notifications, CRUD operations, and user preferences
 */

import { supabase } from "./supabaseService.js";
import { notificationUtils } from "../utils/notificationUtils.js";

/**
 * Notification service class
 */
export class NotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request notification permissions
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize notification service:", error);
    }
  }

  /**
   * Subscribe to real-time notifications for current user
   * @param {Function} callback - Callback function for new notifications
   * @returns {Object} Subscription object
   */
  subscribeToNotifications(callback) {
    const channel = supabase
      .channel("user_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
        },
        async (payload) => {
          // Only show notifications for current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && payload.new.UserID === user.id) {
            // Show browser notification if permitted
            this.showBrowserNotification(payload.new);

            // Call the callback
            if (callback) {
              callback(payload.new);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set("notifications", channel);
    return channel;
  }

  /**
   * Show browser notification for new notification
   * @param {Object} notification - Notification object
   */
  showBrowserNotification(notification) {
    if ("Notification" in window && Notification.permission === "granted") {
      const options = {
        body: notification.Message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `notification-${notification.NotificationID}`,
        requireInteraction: notification.Priority === "high",
        silent: notification.Priority === "low",
      };

      const browserNotification = new Notification(
        notification.Title || "New Notification",
        options
      );

      // Auto-close after 5 seconds unless high priority
      if (notification.Priority !== "high") {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }

      // Handle click events
      browserNotification.onclick = () => {
        this.handleNotificationClick(notification);
        browserNotification.close();
      };
    }
  }

  /**
   * Handle notification click events
   * @param {Object} notification - Notification object
   */
  handleNotificationClick(notification) {
    // Navigate based on notification type
    switch (notification.Type) {
      case "appointment_reminder":
        // Navigate to appointments page
        window.dispatchEvent(
          new CustomEvent("navigate", {
            detail: { route: "/patient/appointments" },
          })
        );
        break;
      case "medical_record":
        // Navigate to medical records page
        window.dispatchEvent(
          new CustomEvent("navigate", {
            detail: { route: "/patient/medical-records" },
          })
        );
        break;
      default:
      // Default action - could open notification center
    }
  }

  /**
   * Get notifications for current user
   * @param {Object} options - Query options
   * @returns {Promise} Notifications data
   */
  async getMyNotifications(options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    try {
      let query = supabase
        .from("Notification")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq("IsRead", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      notificationUtils.handleSupabaseError(error, "fetching notifications");
      return [];
    }
  }

  /**
   * Get all notifications (admin/staff only)
   * @param {Object} options - Query options
   * @returns {Promise} Notifications data
   */
  async getAllNotifications(options = {}) {
    const { limit = 50, offset = 0, userId = null } = options;

    try {
      let query = supabase
        .from("Notification")
        .select(
          `
          *,
          Users!inner(fullName, email)
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq("UserID", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      notificationUtils.handleSupabaseError(
        error,
        "fetching all notifications"
      );
      return [];
    }
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise} Created notification
   */
  async createNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from("Notification")
        .insert([
          {
            ...notificationData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Show success message
      notificationUtils.showSuccess("Notification sent successfully");

      return data;
    } catch (error) {
      notificationUtils.handleSupabaseError(error, "creating notification");
      return null;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from("Notification")
        .update({
          IsRead: true,
          updated_at: new Date().toISOString(),
        })
        .eq("NotificationID", notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      notificationUtils.handleSupabaseError(
        error,
        "marking notification as read"
      );
      return null;
    }
  }

  /**
   * Mark all notifications as read for current user
   * @returns {Promise} Success status
   */
  async markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("Notification")
        .update({
          IsRead: true,
          updated_at: new Date().toISOString(),
        })
        .eq("UserID", user.id)
        .eq("IsRead", false);

      if (error) throw error;

      notificationUtils.showSuccess("All notifications marked as read");
      return true;
    } catch (error) {
      notificationUtils.handleSupabaseError(
        error,
        "marking all notifications as read"
      );
      return false;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise} Success status
   */
  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from("Notification")
        .delete()
        .eq("NotificationID", notificationId);

      if (error) throw error;

      notificationUtils.showSuccess("Notification deleted");
      return true;
    } catch (error) {
      notificationUtils.handleSupabaseError(error, "deleting notification");
      return false;
    }
  }

  /**
   * Send appointment reminder notification
   * @param {string} appointmentId - Appointment ID
   * @param {string} patientId - Patient ID
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise} Created notification
   */
  async sendAppointmentReminder(appointmentId, patientId, appointmentData) {
    const appointmentDate = new Date(appointmentData.DateTime);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `You have an appointment scheduled for ${formattedDate} at ${formattedTime}. Please arrive 15 minutes early.`;

    return this.createNotification({
      UserID: patientId,
      Title: "Appointment Reminder",
      Message: message,
      Type: "appointment_reminder",
      Priority: "normal",
      ActionRequired: false,
      RelatedAppointmentID: appointmentId,
    });
  }

  /**
   * Send system alert notification
   * @param {string} userId - User ID
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} priority - Priority level
   * @returns {Promise} Created notification
   */
  async sendSystemAlert(userId, title, message, priority = "normal") {
    return this.createNotification({
      UserID: userId,
      Title: title,
      Message: message,
      Type: "system_alert",
      Priority: priority,
      ActionRequired: true,
    });
  }

  /**
   * Send medical record update notification
   * @param {string} patientId - Patient ID
   * @param {string} recordId - Medical record ID
   * @param {string} action - Action performed (created, updated, deleted)
   * @returns {Promise} Created notification
   */
  async sendMedicalRecordNotification(patientId, recordId, action) {
    const actionMessages = {
      created: "A new medical record has been added to your file.",
      updated: "Your medical record has been updated.",
      deleted: "A medical record has been removed from your file.",
    };

    const actionTitles = {
      created: "New Medical Record",
      updated: "Medical Record Updated",
      deleted: "Medical Record Removed",
    };

    return this.createNotification({
      UserID: patientId,
      Title: actionTitles[action] || "Medical Record Update",
      Message:
        actionMessages[action] || "Your medical record has been modified.",
      Type: "medical_record",
      Priority: "normal",
      ActionRequired: false,
      RelatedRecordID: recordId,
    });
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise} Notification statistics
   */
  async getNotificationStats(userId = null) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const targetUserId = userId || user?.id;
      if (!targetUserId) throw new Error("No user ID provided");

      const { data, error } = await supabase
        .from("Notification")
        .select("Priority, IsRead, Type")
        .eq("UserID", targetUserId);

      if (error) throw error;

      const stats = {
        total: data.length,
        unread: data.filter((n) => !n.IsRead).length,
        highPriority: data.filter((n) => n.Priority === "high").length,
        byType: {},
      };

      // Count by type
      data.forEach((notification) => {
        stats.byType[notification.Type] =
          (stats.byType[notification.Type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      notificationUtils.handleSupabaseError(
        error,
        "fetching notification stats"
      );
      return null;
    }
  }

  /**
   * Unsubscribe from all notification subscriptions
   */
  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions.clear();
  }

  /**
   * Cleanup service
   */
  destroy() {
    this.unsubscribeAll();
    this.isInitialized = false;
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Auto-initialize when imported
notificationService.initialize().catch(console.error);

export default notificationService;
