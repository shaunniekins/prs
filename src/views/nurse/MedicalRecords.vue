<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useMedicalRecordsStore } from "@/stores/medicalRecords";
import { useRealtime } from "@/composables/useRealtime";

// Composables and stores
const authStore = useAuthStore();
const medicalRecordsStore = useMedicalRecordsStore();
const { subscribeToTable, unsubscribe } = useRealtime();

// Reactive data
const loading = ref(false);
const search = ref("");
const showAddModal = ref(false);

// Watch for search changes and update store
watch(search, (newSearch) => {
  medicalRecordsStore.setSearch(newSearch);
});
const showEditModal = ref(false);
const showViewModal = ref(false);
const selectedRecord = ref(null);
const filterStatus = ref("all");
const filterType = ref("all");
const realtimeSubscription = ref(null);

// Patient search state
const patientSearchQuery = ref("");
const patientSearchResults = ref([]);
const patientSearchLoading = ref(false);
const showPatientDropdown = ref(false);
const selectedPatient = ref(null);

// Form data
const recordForm = ref({
  PatientID: "",
  patientName: "",
  AppointmentID: "",
  Diagnosis: "",
  Treatment: "",
  Notes: "",
  VitalSigns: {
    BloodPressure: "",
    HeartRate: "",
    Temperature: "",
    Weight: "",
    Height: "",
    OxygenSaturation: "",
    RespiratoryRate: "",
  },
  Status: "Draft",
  Type: "Consultation",
});

// Validation errors
const validationErrors = ref({});

// Computed properties
const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const isNurse = computed(() => authStore.isNurse);

const filteredRecords = computed(() => {
  return medicalRecordsStore.filteredRecords;
});

const draftRecords = computed(() => {
  return medicalRecordsStore.draftRecords;
});

const recentRecords = computed(() => {
  return medicalRecordsStore.recentRecords;
});

const totalRecords = computed(() => {
  return medicalRecordsStore.totalRecords;
});

// Methods
const fetchMedicalRecords = async () => {
  if (!isAuthenticated.value || !isNurse.value) {
    console.error("Unauthorized access to medical records");
    return;
  }

  loading.value = true;
  try {
    const result = await medicalRecordsStore.fetchMedicalRecords();
    if (!result.success) {
      throw new Error(result.error || "Failed to fetch medical records");
    }
  } catch (error) {
    console.error("Error fetching medical records:", error);
    alert("Error loading medical records: " + error.message);
  } finally {
    loading.value = false;
  }
};

// Validation functions
const validateForm = () => {
  validationErrors.value = {};

  if (!recordForm.value.patientName?.trim()) {
    validationErrors.value.patientName = "Patient name is required";
  }

  if (!recordForm.value.Diagnosis?.trim()) {
    validationErrors.value.diagnosis = "Diagnosis is required";
  }

  if (!recordForm.value.Treatment?.trim()) {
    validationErrors.value.treatment = "Treatment is required";
  }

  // Validate vital signs if provided
  if (recordForm.value.VitalSigns?.BloodPressure) {
    const bpPattern = /^\d{2,3}\/\d{2,3}$/;
    if (!bpPattern.test(recordForm.value.VitalSigns.BloodPressure)) {
      validationErrors.value.bloodPressure =
        "Blood pressure must be in format: 120/80";
    }
  }

  return Object.keys(validationErrors.value).length === 0;
};

const resetForm = () => {
  recordForm.value = {
    PatientID: "",
    patientName: "",
    AppointmentID: "",
    Diagnosis: "",
    Treatment: "",
    Notes: "",
    VitalSigns: {
      BloodPressure: "",
      HeartRate: "",
      Temperature: "",
      Weight: "",
      Height: "",
      OxygenSaturation: "",
      RespiratoryRate: "",
    },
    Status: "Draft",
    Type: "Consultation",
  };
  validationErrors.value = {};
};

const openAddModal = () => {
  if (!isAuthenticated.value || !isNurse.value) {
    alert("You must be logged in as a nurse to create medical records");
    return;
  }
  resetForm();
  selectedRecord.value = null;
  showAddModal.value = true;
};

