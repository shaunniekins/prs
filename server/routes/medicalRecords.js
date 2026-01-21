import express from "express";
import {
  medicalRecordService,
  diagnosisService,
  treatmentService,
  notesService,
} from "../services/supabaseService.js";
import { supabase } from "../services/supabaseService.js";

const router = express.Router();

// Get all medical records
router.get("/", async (req, res) => {
  try {
    const { data, error } = await medicalRecordService.getAllMedicalRecords();
    if (error) {
      console.error("Error fetching medical records:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching medical records:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get medical record by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await medicalRecordService.getMedicalRecordById(
      req.params.id
    );

    if (error) {
      console.error("Error fetching medical record:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching medical record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new medical record
router.post("/", async (req, res) => {
  try {
    const { appointmentId, enteredBy, diagnosis, treatment, notes } = req.body;

    // Create diagnosis if provided
    let diagnosisId = null;
    if (diagnosis) {
      const { data: diagnosisRecord, error: diagnosisError } =
        await diagnosisService.createDiagnosis({
          diagnosisName: diagnosis,
        });
      if (diagnosisError) {
        console.error("Error creating diagnosis:", diagnosisError);
        return res.status(500).json({ message: "Error creating diagnosis" });
      }
      diagnosisId = diagnosisRecord.DiagnosisID;
    }

    // Create treatment if provided
    let treatmentId = null;
    if (treatment) {
      const { data: treatmentRecord, error: treatmentError } =
        await treatmentService.createTreatment({
          treatmentName: treatment,
        });
      if (treatmentError) {
        console.error("Error creating treatment:", treatmentError);
        return res.status(500).json({ message: "Error creating treatment" });
      }
      treatmentId = treatmentRecord.TreatmentID;
    }

    // Create notes if provided
    let noteId = null;
    if (notes) {
      const { data: notesRecord, error: notesError } =
        await notesService.createNote({
          notes: notes,
        });
      if (notesError) {
        console.error("Error creating notes:", notesError);
        return res.status(500).json({ message: "Error creating notes" });
      }
      noteId = notesRecord.NoteID;
    }

    // Create medical record
    const { data: newMedicalRecord, error: medicalRecordError } =
      await medicalRecordService.createMedicalRecord({
        AppointmentID: appointmentId,
        EnteredBy: enteredBy,
        DiagnosisID: diagnosisId,
        TreatmentID: treatmentId,
        NoteID: noteId,
      });

    if (medicalRecordError) {
      console.error("Error creating medical record:", medicalRecordError);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(newMedicalRecord);
  } catch (error) {
    console.error("Error creating medical record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update medical record
router.put("/:id", async (req, res) => {
  try {
    const { appointmentId, enteredBy, diagnosis, treatment, notes } = req.body;

    const { data: medicalRecord, error: fetchError } =
      await medicalRecordService.getMedicalRecordById(req.params.id);
    if (fetchError) {
      console.error("Error fetching medical record:", fetchError);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!medicalRecord) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    // Update diagnosis if provided
    if (diagnosis !== undefined) {
      if (medicalRecord.DiagnosisID) {
        // Update existing diagnosis
        await diagnosisService.updateDiagnosis(medicalRecord.DiagnosisID, {
          diagnosisName: diagnosis,
        });
      } else if (diagnosis) {
        const { data: diagnosisRecord } =
          await diagnosisService.createDiagnosis({
            diagnosisName: diagnosis,
          });
        await medicalRecordService.updateMedicalRecord(req.params.id, {
          DiagnosisID: diagnosisRecord.DiagnosisID,
        });
      }
    }

    // Update treatment if provided
    if (treatment !== undefined) {
      if (medicalRecord.TreatmentID) {
        // Update existing treatment
        await treatmentService.updateTreatment(medicalRecord.TreatmentID, {
          treatmentName: treatment,
        });
      } else if (treatment) {
        const { data: treatmentRecord } =
          await treatmentService.createTreatment({
            treatmentName: treatment,
          });
        await medicalRecordService.updateMedicalRecord(req.params.id, {
          TreatmentID: treatmentRecord.TreatmentID,
        });
      }
    }

    // Update notes if provided
    if (notes !== undefined) {
      if (medicalRecord.NoteID) {
        // Update existing notes
        await notesService.updateNote(medicalRecord.NoteID, {
          notes: notes,
        });
      } else if (notes) {
        const { data: notesRecord } = await notesService.createNote({
          notes: notes,
        });
        await medicalRecordService.updateMedicalRecord(req.params.id, {
          NoteID: notesRecord.NoteID,
        });
      }
    }

    // Update other fields
    const { data: updatedMedicalRecord, error: updateError } =
      await medicalRecordService.updateMedicalRecord(req.params.id, {
        AppointmentID: appointmentId,
        EnteredBy: enteredBy,
      });

    if (updateError) {
      console.error("Error updating medical record:", updateError);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(updatedMedicalRecord);
  } catch (error) {
    console.error("Error updating medical record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete medical record
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await medicalRecordService.deleteMedicalRecord(
      req.params.id
    );

    if (error) {
      console.error("Error deleting medical record:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Medical record deleted successfully" });
  } catch (error) {
    console.error("Error deleting medical record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get medical records by appointment ID
router.get("/appointment/:appointmentId", async (req, res) => {
  try {
    // This method doesn't exist in our current service, let's use a direct query
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Diagnosis(diagnosisName),
        Treatment(treatmentName),
        Notes(notes)
      `
      )
      .eq("AppointmentID", req.params.appointmentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching medical records by appointment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching medical records by appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
