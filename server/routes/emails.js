import express from "express";
import { sendAccountCreationEmail } from "../services/emailService.js";

const router = express.Router();

/**
 * POST /api/emails/send-account-creation
 * Send account creation email with credentials
 */
router.post("/send-account-creation", async (req, res) => {
  try {
    const { firstName, surname, username, email, accountType, role, password } =
      req.body;

    // Validate required fields
    if (
      !firstName ||
      !surname ||
      !username ||
      !email ||
      !accountType ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for email sending",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Send the email
    const result = await sendAccountCreationEmail({
      firstName,
      surname,
      username,
      email,
      accountType,
      role,
      password,
    });

    res.status(200).json({
      success: true,
      message: "Account creation email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error in send-account-creation endpoint:", error.message);

    // Don't expose sensitive error details in response
    res.status(500).json({
      success: false,
      message: "Failed to send account creation email. Please try again later.",
    });
  }
});

export default router;
