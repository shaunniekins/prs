import express from "express";
import { appointmentService } from "../services/supabaseService.js";

const router = express.Router();

/**
 * Ensure a DateTime string has the PHT timezone offset (+08:00).
 * datetime-local inputs send "2026-02-28T14:30" with no offset.
 * Without this, PostgreSQL TIMESTAMPTZ would assume UTC.
 */
function ensurePHT(dateTimeStr) {
  if (!dateTimeStr) return dateTimeStr;
  // If already has an offset (Z, +HH:MM, -HH:MM), leave it alone
  if (/[Zz+\-]\d/.test(String(dateTimeStr))) return dateTimeStr;
  // Append seconds if missing, then PHT offset
  const str = String(dateTimeStr);
  return str.length === 16 ? str + ":00+08:00" : str + "+08:00";
}

// Get all appointments
router.get("/", async (req, res) => {
  try {
    const { data, error } = await appointmentService.getAllAppointments();
    if (error) {
      console.error("Error fetching appointments:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get appointment by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await appointmentService.getAppointmentById(
      req.params.id,
    );

    if (error) {
      console.error("Error fetching appointment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new appointment
router.post("/", async (req, res) => {
  try {
    const { scheduledBy, patientId, dateTime, reason, status } = req.body;

    const { data, error } = await appointmentService.createAppointment({
      ScheduledBy: scheduledBy,
      PatientID: patientId,
      DateTime: ensurePHT(dateTime),
      Reason: reason,
      Status: status || "pending",
    });

    if (error) {
      console.error("Error creating appointment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update appointment
router.put("/:id", async (req, res) => {
  try {
    const { scheduledBy, patientId, dateTime, reason, status } = req.body;

    const { data, error } = await appointmentService.updateAppointment(
      req.params.id,
      {
        ScheduledBy: scheduledBy,
        PatientID: patientId,
        DateTime: ensurePHT(dateTime),
        Reason: reason,
        Status: status,
      },
    );

    if (error) {
      console.error("Error updating appointment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete appointment
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await appointmentService.deleteAppointment(req.params.id);

    if (error) {
      console.error("Error deleting appointment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get appointments by patient ID
router.get("/patient/:patientId", async (req, res) => {
  try {
    const { data, error } = await appointmentService.getAppointmentsByPatient(
      req.params.patientId,
    );

    if (error) {
      console.error("Error fetching patient appointments:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get appointments by staff ID
router.get("/staff/:staffId", async (req, res) => {
  try {
    const { data, error } = await appointmentService.getAppointmentsByStaff(
      req.params.staffId,
    );

    if (error) {
      console.error("Error fetching staff appointments:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching staff appointments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
