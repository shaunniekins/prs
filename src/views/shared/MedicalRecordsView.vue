<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNotify } from "@/composables/useNotify.js";
import { useSupabase } from "@/composables/useSupabase.js";
import { useAuthStore } from "@/stores/auth.js";
import { supabase } from "@/config/supabaseConfig.js";

// Define props for role-based customization
const props = defineProps({
  title: {
    type: String,
    default: "Medical Records",
  },
  subtitle: {
    type: String,
    default: "View and manage medical records",
  },
  // User mode: 'patient' | 'nurse' | 'admin'
  mode: {
    type: String,
    default: "patient",
    validator: (value) => ["patient", "nurse", "admin"].includes(value),
  },
});

// Composables
const { showSuccess, showError } = useNotify();
const {
  medicalRecords: medicalRecordOps,
  patients: patientOps,
  diagnoses: diagnosisOps,
  treatments: treatmentOps,
} = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const search = ref("");
const filterStatus = ref("all");
const filterType = ref("all");
const error = ref(null);

const medicalRecords = ref([]);
const patientsList = ref([]);
const diagnosesList = ref([]);
const treatmentsList = ref([]);
const currentPatientRecord = ref(null);

// Modal states
const showViewModal = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedRecord = ref(null);

// Real-time subscription
let recordSubscription = null;

// Form data
const recordForm = ref({
  PatientID: "",
  DiagnosisID: "",
  TreatmentID: "",
  Notes: "",
  VitalSigns: {
    BloodPressure: "",
    HeartRate: "",
    Temperature: "",
    Weight: "",
    Height: "",
  },
  Status: "Draft",
});

// Computed properties
const isPatient = computed(() => props.mode === "patient");
const isNurse = computed(() => props.mode === "nurse");
const isAdmin = computed(() => props.mode === "admin");
const isStaff = computed(
  () => props.mode === "nurse" || props.mode === "admin",
);
const canEdit = computed(() => isStaff.value);

const filteredRecords = computed(() => {
  return medicalRecords.value.filter((record) => {
    const searchLower = search.value.toLowerCase();

    // Search by patient name, diagnosis, treatment, or notes
    const patientName = getPatientName(record).toLowerCase();
    const diagnosis = getDiagnosisName(record).toLowerCase();
    const treatment = getTreatmentName(record).toLowerCase();
    const notes = (record.Notes || "").toLowerCase();

    const matchesSearch =
      patientName.includes(searchLower) ||
      diagnosis.includes(searchLower) ||
      treatment.includes(searchLower) ||
      notes.includes(searchLower);

    const status = (record.Status || "").toLowerCase();
    const matchesStatus =
      filterStatus.value === "all" ||
      status === filterStatus.value.toLowerCase();

    return matchesSearch && matchesStatus;
  });
});

const draftRecords = computed(() => {
  return medicalRecords.value.filter(
    (r) => (r.Status || "").toLowerCase() === "draft",
  );
});

const finalRecords = computed(() => {
  return medicalRecords.value.filter(
    (r) => (r.Status || "").toLowerCase() === "final",
  );
});

const recentRecords = computed(() => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return medicalRecords.value.filter(
    (r) => new Date(r.CreatedAt) > sevenDaysAgo,
  );
});

// Stats based on role
const stats = computed(() => {
  if (isPatient.value) {
    return [
      {
        icon: "bi-file-medical",
        color: "primary",
        value: medicalRecords.value.length,
        label: "Total Records",
      },
      {
        icon: "bi-clock",
        color: "warning",
        value: recentRecords.value.length,
        label: "Recent (7 days)",
      },
      {
        icon: "bi-clipboard-pulse",
        color: "info",
        value: filteredRecords.value.filter((r) =>
          getDiagnosisName(r).toLowerCase().includes("consultation"),
        ).length,
        label: "Consultations",
      },
      {
        icon: "bi-shield-check",
        color: "success",
        value: filteredRecords.value.filter((r) =>
          getDiagnosisName(r).toLowerCase().includes("vaccination"),
        ).length,
        label: "Vaccinations",
      },
    ];
  } else {
    return [
      {
        icon: "bi-file-medical",
        color: "primary",
        value: medicalRecords.value.length,
        label: "Total Records",
      },
      {
        icon: "bi-pencil",
        color: "warning",
        value: draftRecords.value.length,
        label: "Draft Records",
      },
      {
        icon: "bi-check-circle",
        color: "success",
        value: finalRecords.value.length,
        label: "Final Records",
      },
      {
        icon: "bi-clock",
        color: "info",
        value: recentRecords.value.length,
        label: "Recent (7 days)",
      },
    ];
  }
});

