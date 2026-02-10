import express from "express";
import { appointmentService } from "../services/supabaseService.js";
import { sendAppointmentReminderEmail } from "../services/emailService.js";

const router = express.Router();

/**
 * GET /api/cron/reminders
 * Triggered by Vercel Cron to send appointment reminders
 */
router.get("/reminders", async (req, res) => {
  // Optional: Verify Vercel Cron signature if needed
  // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  try {
    console.log("⏰ Starting appointment reminder cron job...");

    // Calculate "tomorrow" in Philippine Time (PHT = UTC+8).
    // DateTimes are stored with PHT offset, so we need PHT-based boundaries.
    // PHT midnight = UTC 16:00 the day before.
    const now = new Date();
    const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

    // Current time in PHT
    const nowPHT = new Date(now.getTime() + PHT_OFFSET_MS);

    // Tomorrow in PHT: take the PHT date, add 1 day, set to midnight PHT
    const tomorrowPHTYear = nowPHT.getUTCFullYear();
    const tomorrowPHTMonth = nowPHT.getUTCMonth();
    const tomorrowPHTDay = nowPHT.getUTCDate() + 1;

    // Tomorrow 00:00:00 PHT = yesterday 16:00:00 UTC
    const tomorrowStart = new Date(
      Date.UTC(tomorrowPHTYear, tomorrowPHTMonth, tomorrowPHTDay, 0, 0, 0) -
        PHT_OFFSET_MS,
    );
    // Day-after-tomorrow 00:00:00 PHT
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

    console.log(
      `📅 Fetching appointments between ${tomorrowStart.toISOString()} and ${tomorrowEnd.toISOString()}`,
    );

    const { data: appointments, error } =
      await appointmentService.getAppointmentsByDateRange(
        tomorrowStart.toISOString(),
        tomorrowEnd.toISOString(),
      );

    if (error) {
      console.error("❌ Error fetching appointments for reminders:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!appointments || appointments.length === 0) {
      console.log("ℹ️ No appointments found for tomorrow.");
      return res.status(200).json({
        message: "No appointments found for tomorrow",
        processed: 0,
      });
    }

    console.log(
      `📝 Found ${appointments.length} appointments. Sending reminders...`,
    );

    const results = {
      total: appointments.length,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    // Filter confirmed appointments only?
    // Usually valid statuses: Confirmed, Pending.
    // Let's remind for both Confirmed and Pending, unless you want to restrict it.
    // The user didn't specify, but "Confirmed" makes most sense.
    // I'll send for Confirmed and Pending.

    // Process sequentially to avoid rate limits
    for (const appointment of appointments) {
      const status = (
        appointment.Status ||
        appointment.status ||
        ""
      ).toLowerCase();

      if (
        status === "cancelled" ||
        status === "denied" ||
        status === "completed"
      ) {
        results.skipped++;
        continue;
      }

      const result = await sendAppointmentReminderEmail(appointment);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        console.error(
          `⚠️ Failed to send reminder to AppointmentID ${appointment.AppointmentID}:`,
          result.error || result.message,
        );
      }
    }

    console.log("✅ Cron job completed.", results);
    res.status(200).json({
      success: true,
      message: "Reminders processed",
      results,
    });
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

export default router;