const openEditModal = (record) => {
  if (!isAuthenticated.value || !isNurse.value) {
    alert("You must be logged in as a nurse to edit medical records");
    return;
  }

  selectedRecord.value = record;
  recordForm.value = {
    PatientID: record.PatientID || record.patientId || "",
    patientName: record.Patient?.Users?.fullName || record.patientName || "",
    AppointmentID: record.AppointmentID || record.appointmentId || "",
    Diagnosis:
      record.Diagnosis?.DiagnosisName ||
      record.Diagnosis ||
      record.diagnosis ||
      "",
    Treatment:
      record.Treatment?.TreatmentName ||
      record.Treatment ||
      record.treatment ||
      "",
    Notes: record.Notes || record.notes || "",
    VitalSigns: {
      BloodPressure:
        record.VitalSigns?.BloodPressure ||
        record.vitalSigns?.bloodPressure ||
        "",
      HeartRate:
        record.VitalSigns?.HeartRate || record.vitalSigns?.heartRate || "",
      Temperature:
        record.VitalSigns?.Temperature || record.vitalSigns?.temperature || "",
      Weight: record.VitalSigns?.Weight || record.vitalSigns?.weight || "",
      Height: record.VitalSigns?.Height || record.vitalSigns?.height || "",
      OxygenSaturation:
        record.VitalSigns?.OxygenSaturation ||
        record.vitalSigns?.oxygenSaturation ||
        "",
      RespiratoryRate:
        record.VitalSigns?.RespiratoryRate ||
        record.vitalSigns?.respiratoryRate ||
        "",
    },
    Status: record.Status || record.status || "Draft",
    Type: record.Type || record.type || "Consultation",
  };
  showEditModal.value = true;
};

const openViewModal = (record) => {
  selectedRecord.value = record;
  showViewModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showViewModal.value = false;
  selectedRecord.value = null;
  resetForm();
};

const addRecord = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    loading.value = true;

    // Prepare record data for Supabase
    const recordData = {
      PatientID: recordForm.value.PatientID,
      AppointmentID: recordForm.value.AppointmentID || null,
      Diagnosis: recordForm.value.Diagnosis,
      Treatment: recordForm.value.Treatment,
      Notes: recordForm.value.Notes,
      VitalSigns: recordForm.value.VitalSigns,
      Status: recordForm.value.Status,
      Type: recordForm.value.Type,
      EnteredBy: user.value?.id,
    };

    const result = await medicalRecordsStore.createMedicalRecord(recordData);
    if (result) {
      closeModals();
      // Refresh the records list
      await fetchMedicalRecords();
    } else {
      throw new Error("Failed to create medical record");
    }
  } catch (error) {
    console.error("Error adding record:", error);
    alert("Error creating medical record: " + error.message);
  } finally {
    loading.value = false;
  }
};

const updateRecord = async () => {
  if (!validateForm() || !selectedRecord.value) {
    return;
  }

  try {
    loading.value = true;

    // Prepare update data for Supabase
    const updateData = {
      PatientID: recordForm.value.PatientID,
      AppointmentID: recordForm.value.AppointmentID || null,
      Diagnosis: recordForm.value.Diagnosis,
      Treatment: recordForm.value.Treatment,
      Notes: recordForm.value.Notes,
      VitalSigns: recordForm.value.VitalSigns,
      Status: recordForm.value.Status,
      Type: recordForm.value.Type,
    };

    const recordId =
      selectedRecord.value.MedicalRecordID || selectedRecord.value.id;
    const result = await medicalRecordsStore.updateMedicalRecord(
      recordId,
      updateData
    );

    if (result.success) {
      closeModals();
      // Refresh the records list
      await fetchMedicalRecords();
    } else {
      throw new Error(result.error || "Failed to update medical record");
    }
  } catch (error) {
    console.error("Error updating record:", error);
    alert("Error updating medical record: " + error.message);
  } finally {
    loading.value = false;
  }
};

// Helper functions
const getStatusBadgeVariant = (status) => {
  return medicalRecordsStore.getStatusBadgeVariant(status);
};

const getTypeBadgeVariant = (type) => {
  const variants = {
    Consultation: "primary",
    "Follow-up": "info",
    Vaccination: "success",
    Emergency: "danger",
  };
  return variants[type] || "secondary";
};

const formatDateTime = (dateTime) => {
  return medicalRecordsStore.formatDateTime(dateTime);
};

const getPatientName = (record) => {
  return (
    record.Patient?.Users?.fullName || record.patientName || "Unknown Patient"
  );
};

const getStaffName = (record) => {
  return medicalRecordsStore.getStaffName(record);
};

