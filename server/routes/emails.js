import express from "express";
import { sendAccountCreationEmail } from "../services/emailService.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Initialize Supabase client with service role key (for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

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

    // Update the Users table to track email sending
    const { data: user, error: fetchError } = await supabase
      .from("Users")
      .select("credentials_sent_at, credentials_sent_count")
      .eq("Email", email)
      .single();

    if (!fetchError && user) {
      const isFirstSend = !user.credentials_sent_at;
      const updateData = {
        credentials_last_sent_at: new Date().toISOString(),
        credentials_sent_count: (user.credentials_sent_count || 0) + 1,
      };

      // Set first send timestamp if this is the first time
      if (isFirstSend) {
        updateData.credentials_sent_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("Users")
        .update(updateData)
        .eq("Email", email);

      if (updateError) {
        console.error("Failed to update credential tracking:", updateError);
        // Don't fail the request, just log the error
      }
    }

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
