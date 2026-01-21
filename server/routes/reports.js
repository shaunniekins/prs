/**
 * Reports Routes
 * Handles report generation and analytics endpoints
 */

import express from "express";
import { auth } from "../middleware/auth.js";
import { supabase, supabaseAuth } from "../services/supabaseService.js";

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// Get overview statistics
router.get("/overview", async (req, res) => {
  try {
    // Use service role client for dashboard queries since RLS is disabled on these tables
    const dashboardClient = supabase;

    // Get patient count
    const { count: patientsCount, error: patientsError } = await dashboardClient
      .from("Patients")
      .select("*", { count: "exact", head: true });

    // Get staff count
    const { count: staffCount, error: staffError } = await dashboardClient
      .from("Staff")
      .select("*", { count: "exact", head: true });

    // Get appointments count
    const { count: appointmentsCount, error: appointmentsError } =
      await dashboardClient
        .from("Appointment")
        .select("*", { count: "exact", head: true });

    // Get medical records count
    const { count: recordsCount, error: recordsError } = await dashboardClient
      .from("MedicalRecord")
      .select("*", { count: "exact", head: true });

    // Get today's appointments count
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const { count: todaysAppointmentsCount, error: todaysAppointmentsError } =
      await dashboardClient
        .from("Appointment")
        .select("*", { count: "exact", head: true })
        .gte("DateTime", startOfDay.toISOString())
        .lt("DateTime", endOfDay.toISOString());

    // Get pending appointments count (appointments in the future)
    const now = new Date();
    const { count: pendingAppointmentsCount, error: pendingAppointmentsError } =
      await dashboardClient
        .from("Appointment")
        .select("*", { count: "exact", head: true })
        .gt("DateTime", now.toISOString());

    // Get recent notifications count (last 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { count: recentNotificationsCount, error: recentNotificationsError } =
      await dashboardClient
        .from("Notification")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString());

    // Get completed appointments count (for today)
    const {
      count: completedAppointmentsCount,
      error: completedAppointmentsError,
    } = await dashboardClient
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("DateTime", startOfDay.toISOString())
      .lt("DateTime", endOfDay.toISOString())
      .eq("Status", "Completed");

    // Get cancelled appointments count (for today)
    const {
      count: cancelledAppointmentsCount,
      error: cancelledAppointmentsError,
    } = await dashboardClient
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("DateTime", startOfDay.toISOString())
      .lt("DateTime", endOfDay.toISOString())
      .eq("Status", "Cancelled");

    if (
      patientsError ||
      staffError ||
      appointmentsError ||
      recordsError ||
      todaysAppointmentsError ||
      pendingAppointmentsError ||
      recentNotificationsError ||
      completedAppointmentsError ||
      cancelledAppointmentsError
    ) {
      throw new Error("Failed to fetch overview statistics");
    }

    const stats = {
      totalPatients: patientsCount || 0,
      totalStaff: staffCount || 0,
      totalAppointments: appointmentsCount || 0,
      totalRecords: recordsCount || 0,
      todaysAppointments: todaysAppointmentsCount || 0,
      pendingAppointments: pendingAppointmentsCount || 0,
      completedAppointments: completedAppointmentsCount || 0,
      cancelledAppointments: cancelledAppointmentsCount || 0,
      recentNotifications: recentNotificationsCount || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching overview stats:", error);
    res.status(500).json({
      message: "Failed to fetch overview statistics",
      code: "OVERVIEW_STATS_ERROR",
    });
  }
});

export default router;