// Methods
const fetchMedicalRecords = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error("Please log in to view medical records");
    }

    let data;

    if (isPatient.value) {
      // Get patient's own medical records
      const patientData = await patientOps.getMyPatients();
      if (patientData && patientData.length > 0) {
        currentPatientRecord.value = patientData[0];
        data = await medicalRecordOps.getMedicalRecordsByPatient(
          patientData[0].PatientID,
        );
      } else {
        data = [];
      }
    } else {
      // Get all medical records for staff
      data = await medicalRecordOps.getAllMedicalRecords();

      // Also fetch patients, diagnoses, and treatments for forms
      const patientsData = await patientOps.getAllPatients();
      patientsList.value = patientsData || [];

      try {
        const diagnosesData = await diagnosisOps?.getAllDiagnoses?.();
        diagnosesList.value = diagnosesData || [];
      } catch (e) {
        console.warn("Could not fetch diagnoses:", e);
        diagnosesList.value = [];
      }

      try {
        const treatmentsData = await treatmentOps?.getAllTreatments?.();
        treatmentsList.value = treatmentsData || [];
      } catch (e) {
        console.warn("Could not fetch treatments:", e);
        treatmentsList.value = [];
      }
    }

    medicalRecords.value = data || [];
  } catch (err) {
    error.value = err.message || "Failed to fetch medical records";
    showError(error.value);
    console.error("Error fetching medical records:", err);
  } finally {
    loading.value = false;
  }
};

const setupRealtimeSubscription = () => {
  recordSubscription = supabase
    .channel("medical-records-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "MedicalRecord" },
      () => {
        fetchMedicalRecords();
      },
    )
    .subscribe();
};

const resetForm = () => {
  recordForm.value = {
    PatientID: "",
    DiagnosisID: "",
    TreatmentID: "",
    Notes: "",
    VitalSigns: {
      BloodPressure: "",
      HeartRate: "",
      Temperature: "",
      Weight: "",
      Height: "",
    },
    Status: "Draft",
  };
};

const openCreateModal = () => {
  if (!canEdit.value) {
    showError("You don't have permission to create medical records");
    return;
  }
  resetForm();
  selectedRecord.value = null;
  showCreateModal.value = true;
};

const openViewModal = (record) => {
  selectedRecord.value = record;
  showViewModal.value = true;
};

const openEditModal = (record) => {
  if (!canEdit.value) {
    showError("You don't have permission to edit medical records");
    return;
  }
  selectedRecord.value = record;
  recordForm.value = {
    PatientID: record.PatientID || "",
    DiagnosisID: record.DiagnosisID || "",
    TreatmentID: record.TreatmentID || "",
    Notes: record.Notes || "",
    VitalSigns: record.VitalSigns || {
      BloodPressure: "",
      HeartRate: "",
      Temperature: "",
      Weight: "",
      Height: "",
    },
    Status: record.Status || "Draft",
  };
  showEditModal.value = true;
};

const openDeleteModal = (record) => {
  if (!canEdit.value) {
    showError("You don't have permission to delete medical records");
    return;
  }
  selectedRecord.value = record;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showViewModal.value = false;
  showCreateModal.value = false;
  showEditModal.value = false;
  showDeleteModal.value = false;
  selectedRecord.value = null;
  resetForm();
};

const createRecord = async () => {
  if (!recordForm.value.PatientID) {
    showError("Please select a patient");
    return;
  }

  loading.value = true;
  try {
    await medicalRecordOps.createMedicalRecord(recordForm.value);
    await fetchMedicalRecords();
    closeModals();
    showSuccess("Medical record created successfully!");
  } catch (err) {
    showError(err.message || "Failed to create medical record");
    console.error("Error creating medical record:", err);
  } finally {
    loading.value = false;
  }
};

const updateRecord = async () => {
  if (!selectedRecord.value) {
    showError("No record selected");
    return;
  }

  loading.value = true;
  try {
    await medicalRecordOps.updateMedicalRecord(
      selectedRecord.value.MedicalRecordID,
      recordForm.value,
    );
    await fetchMedicalRecords();
    closeModals();
    showSuccess("Medical record updated successfully!");
  } catch (err) {
    showError(err.message || "Failed to update medical record");
    console.error("Error updating medical record:", err);
  } finally {
    loading.value = false;
  }
};

