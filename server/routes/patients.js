import express from "express";
import { patientService } from "../services/supabaseService.js";

const router = express.Router();

// Get all patients
router.get("/", async (req, res) => {
  try {
    const { data, error } = await patientService.getAllPatients();
    if (error) {
      console.error("Error fetching patients:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get patient by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await patientService.getPatientById(req.params.id);

    if (error) {
      console.error("Error fetching patient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!data) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create new patient
router.post("/", async (req, res) => {
  try {
    const { data, error } = await patientService.createPatient(req.body);

    if (error) {
      console.error("Error creating patient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update patient
router.put("/:id", async (req, res) => {
  try {
    const { data, error } = await patientService.updatePatient(
      req.params.id,
      req.body
    );

    if (error) {
      console.error("Error updating patient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete patient
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await patientService.deletePatient(req.params.id);

    if (error) {
      console.error("Error deleting patient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
