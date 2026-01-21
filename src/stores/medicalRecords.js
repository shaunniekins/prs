import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/services/supabaseService";

export const useMedicalRecordsStore = defineStore("medicalRecords", () => {
  // State
  const medicalRecords = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const search = ref("");
  const filterStatus = ref("all");
  const filterType = ref("all");
  const selectedRecord = ref(null);

  // Getters
  const filteredRecords = computed(() => {
    return medicalRecords.value.filter((record) => {
      const patientName = getPatientName(record).toLowerCase();
      const staffName = getStaffName(record).toLowerCase();
      const diagnosis = getDiagnosisName(record).toLowerCase();
      const treatment = getTreatmentName(record).toLowerCase();

      const matchesSearch =
        patientName.includes(search.value.toLowerCase()) ||
        staffName.includes(search.value.toLowerCase()) ||
        diagnosis.includes(search.value.toLowerCase()) ||
        treatment.includes(search.value.toLowerCase());

      const matchesStatus =
        filterStatus.value === "all" ||
        (record.Status || "").toLowerCase() === filterStatus.value;

      const matchesType =
        filterType.value === "all" ||
        diagnosis.includes(filterType.value.toLowerCase());

      return matchesSearch && matchesStatus && matchesType;
    });
  });

  const recentRecords = computed(() => {
    return medicalRecords.value
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  });

  const totalRecords = computed(() => medicalRecords.value.length);
  const draftRecords = computed(
    () => medicalRecords.value.filter((r) => r.Status === "Draft").length
  );
  const finalRecords = computed(
    () => medicalRecords.value.filter((r) => r.Status === "Final").length
  );

  // Helper functions
  const getPatientName = (record) => {
    return record.Patient?.Users?.fullName || "Unknown Patient";
  };

  const getStaffName = (record) => {
    return record.Staff?.Users?.fullName || "Unknown Staff";
  };

  const getDiagnosisName = (record) => {
    return (
      record.Diagnosis?.DiagnosisName || record.Diagnosis || "Unknown Diagnosis"
    );
  };

  const getTreatmentName = (record) => {
    return (
      record.Treatment?.TreatmentName || record.Treatment || "Unknown Treatment"
    );
  };

  const getStatusBadgeVariant = (status) => {
    const variants = {
      Draft: "warning",
      Final: "success",
      Amended: "info",
    };
    return variants[status] || "secondary";
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  // Actions
  const fetchMedicalRecords = async () => {
    loading.value = true;
    error.value = null;

    try {
      // Load from localStorage or use mock data
      const stored = localStorage.getItem("medicalRecords");
      if (stored) {
        medicalRecords.value = JSON.parse(stored);
      } else {
        // Mock data for demonstration
        medicalRecords.value = [
          {
            MedicalRecordID: 1,
            PatientID: 1,
            patientName: "John Doe",
            AppointmentID: null,
            Diagnosis: "Common Cold",
            Treatment: "Rest and fluids",
            Notes: "Patient advised to rest",
            VitalSigns: {
              BloodPressure: "120/80",
              HeartRate: "72",
              Temperature: "36.8",
              Weight: "70",
              Height: "175",
              OxygenSaturation: "98",
              RespiratoryRate: "16",
            },
            Status: "Final",
            Type: "Consultation",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem(
          "medicalRecords",
          JSON.stringify(medicalRecords.value)
        );
      }

      return { success: true, data: medicalRecords.value };
    } catch (err) {
      console.error("Error fetching medical records:", err);
      error.value = err.message || "Failed to fetch medical records";
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const createMedicalRecord = async (recordData) => {
    loading.value = true;
    error.value = null;

    try {
      // Create new record with mock ID
      const newRecord = {
        ...recordData,
        MedicalRecordID: Date.now(), // Simple ID generation
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      medicalRecords.value.push(newRecord);
      localStorage.setItem(
        "medicalRecords",
        JSON.stringify(medicalRecords.value)
      );

      return { success: true, data: newRecord };
    } catch (err) {
      console.error("Error creating medical record:", err);
      error.value = err.message || "Failed to create medical record";
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const updateMedicalRecord = async (recordId, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const index = medicalRecords.value.findIndex(
        (record) => record.MedicalRecordID === recordId
      );

      if (index === -1) {
        throw new Error("Medical record not found");
      }

      const updatedRecord = {
        ...medicalRecords.value[index],
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      medicalRecords.value[index] = updatedRecord;
      localStorage.setItem(
        "medicalRecords",
        JSON.stringify(medicalRecords.value)
      );

      return { success: true, data: updatedRecord };
    } catch (err) {
      console.error("Error updating medical record:", err);
      error.value = err.message || "Failed to update medical record";
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const deleteMedicalRecord = async (recordId) => {
    loading.value = true;
    error.value = null;

    try {
      medicalRecords.value = medicalRecords.value.filter(
        (record) => record.MedicalRecordID !== recordId
      );

      localStorage.setItem(
        "medicalRecords",
        JSON.stringify(medicalRecords.value)
      );

      return { success: true };
    } catch (err) {
      console.error("Error deleting medical record:", err);
      error.value = err.message || "Failed to delete medical record";
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const setSearch = (searchTerm) => {
    search.value = searchTerm;
  };

  const setFilterStatus = (status) => {
    filterStatus.value = status;
  };

  const setFilterType = (type) => {
    filterType.value = type;
  };

  const setSelectedRecord = (record) => {
    selectedRecord.value = record;
  };

  const clearSelectedRecord = () => {
    selectedRecord.value = null;
  };

  // Patient search functionality
  const searchPatients = async (query) => {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    try {
      const { data, error } = await supabase
        .from("Patients")
        .select(
          `
          PatientID,
          UserID,
          ContactNumber,
          DateOfBirth,
          Gender,
          Address,
          EmergencyContact,
          MedicalHistory,
          created_at,
          Users!inner(
            fullName,
            email
          )
        `
        )
        .or(`Users.fullName.ilike.%${query}%,PatientID.eq.${query}`)
        .limit(10);

      if (error) {
        console.error("Error searching patients:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error("Error searching patients:", err);
      return { success: false, error: err.message };
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    medicalRecords,
    loading,
    error,
    search,
    filterStatus,
    filterType,
    selectedRecord,

    // Getters
    filteredRecords,
    recentRecords,
    totalRecords,
    draftRecords,
    finalRecords,

    // Helper functions
    getPatientName,
    getStaffName,
    getDiagnosisName,
    getTreatmentName,
    getStatusBadgeVariant,
    formatDateTime,

    // Actions
    fetchMedicalRecords,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    searchPatients,
    setSearch,
    setFilterStatus,
    setFilterType,
    setSelectedRecord,
    clearSelectedRecord,
    clearError,
  };
});