const deleteRecord = async () => {
  if (!selectedRecord.value) {
    showError("No record selected");
    return;
  }

  loading.value = true;
  try {
    await medicalRecordOps.deleteMedicalRecord(
      selectedRecord.value.MedicalRecordID,
    );
    await fetchMedicalRecords();
    closeModals();
    showSuccess("Medical record deleted successfully!");
  } catch (err) {
    showError(err.message || "Failed to delete medical record");
    console.error("Error deleting medical record:", err);
  } finally {
    loading.value = false;
  }
};

// Export functionality
const exportRecord = (record) => {
  const exportData = {
    patientName: getPatientName(record),
    staffName: getStaffName(record),
    date: formatDateTime(record.CreatedAt),
    diagnosis: getDiagnosisName(record),
    treatment: getTreatmentName(record),
    notes: record.Notes || "",
    vitalSigns: record.VitalSigns || {},
    status: record.Status || "",
  };

  const exportText = `
MEDICAL RECORD EXPORT
=====================

Patient: ${exportData.patientName}
Healthcare Provider: ${exportData.staffName}
Date: ${exportData.date}
Status: ${exportData.status}

Diagnosis:
${exportData.diagnosis}

Treatment:
${exportData.treatment}

Notes:
${exportData.notes || "No additional notes"}

Vital Signs:
${
  Object.entries(exportData.vitalSigns)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n") || "Not recorded"
}

Generated on: ${new Date().toLocaleString()}
  `.trim();

  const blob = new Blob([exportText], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medical-record-${record.MedicalRecordID}-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  showSuccess("Record exported successfully!");
};

const exportAllRecords = () => {
  if (filteredRecords.value.length === 0) {
    showError("No records to export");
    return;
  }

  let exportText = "MEDICAL RECORDS EXPORT\n======================\n\n";

  filteredRecords.value.forEach((record, index) => {
    exportText += `
--- Record ${index + 1} ---
Patient: ${getPatientName(record)}
Date: ${formatDateTime(record.CreatedAt)}
Status: ${record.Status || "N/A"}
Diagnosis: ${getDiagnosisName(record)}
Treatment: ${getTreatmentName(record)}
Notes: ${record.Notes || "None"}

`;
  });

  exportText += `\nGenerated on: ${new Date().toLocaleString()}`;
  exportText += `\nTotal Records: ${filteredRecords.value.length}`;

  const blob = new Blob([exportText], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medical-records-export-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  showSuccess(`Exported ${filteredRecords.value.length} records successfully!`);
};

const printRecord = (record) => {
  const printContent = `
    <html>
      <head>
        <title>Medical Record - ${getPatientName(record)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
          .section { margin: 15px 0; }
          .label { font-weight: bold; }
          .vital-signs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
          .vital-sign { padding: 5px; background: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Medical Record</h1>
          <p><span class="label">Patient:</span> ${getPatientName(record)}</p>
          <p><span class="label">Provider:</span> ${getStaffName(record)}</p>
          <p><span class="label">Date:</span> ${formatDateTime(record.CreatedAt)}</p>
        </div>
        <div class="section">
          <h3>Record Information</h3>
          <p><span class="label">Status:</span> ${record.Status || "N/A"}</p>
        </div>
        <div class="section">
          <h3>Medical Information</h3>
          <p><span class="label">Diagnosis:</span> ${getDiagnosisName(record)}</p>
          <p><span class="label">Treatment:</span> ${getTreatmentName(record)}</p>
          <p><span class="label">Notes:</span> ${record.Notes || "No additional notes"}</p>
        </div>
        <div class="section">
          <h3>Vital Signs</h3>
          <div class="vital-signs">
            ${Object.entries(record.VitalSigns || {})
              .filter(([_, value]) => value)
              .map(
                ([key, value]) =>
                  `<div class="vital-sign"><span class="label">${key}:</span> ${value}</div>`,
              )
              .join("")}
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};

// Helper functions
const getPatientName = (record) => {
  if (record.Patients?.Users?.fullName) {
    return record.Patients.Users.fullName;
  }
  if (record.Patients) {
    return `${record.Patients.FirstName || ""} ${record.Patients.Surname || ""}`.trim();
  }
  return "Unknown Patient";
};

const getStaffName = (record) => {
  return record.Staff?.Users?.fullName || "Unknown Staff";
};

const getDiagnosisName = (record) => {
  return record.Diagnosis?.DiagnosisName || "Not specified";
};

const getTreatmentName = (record) => {
  return record.Treatment?.TreatmentName || "Not specified";
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Draft: "warning",
    draft: "warning",
    Final: "success",
    final: "success",
    Amended: "info",
    amended: "info",
  };
  return variants[status] || "secondary";
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return "N/A";
  return new Date(dateTime).toLocaleString();
};

const formatDate = (dateTime) => {
  if (!dateTime) return "N/A";
  return new Date(dateTime).toLocaleDateString();
};

// Lifecycle hooks
onMounted(async () => {
  await fetchMedicalRecords();
  setupRealtimeSubscription();
});

onUnmounted(() => {
  if (recordSubscription) {
    supabase.removeChannel(recordSubscription);
  }
});
</script>

<template>
  <div class="medical-records-view">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">{{ title }}</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          {{ subtitle }}
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button
          v-if="canEdit"
          class="btn btn-primary me-2"
          @click="openCreateModal"
          :disabled="loading"
        >
          <i class="bi bi-plus-lg me-2"></i>
          New Record
        </button>
        <div class="btn-group">
          <button
            class="btn btn-outline-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
          >
            <i class="bi bi-download me-2"></i>
            Export
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <a
                class="dropdown-item"
                href="#"
                @click.prevent="exportAllRecords"
              >
                <i class="bi bi-file-earmark-text me-2"></i>Export All (TXT)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div v-for="(stat, index) in stats" :key="index" class="col-md-3">
        <div
          class="card stats-card animate-fade-in-up"
          :class="`animation-delay-${index * 100}`"
        >
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i :class="`bi ${stat.icon} text-${stat.color} fs-2`"></i>
            </div>
            <h4 class="mb-1">{{ stat.value }}</h4>
            <small class="text-muted">{{ stat.label }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Draft Alert (Staff only) -->
    <div
      v-if="isStaff && draftRecords.length > 0"
      class="alert alert-warning animate-fade-in-up animation-delay-200"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-exclamation-triangle text-warning fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">Draft Records Require Attention</h6>
          <p class="mb-0">
            You have {{ draftRecords.length }} draft record(s) that need to be
            finalized.
          </p>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                :placeholder="
                  isPatient
                    ? 'Search by diagnosis, treatment...'
                    : 'Search by patient, diagnosis, treatment...'
                "
              />
            </div>
          </div>
          <div class="col-md-6">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="amended">Amended</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="alert alert-danger alert-dismissible fade show"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !error" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading medical records...</p>
    </div>

    <!-- Records Table -->
    <div v-else class="card animate-fade-in-up animation-delay-300">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-file-medical-fill me-2"></i>
          {{ isPatient ? "My Medical Records" : "Medical Records" }}
          ({{ filteredRecords.length }})
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchMedicalRecords"
          :disabled="loading"
        >
          <i
            class="bi bi-arrow-clockwise me-1"
            :class="{ 'animate-spin': loading }"
          ></i>
          Refresh
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th v-if="isStaff">Patient</th>
                <th>Date</th>
                <th>Diagnosis</th>
                <th>Treatment</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.MedicalRecordID"
                class="animate-fade-in-up"
              >
                <!-- Patient Column (Staff only) -->
                <td v-if="isStaff">
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-2">
                      <i class="bi bi-person-circle fs-4 text-muted"></i>
                    </div>
                    <div>
                      <div class="fw-medium">{{ getPatientName(record) }}</div>
                      <small class="text-muted"
                        >ID: {{ record.PatientID }}</small
                      >
                    </div>
                  </div>
                </td>

                <!-- Date -->
                <td>
                  <div>{{ formatDate(record.CreatedAt) }}</div>
                  <small class="text-muted">{{ getStaffName(record) }}</small>
                </td>

                <!-- Diagnosis -->
                <td>
                  <div class="fw-medium">{{ getDiagnosisName(record) }}</div>
                  <small
                    v-if="record.VitalSigns?.BloodPressure"
                    class="text-muted"
                  >
                    BP: {{ record.VitalSigns.BloodPressure }}
                  </small>
                </td>

                <!-- Treatment -->
                <td>
                  <div>{{ getTreatmentName(record) }}</div>
                  <small v-if="record.Notes" class="text-muted">
                    {{ record.Notes.substring(0, 40) }}...
                  </small>
                </td>

                <!-- Status -->
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(record.Status)}`"
                  >
                    {{ record.Status }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(record)"
                      title="View Details"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      v-if="canEdit"
                      class="btn btn-sm btn-outline-primary"
                      @click="openEditModal(record)"
                      title="Edit Record"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-success"
                      @click="exportRecord(record)"
                      title="Export Record"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="printRecord(record)"
                      title="Print Record"
                    >
                      <i class="bi bi-printer"></i>
                    </button>
                    <button
                      v-if="canEdit"
                      class="btn btn-sm btn-outline-danger"
                      @click="openDeleteModal(record)"
                      title="Delete Record"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRecords.length === 0" class="text-center py-5">
          <i class="bi bi-file-medical text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No medical records found</h5>
          <p class="text-muted mb-3">
            {{
              search || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria."
                : isPatient
                  ? "No medical records are available yet."
                  : "No medical records have been created yet."
            }}
          </p>
          <button
            v-if="canEdit && !search"
            class="btn btn-primary"
            @click="openCreateModal"
          >
            <i class="bi bi-plus-lg me-2"></i>
            Create First Record
          </button>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div
      class="modal fade"
      :class="{ show: showViewModal }"
      :style="{ display: showViewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-file-medical me-2"></i>
              Medical Record Details
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedRecord">
            <div class="row g-3">
              <div class="col-md-6" v-if="isStaff">
                <label class="form-label fw-medium">Patient</label>
                <p>{{ getPatientName(selectedRecord) }}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-medium">Healthcare Provider</label>
                <p>{{ getStaffName(selectedRecord) }}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-medium">Date</label>
                <p>{{ formatDateTime(selectedRecord.CreatedAt) }}</p>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-medium">Status</label>
                <p>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(selectedRecord.Status)}`"
                  >
                    {{ selectedRecord.Status }}
                  </span>
                </p>
              </div>
              <div class="col-md-12">
                <label class="form-label fw-medium">Diagnosis</label>
                <p>{{ getDiagnosisName(selectedRecord) }}</p>
              </div>
              <div class="col-md-12">
                <label class="form-label fw-medium">Treatment</label>
                <p>{{ getTreatmentName(selectedRecord) }}</p>
              </div>
              <div class="col-md-12" v-if="selectedRecord.Notes">
                <label class="form-label fw-medium">Notes</label>
                <p>{{ selectedRecord.Notes }}</p>
              </div>
              <div class="col-md-12" v-if="selectedRecord.VitalSigns">
                <label class="form-label fw-medium">Vital Signs</label>
                <div class="row g-2">
                  <div
                    class="col-md-4"
                    v-if="selectedRecord.VitalSigns.BloodPressure"
                  >
                    <small class="text-muted">Blood Pressure:</small>
                    <p class="mb-0">
                      {{ selectedRecord.VitalSigns.BloodPressure }}
                    </p>
                  </div>
                  <div
                    class="col-md-4"
                    v-if="selectedRecord.VitalSigns.HeartRate"
                  >
                    <small class="text-muted">Heart Rate:</small>
                    <p class="mb-0">
                      {{ selectedRecord.VitalSigns.HeartRate }}
                    </p>
                  </div>
                  <div
                    class="col-md-4"
                    v-if="selectedRecord.VitalSigns.Temperature"
                  >
                    <small class="text-muted">Temperature:</small>
                    <p class="mb-0">
                      {{ selectedRecord.VitalSigns.Temperature }}
                    </p>
                  </div>
                  <div class="col-md-4" v-if="selectedRecord.VitalSigns.Weight">
                    <small class="text-muted">Weight:</small>
                    <p class="mb-0">{{ selectedRecord.VitalSigns.Weight }}</p>
                  </div>
                  <div class="col-md-4" v-if="selectedRecord.VitalSigns.Height">
                    <small class="text-muted">Height:</small>
                    <p class="mb-0">{{ selectedRecord.VitalSigns.Height }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-outline-success"
              @click="exportRecord(selectedRecord)"
            >
              <i class="bi bi-download me-2"></i>Export
            </button>
            <button
              class="btn btn-outline-secondary"
              @click="printRecord(selectedRecord)"
            >
              <i class="bi bi-printer me-2"></i>Print
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModals"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      class="modal fade"
      :class="{ show: showCreateModal || showEditModal }"
      :style="{ display: showCreateModal || showEditModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-file-medical me-2"></i>
              {{
                showCreateModal ? "New Medical Record" : "Edit Medical Record"
              }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form
            @submit.prevent="showCreateModal ? createRecord() : updateRecord()"
          >
            <div class="modal-body">
              <div class="row g-3">
                <!-- Patient Selection -->
                <div class="col-md-12">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="recordForm.PatientID"
                    class="form-select"
                    required
                    :disabled="showEditModal"
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.FirstName }} {{ patient.Surname }}
                    </option>
                  </select>
                </div>

                <!-- Diagnosis -->
                <div class="col-md-6">
                  <label class="form-label">Diagnosis</label>
                  <select v-model="recordForm.DiagnosisID" class="form-select">
                    <option value="">Select Diagnosis</option>
                    <option
                      v-for="diagnosis in diagnosesList"
                      :key="diagnosis.DiagnosisID"
                      :value="diagnosis.DiagnosisID"
                    >
                      {{ diagnosis.DiagnosisName }}
                    </option>
                  </select>
                </div>

                <!-- Treatment -->
                <div class="col-md-6">
                  <label class="form-label">Treatment</label>
                  <select v-model="recordForm.TreatmentID" class="form-select">
                    <option value="">Select Treatment</option>
                    <option
                      v-for="treatment in treatmentsList"
                      :key="treatment.TreatmentID"
                      :value="treatment.TreatmentID"
                    >
                      {{ treatment.TreatmentName }}
                    </option>
                  </select>
                </div>

                <!-- Status -->
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="recordForm.Status" class="form-select">
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                    <option value="Amended">Amended</option>
                  </select>
                </div>

                <!-- Notes -->
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="recordForm.Notes"
                    class="form-control"
                    rows="3"
                    placeholder="Additional notes..."
                  ></textarea>
                </div>

                <!-- Vital Signs -->
                <div class="col-md-12">
                  <label class="form-label fw-medium">Vital Signs</label>
                  <div class="row g-2">
                    <div class="col-md-4">
                      <label class="form-label small">Blood Pressure</label>
                      <input
                        v-model="recordForm.VitalSigns.BloodPressure"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="120/80"
                      />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label small">Heart Rate</label>
                      <input
                        v-model="recordForm.VitalSigns.HeartRate"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="72 bpm"
                      />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label small">Temperature</label>
                      <input
                        v-model="recordForm.VitalSigns.Temperature"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="37°C"
                      />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label small">Weight</label>
                      <input
                        v-model="recordForm.VitalSigns.Weight"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="70 kg"
                      />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label small">Height</label>
                      <input
                        v-model="recordForm.VitalSigns.Height"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="175 cm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <i
                  class="bi me-2"
                  :class="[
                    loading
                      ? 'bi-hourglass animate-spin'
                      : showCreateModal
                        ? 'bi-plus-lg'
                        : 'bi-check-lg',
                  ]"
                ></i>
                {{
                  loading
                    ? "Saving..."
                    : showCreateModal
                      ? "Create Record"
                      : "Update Record"
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showDeleteModal }"
      :style="{ display: showDeleteModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Delete Medical Record
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this medical record?</p>
            <div v-if="selectedRecord" class="alert alert-warning">
              <strong>{{ getPatientName(selectedRecord) }}</strong
              ><br />
              <small>Diagnosis: {{ getDiagnosisName(selectedRecord) }}</small
              ><br />
              <small>Date: {{ formatDate(selectedRecord.CreatedAt) }}</small>
            </div>
            <p class="text-muted mb-0">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModals"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteRecord"
              :disabled="loading"
            >
              <i
                class="bi bi-trash me-2"
                :class="{ 'animate-spin': loading }"
              ></i>
              {{ loading ? "Deleting..." : "Delete Record" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        showViewModal || showCreateModal || showEditModal || showDeleteModal
      "
      class="modal-backdrop fade show"
      @click="closeModals"
    ></div>
  </div>
</template>

<style scoped>
.medical-records-view {
  padding: 1rem;
}

.stats-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-box {
  position: relative;
}

.search-box .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
}

.search-box input {
  padding-left: 36px;
}

.patient-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.animate-fade-in-left {
  animation: fadeInLeft 0.5s ease-out;
}

.animate-fade-in-right {
  animation: fadeInRight 0.5s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}

.animation-delay-100 {
  animation-delay: 0.1s;
}

.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-300 {
  animation-delay: 0.3s;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
