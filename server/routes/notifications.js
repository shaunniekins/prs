import express from "express";
import { notificationService } from "../services/supabaseService.js";

const router = express.Router();

// Get all notifications
router.get("/", async (req, res) => {
  try {
    const { data, error } = await notificationService.getAllNotifications();
    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get notifications by user ID
router.get("/user/:userId", async (req, res) => {
  try {
    const { data, error } = await notificationService.getNotificationsByUser(
      req.params.userId
    );
    if (error) {
      console.error("Error fetching user notifications:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get notification by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await notificationService.getNotificationById(
      req.params.id
    );

    if (error) {
      console.error("Error fetching notification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new notification
router.post("/", async (req, res) => {
  try {
    const { userId, title, message, type, priority, actionRequired } = req.body;

    const { data, error } = await notificationService.createNotification({
      UserID: userId,
      Title: title,
      Message: message,
      Type: type || "general",
      Priority: priority || "normal",
      ActionRequired: actionRequired || false,
    });

    if (error) {
      console.error("Error creating notification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update notification
router.put("/:id", async (req, res) => {
  try {
    const { userId, title, message, type, priority, actionRequired } = req.body;

    const { data, error } = await notificationService.updateNotification(
      req.params.id,
      {
        UserID: userId,
        Title: title,
        Message: message,
        Type: type,
        Priority: priority,
        ActionRequired: actionRequired,
      }
    );

    if (error) {
      console.error("Error updating notification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await notificationService.deleteNotification(
      req.params.id
    );

    if (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const { data, error } = await notificationService.markAsRead(req.params.id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res
      .status(200)
      .json({ message: "Notification marked as read", notification: data });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
