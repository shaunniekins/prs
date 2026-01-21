import express from "express";
import { notesService } from "../services/supabaseService.js";

const router = express.Router();

// Get all consultation notes
router.get("/", async (req, res) => {
  try {
    const { data, error } = await notesService.getAllNotes();
    if (error) {
      console.error("Error fetching consultation notes:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching consultation notes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get consultation note by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await notesService.getNoteById(req.params.id);

    if (error) {
      console.error("Error fetching consultation note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Consultation note not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching consultation note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new consultation note
router.post("/", async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      appointmentId,
      enteredBy,
      staffName,
      type,
      subject,
      content,
      vitalSigns,
      assessment,
      plan,
      followUp,
      status,
    } = req.body;

    const { data, error } = await notesService.createNote({
      PatientID: patientId,
      PatientName: patientName,
      AppointmentID: appointmentId,
      EnteredBy: enteredBy,
      StaffName: staffName,
      Type: type,
      Subject: subject,
      Content: content,
      VitalSigns: vitalSigns,
      Assessment: assessment,
      Plan: plan,
      FollowUp: followUp,
      Status: status,
    });

    if (error) {
      console.error("Error creating consultation note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating consultation note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update consultation note
router.put("/:id", async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      appointmentId,
      enteredBy,
      staffName,
      type,
      subject,
      content,
      vitalSigns,
      assessment,
      plan,
      followUp,
      status,
    } = req.body;

    const { data: note, error: fetchError } = await notesService.getNoteById(
      req.params.id
    );
    if (fetchError) {
      console.error("Error fetching consultation note:", fetchError);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!note) {
      return res.status(404).json({ message: "Consultation note not found" });
    }

    const { data, error } = await notesService.updateNote(req.params.id, {
      PatientID: patientId,
      PatientName: patientName,
      AppointmentID: appointmentId,
      EnteredBy: enteredBy,
      StaffName: staffName,
      Type: type,
      Subject: subject,
      Content: content,
      VitalSigns: vitalSigns,
      Assessment: assessment,
      Plan: plan,
      FollowUp: followUp,
      Status: status,
    });

    if (error) {
      console.error("Error updating consultation note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating consultation note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete consultation note
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await notesService.deleteNote(req.params.id);

    if (error) {
      console.error("Error deleting consultation note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Consultation note deleted successfully" });
  } catch (error) {
    console.error("Error deleting consultation note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get consultation notes by patient ID
router.get("/patient/:patientId", async (req, res) => {
  try {
    const { data, error } = await notesService.getNotesByPatient(
      req.params.patientId
    );

    if (error) {
      console.error("Error fetching consultation notes by patient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching consultation notes by patient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get consultation notes by staff ID
router.get("/staff/:staffId", async (req, res) => {
  try {
    const { data, error } = await notesService.getNotesByStaff(
      req.params.staffId
    );

    if (error) {
      console.error("Error fetching consultation notes by staff:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching consultation notes by staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Export consultation note
router.get("/:id/export", async (req, res) => {
  try {
    const { data: note, error } = await notesService.getNoteById(req.params.id);

    if (error) {
      console.error("Error fetching consultation note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!note) {
      return res.status(404).json({ message: "Consultation note not found" });
    }

    // Create export data
    const exportData = {
      patientName: note.PatientName,
      date: new Date(note.CreatedAt).toLocaleString(),
      type: note.Type,
      subject: note.Subject,
      content: note.Content,
      assessment: note.Assessment,
      plan: note.Plan,
      staffName: note.StaffName,
      vitalSigns: note.VitalSigns,
      followUp: note.FollowUp,
      status: note.Status,
    };

    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error exporting consultation note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