const getDiagnosisName = (record) => {
  return medicalRecordsStore.getDiagnosisName(record);
};

const getTreatmentName = (record) => {
  return medicalRecordsStore.getTreatmentName(record);
};

const exportRecord = (record) => {
  const exportData = {
    patientName: getPatientName(record),
    staffName: getStaffName(record),
    date: formatDateTime(record.created_at),
    diagnosis: getDiagnosisName(record),
    treatment: getTreatmentName(record),
    notes: record.Notes || record.notes || "",
    vitalSigns: record.VitalSigns || record.vitalSigns || {},
    status: record.Status || record.status || "",
    type: record.Type || record.type || "",
  };

  console.log("Exporting record:", exportData);

  // Create a simple text export
  const exportText = `
MEDICAL RECORD EXPORT
=====================

Patient: ${exportData.patientName}
Healthcare Provider: ${exportData.staffName}
Date: ${exportData.date}
Status: ${exportData.status}
Type: ${exportData.type}

Diagnosis:
${exportData.diagnosis}

Treatment:
${exportData.treatment}

Notes:
${exportData.notes || "No additional notes"}

Vital Signs:
${Object.entries(exportData.vitalSigns)
  .map(([key, value]) => `${key}: ${value || "Not recorded"}`)
  .join("\n")}

Generated on: ${new Date().toLocaleString()}
  `.trim();

  // Create and download file
  const blob = new Blob([exportText], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medical-record-${record.MedicalRecordID || record.id}-${
    new Date().toISOString().split("T")[0]
  }.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
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
          <p><span class="label">Date:</span> ${formatDateTime(
            record.created_at
          )}</p>
        </div>

        <div class="section">
          <h3>Record Information</h3>
          <p><span class="label">Status:</span> ${
            record.Status || record.status
          }</p>
          <p><span class="label">Type:</span> ${record.Type || record.type}</p>
        </div>

        <div class="section">
          <h3>Medical Information</h3>
          <p><span class="label">Diagnosis:</span> ${getDiagnosisName(
            record
          )}</p>
          <p><span class="label">Treatment:</span> ${getTreatmentName(
            record
          )}</p>
          <p><span class="label">Notes:</span> ${
            record.Notes || record.notes || "No additional notes"
          }</p>
        </div>

        <div class="section">
          <h3>Vital Signs</h3>
          <div class="vital-signs">
            ${Object.entries(record.VitalSigns || record.vitalSigns || {})
              .filter(
                ([key]) =>
                  key !== "OxygenSaturation" && key !== "RespiratoryRate"
              )
              .map(
                ([key, value]) =>
                  `<div class="vital-sign"><span class="label">${key}:</span> ${
                    value || "Not recorded"
                  }</div>`
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

// Patient search methods
const searchPatients = async (query) => {
  if (!query || query.trim().length < 2) {
    patientSearchResults.value = [];
    showPatientDropdown.value = false;
    return;
  }

  patientSearchLoading.value = true;
  try {
    const result = await medicalRecordsStore.searchPatients(query);
    if (result.success) {
      patientSearchResults.value = result.data;
      showPatientDropdown.value = true;
    } else {
      console.error("Patient search error:", result.error);
      patientSearchResults.value = [];
      showPatientDropdown.value = false;
    }
  } catch (error) {
    console.error("Patient search error:", error);
    patientSearchResults.value = [];
    showPatientDropdown.value = false;
  } finally {
    patientSearchLoading.value = false;
  }
};

const selectPatient = (patient) => {
  selectedPatient.value = patient;
  recordForm.value.PatientID = patient.PatientID;
  recordForm.value.patientName = patient.Users?.fullName || "Unknown Patient";
  patientSearchQuery.value = "";
  patientSearchResults.value = [];
  showPatientDropdown.value = false;
};

const clearPatientSelection = () => {
  selectedPatient.value = null;
  recordForm.value.PatientID = "";
  recordForm.value.patientName = "";
  patientSearchQuery.value = "";
  patientSearchResults.value = [];
  showPatientDropdown.value = false;
};

const handlePatientSearchInput = (event) => {
  const query = event.target.value;
  patientSearchQuery.value = query;

  // Debounce search
  clearTimeout(window.patientSearchTimeout);
  window.patientSearchTimeout = setTimeout(() => {
    searchPatients(query);
  }, 300);
};

const hidePatientDropdown = () => {
  setTimeout(() => {
    showPatientDropdown.value = false;
  }, 150);
};

// Setup real-time subscription
const setupRealtimeSubscription = () => {
  if (realtimeSubscription.value) {
    unsubscribe(realtimeSubscription.value);
  }

  realtimeSubscription.value = subscribeToTable("MedicalRecord", (payload) => {
    console.log("Medical record real-time update:", payload);
    // Refresh data when changes are detected
    fetchMedicalRecords();
  });
};

// Lifecycle hooks
onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated && authStore.isNurse) {
    await fetchMedicalRecords();
    setupRealtimeSubscription();
  } else {
    console.warn(
      "User not authenticated as nurse, cannot load medical records"
    );
  }
});

onUnmounted(() => {
  if (realtimeSubscription.value) {
    unsubscribe(realtimeSubscription.value);
  }
});
</script>

<template>
  <div class="medical-records-management">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Medical Records</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Create and manage patient medical records
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-plus-circle me-2"></i>
          New Medical Record
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-file-medical text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ totalRecords }}</h4>
            <small class="text-muted">Total Records</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-pencil text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ draftRecords }}</h4>
            <small class="text-muted">Draft Records</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">{{ medicalRecordsStore.finalRecords }}</h4>
            <small class="text-muted">Final Records</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-info fs-2"></i>
            </div>
            <h4 class="mb-1">{{ recentRecords.length }}</h4>
            <small class="text-muted">Recent (7 days)</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Draft Records Alert -->
    <div
      v-if="draftRecords.length > 0"
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
        <button class="btn btn-warning btn-sm">
          <i class="bi bi-eye me-1"></i>
          Review Drafts
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-300">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search records by patient, staff, or diagnosis..."
              />
            </div>
          </div>
          <div class="col-md-4">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="amended">Amended</option>
            </select>
          </div>
          <div class="col-md-4">
            <select v-model="filterType" class="form-select">
              <option value="all">All Types</option>
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="vaccination">Vaccination</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading medical records...</p>
    </div>

    <!-- Records Table -->
    <div v-else class="card animate-fade-in-up animation-delay-400">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-file-medical-fill me-2"></i>
          Medical Records ({{ filteredRecords.length }})
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
                <th>Patient</th>
                <th>Healthcare Provider</th>
                <th>Diagnosis</th>
                <th>Treatment</th>
                <th>Status</th>
                <th>Date Created</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.MedicalRecordID || record.id"
                class="animate-fade-in-up"
              >
                <td>
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">{{ getPatientName(record) }}</div>
                      <small class="text-muted"
                        >ID:
                        {{
                          record.Patient?.PatientID || record.patientId
                        }}</small
                      >
                    </div>
                  </div>
                </td>
                <td>
                  <div class="fw-medium">{{ getStaffName(record) }}</div>
                  <small class="text-muted">{{
                    formatDateTime(record.created_at)
                  }}</small>
                </td>
                <td>
                  <div class="fw-medium">{{ getDiagnosisName(record) }}</div>
                  <small
                    v-if="
                      record.VitalSigns?.BloodPressure ||
                      record.vitalSigns?.bloodPressure
                    "
                    class="text-muted"
                  >
                    BP:
                    {{
                      record.VitalSigns?.BloodPressure ||
                      record.vitalSigns?.bloodPressure
                    }}
                  </small>
                </td>
                <td>
                  <div>{{ getTreatmentName(record) }}</div>
                  <small v-if="record.Notes || record.notes" class="text-muted"
                    >{{
                      (record.Notes || record.notes).substring(0, 50)
                    }}...</small
                  >
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(
                      record.Status || record.status
                    )}`"
                  >
                    {{ record.Status || record.status }}
                  </span>
                </td>
                <td>{{ new Date(record.created_at).toLocaleDateString() }}</td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(record)"
                      title="View Record"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
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
              search || filterStatus !== "all" || filterType !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No medical records have been created yet."
            }}
          </p>
          <button
            v-if="!search && filterStatus === 'all' && filterType === 'all'"
            class="btn btn-primary"
            @click="openAddModal"
          >
            <i class="bi bi-plus-circle me-2"></i>
            Create First Record
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Records Summary -->
    <div
      v-if="recentRecords.length > 0"
      class="card mt-4 animate-fade-in-up animation-delay-500"
    >
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-clock-history me-2"></i>
          Recent Records
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div
            v-for="record in recentRecords"
            :key="record.MedicalRecordID || record.id"
            class="col-md-12"
          >
            <div
              class="recent-record-card p-3 border rounded animate-fade-in-up"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-2">
                    <div class="patient-avatar-small me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <strong>{{ getPatientName(record) }}</strong>
                      <span
                        class="badge ms-2"
                        :class="`bg-${getStatusBadgeVariant(
                          record.Status || record.status
                        )}`"
                      >
                        {{ record.Status || record.status }}
                      </span>
                      <span
                        class="badge ms-2"
                        :class="`bg-${getTypeBadgeVariant(
                          record.Type || record.type
                        )}`"
                      >
                        {{ record.Type || record.type }}
                      </span>
                    </div>
                  </div>
                  <p class="mb-2">
                    <strong>Diagnosis:</strong> {{ getDiagnosisName(record) }}
                  </p>
                  <p class="mb-2">
                    <strong>Treatment:</strong> {{ getTreatmentName(record) }}
                  </p>
                  <small class="text-muted">
                    Created by {{ getStaffName(record) }} on
                    {{ formatDateTime(record.created_at) }}
                  </small>
                </div>
                <div class="text-end">
                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="openViewModal(record)"
                  >
                    <i class="bi bi-eye me-1"></i>
                    View
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="printRecord(record)"
                  >
                    <i class="bi bi-printer me-1"></i>
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Record Modal -->
    <div
      class="modal fade"
      :class="{ show: showAddModal }"
      :style="{ display: showAddModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Create New Medical Record
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient Search *</label>
                  <div class="position-relative">
                    <input
                      v-model="patientSearchQuery"
                      @input="handlePatientSearchInput"
                      @blur="hidePatientDropdown"
                      type="text"
                      class="form-control"
                      :class="{ 'is-invalid': validationErrors.patientName }"
                      placeholder="Search for patient by name..."
                      required
                    />
                    <div
                      v-if="patientSearchLoading"
                      class="position-absolute top-50 end-0 translate-middle-y me-3"
                    >
                      <div
                        class="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                    <!-- Patient Search Dropdown -->
                    <div
                      v-if="
                        showPatientDropdown && patientSearchResults.length > 0
                      "
                      class="patient-search-dropdown position-absolute w-100 mt-1 bg-white border rounded shadow-sm"
                      style="z-index: 1050; max-height: 200px; overflow-y: auto"
                    >
                      <div
                        v-for="patient in patientSearchResults"
                        :key="patient.PatientID"
                        @mousedown="selectPatient(patient)"
                        class="patient-search-item p-2 border-bottom cursor-pointer hover-bg-light"
                      >
                        <div class="d-flex align-items-center">
                          <div class="patient-avatar-small me-3">
                            <i class="bi bi-person-circle"></i>
                          </div>
                          <div>
                            <div class="fw-medium">
                              {{ patient.Users?.fullName || "Unknown Patient" }}
                            </div>
                            <small class="text-muted"
                              >ID: {{ patient.PatientID }}</small
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        showPatientDropdown &&
                        patientSearchResults.length === 0 &&
                        patientSearchQuery.length >= 2
                      "
                      class="patient-search-dropdown position-absolute w-100 mt-1 bg-white border rounded shadow-sm p-2 text-muted"
                      style="z-index: 1050"
                    >
                      No patients found
                    </div>
                  </div>
                  <div
                    v-if="validationErrors.patientName"
                    class="invalid-feedback d-block"
                  >
                    {{ validationErrors.patientName }}
                  </div>
                  <div v-if="selectedPatient" class="mt-2">
                    <small class="text-success">
                      <i class="bi bi-check-circle me-1"></i>
                      Selected: {{ recordForm.patientName }}
                    </small>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary ms-2"
                      @click="clearPatientSelection"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Record Type *</label>
                  <select
                    v-model="recordForm.Type"
                    class="form-select"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Diagnosis *</label>
                  <input
                    v-model="recordForm.Diagnosis"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.diagnosis }"
                    required
                  />
                  <div
                    v-if="validationErrors.diagnosis"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.diagnosis }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Treatment *</label>
                  <textarea
                    v-model="recordForm.Treatment"
                    class="form-control"
                    rows="3"
                    :class="{ 'is-invalid': validationErrors.treatment }"
                    required
                  ></textarea>
                  <div
                    v-if="validationErrors.treatment"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.treatment }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="recordForm.Notes"
                    class="form-control"
                    rows="3"
                    placeholder="Additional notes, observations, or recommendations"
                  ></textarea>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Vital Signs</label>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure</label>
                  <input
                    v-model="recordForm.VitalSigns.BloodPressure"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.bloodPressure }"
                    placeholder="e.g., 120/80"
                  />
                  <div
                    v-if="validationErrors.bloodPressure"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.bloodPressure }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="recordForm.VitalSigns.HeartRate"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 72"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="recordForm.VitalSigns.Temperature"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 36.8"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="recordForm.VitalSigns.Weight"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 70"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="recordForm.VitalSigns.Height"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 175"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="recordForm.Status" class="form-select">
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                  </select>
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
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-check-lg me-2"></i>
                Create Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Record Modal -->
    <div
      class="modal fade"
      :class="{ show: showEditModal }"
      :style="{ display: showEditModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Edit Medical Record
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient Search *</label>
                  <div class="position-relative">
                    <input
                      v-model="patientSearchQuery"
                      @input="handlePatientSearchInput"
                      @blur="hidePatientDropdown"
                      type="text"
                      class="form-control"
                      :class="{ 'is-invalid': validationErrors.patientName }"
                      placeholder="Search for patient by name..."
                      required
                    />
                    <div
                      v-if="patientSearchLoading"
                      class="position-absolute top-50 end-0 translate-middle-y me-3"
                    >
                      <div
                        class="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </div>
                    <!-- Patient Search Dropdown -->
                    <div
                      v-if="
                        showPatientDropdown && patientSearchResults.length > 0
                      "
                      class="patient-search-dropdown position-absolute w-100 mt-1 bg-white border rounded shadow-sm"
                      style="z-index: 1050; max-height: 200px; overflow-y: auto"
                    >
                      <div
                        v-for="patient in patientSearchResults"
                        :key="patient.PatientID"
                        @mousedown="selectPatient(patient)"
                        class="patient-search-item p-2 border-bottom cursor-pointer hover-bg-light"
                      >
                        <div class="d-flex align-items-center">
                          <div class="patient-avatar-small me-3">
                            <i class="bi bi-person-circle"></i>
                          </div>
                          <div>
                            <div class="fw-medium">
                              {{ patient.Users?.fullName || "Unknown Patient" }}
                            </div>
                            <small class="text-muted"
                              >ID: {{ patient.PatientID }}</small
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        showPatientDropdown &&
                        patientSearchResults.length === 0 &&
                        patientSearchQuery.length >= 2
                      "
                      class="patient-search-dropdown position-absolute w-100 mt-1 bg-white border rounded shadow-sm p-2 text-muted"
                      style="z-index: 1050"
                    >
                      No patients found
                    </div>
                  </div>
                  <div
                    v-if="validationErrors.patientName"
                    class="invalid-feedback d-block"
                  >
                    {{ validationErrors.patientName }}
                  </div>
                  <div v-if="selectedPatient" class="mt-2">
                    <small class="text-success">
                      <i class="bi bi-check-circle me-1"></i>
                      Selected: {{ recordForm.patientName }}
                    </small>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary ms-2"
                      @click="clearPatientSelection"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Record Type *</label>
                  <select
                    v-model="recordForm.Type"
                    class="form-select"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Diagnosis *</label>
                  <input
                    v-model="recordForm.Diagnosis"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.diagnosis }"
                    required
                  />
                  <div
                    v-if="validationErrors.diagnosis"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.diagnosis }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Treatment *</label>
                  <textarea
                    v-model="recordForm.Treatment"
                    class="form-control"
                    rows="3"
                    :class="{ 'is-invalid': validationErrors.treatment }"
                    required
                  ></textarea>
                  <div
                    v-if="validationErrors.treatment"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.treatment }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="recordForm.Notes"
                    class="form-control"
                    rows="3"
                  ></textarea>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Vital Signs</label>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure</label>
                  <input
                    v-model="recordForm.VitalSigns.BloodPressure"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.bloodPressure }"
                  />
                  <div
                    v-if="validationErrors.bloodPressure"
                    class="invalid-feedback"
                  >
                    {{ validationErrors.bloodPressure }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="recordForm.VitalSigns.HeartRate"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="recordForm.VitalSigns.Temperature"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="recordForm.VitalSigns.Weight"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="recordForm.VitalSigns.Height"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="recordForm.Status" class="form-select">
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                    <option value="Amended">Amended</option>
                  </select>
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
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-check-lg me-2"></i>
                Update Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Record Modal -->
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
              <div class="col-md-12">
                <div
                  class="record-header d-flex align-items-center mb-4 p-3 bg-light rounded"
                >
                  <div class="patient-avatar-large me-3">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <div>
                    <h4 class="mb-1">{{ selectedRecord.patientName }}</h4>
                    <p class="text-muted mb-1">
                      Patient ID:
                      {{
                        selectedRecord.Patient?.PatientID ||
                        selectedRecord.patientId
                      }}
                    </p>
                    <p class="text-muted mb-0">
                      Record ID: {{ selectedRecord.id }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Record Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Healthcare Provider:</strong>
                    {{ getStaffName(selectedRecord) }}
                  </div>
                  <div class="info-item">
                    <strong>Record Type:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getTypeBadgeVariant(
                        selectedRecord.Type || selectedRecord.type
                      )}`"
                    >
                      {{ selectedRecord.Type || selectedRecord.type }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Created:</strong>
                    {{ formatDateTime(selectedRecord.created_at) }}
                  </div>
                  <div class="info-item">
                    <strong>Last Updated:</strong>
                    {{ formatDateTime(selectedRecord.updated_at) }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        selectedRecord.Status || selectedRecord.status
                      )}`"
                    >
                      {{ selectedRecord.Status || selectedRecord.status }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Vital Signs</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Blood Pressure:</strong>
                    {{
                      selectedRecord.VitalSigns?.BloodPressure ||
                      selectedRecord.vitalSigns?.bloodPressure ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Heart Rate:</strong>
                    {{
                      selectedRecord.VitalSigns?.HeartRate ||
                      selectedRecord.vitalSigns?.heartRate ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Temperature:</strong>
                    {{
                      selectedRecord.VitalSigns?.Temperature ||
                      selectedRecord.vitalSigns?.temperature ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Weight:</strong>
                    {{
                      selectedRecord.VitalSigns?.Weight ||
                      selectedRecord.vitalSigns?.weight ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Height:</strong>
                    {{
                      selectedRecord.VitalSigns?.Height ||
                      selectedRecord.vitalSigns?.height ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Oxygen Saturation:</strong>
                    {{
                      selectedRecord.VitalSigns?.OxygenSaturation ||
                      selectedRecord.vitalSigns?.oxygenSaturation ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Respiratory Rate:</strong>
                    {{
                      selectedRecord.VitalSigns?.RespiratoryRate ||
                      selectedRecord.vitalSigns?.respiratoryRate ||
                      "Not recorded"
                    }}
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Medical Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Diagnosis:</strong>
                    {{ getDiagnosisName(selectedRecord) }}
                  </div>
                  <div class="info-item">
                    <strong>Treatment:</strong>
                    {{ getTreatmentName(selectedRecord) }}
                  </div>
                  <div class="info-item">
                    <strong>Notes:</strong>
                    {{
                      selectedRecord.Notes ||
                      selectedRecord.notes ||
                      "No additional notes"
                    }}
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
              Close
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="openEditModal(selectedRecord)"
            >
              <i class="bi bi-pencil me-2"></i>
              Edit Record
            </button>
            <button
              type="button"
              class="btn btn-success"
              @click="exportRecord(selectedRecord)"
            >
              <i class="bi bi-download me-2"></i>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showAddModal || showEditModal || showViewModal"
      class="modal-backdrop fade show"
      @click="closeModals"
    ></div>
  </div>
</template>

<style scoped>
.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  z-index: 10;
}

.search-box input {
  padding-left: 40px;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.patient-avatar-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.patient-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.stats-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.table th {
  border-top: none;
  font-weight: 600;
  color: var(--text-color);
  background-color: rgba(0, 0, 0, 0.02);
}

.table td {
  vertical-align: middle;
  border-color: rgba(0, 0, 0, 0.05);
}

.record-header {
  background: linear-gradient(
    135deg,
    rgba(67, 97, 238, 0.1),
    rgba(63, 55, 201, 0.1)
  );
}

.info-group {
  background-color: rgba(0, 0, 0, 0.02);
  padding: 1rem;
  border-radius: 8px;
}

.info-item {
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.recent-record-card {
  background-color: var(--light-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.recent-record-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.alert-icon {
  flex-shrink: 0;
}

/* Animation for spinner */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .btn {
    flex: 1;
  }
}
</style>
