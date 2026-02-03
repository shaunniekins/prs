// Vercel Serverless Function wrapper for Express API
// This file allows the Express server to run as a Vercel Serverless Function

import "dotenv/config";
import express from "express";
import cors from "cors";

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
import patientRoutes from "../server/routes/patients.js";
import userRoutes from "../server/routes/users.js";
import appointmentRoutes from "../server/routes/appointments.js";
import medicalRecordRoutes from "../server/routes/medicalRecords.js";
import notificationRoutes from "../server/routes/notifications.js";
import staffRoutes from "../server/routes/staff.js";
import consultationNoteRoutes from "../server/routes/consultationNotes.js";
import authRoutes from "../server/routes/auth.js";
import reportRoutes from "../server/routes/reports.js";
import emailRoutes from "../server/routes/emails.js";
import accountRoutes from "../server/routes/accountRoutes.js";
import cronRoutes from "../server/routes/cron.js";

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/consultation-notes", consultationNoteRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/admin/accounts", accountRoutes);
app.use("/api/cron", cronRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "Server is running on Vercel" });
});

// Export the Express app as default for Vercel
export default app;
