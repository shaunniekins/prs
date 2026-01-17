<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "@/composables/useSupabase.js";
import { useAuthStore } from "@/stores/auth.js";

// Auth store
const authStore = useAuthStore();

// Initialize Supabase composable
const {
  medicalRecords: medicalRecordOps,
  patients: patientOps,
  diagnoses: diagnosisOps,
  treatments: treatmentOps,
  loading,
  error,
} = useSupabase();

// Reactive data from Supabase
const medicalRecords = ref([]);
const patients = ref([]);
const diagnoses = ref([]);
const treatments = ref([]);

// Reactive state
const search = ref("");
const filterStatus = ref("all");
const filterType = ref("all");
const selectedRecord = ref(null);

// Modal states
const showViewModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showCreateModal = ref(false);

// Pagination
const currentPage = ref(1);
const recordsPerPage = ref(10);

// Form data
const recordForm = ref({
  patientId: "",
  diagnosisId: "",
  treatmentId: "",
  notes: "",
  vitalSigns: {
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
  },
  status: "Draft",
});

// Validation
const formErrors = ref({});

// Computed properties
const filteredRecords = computed(() => {
  let filtered = medicalRecords.value;

  // Apply search filter
  if (search.value) {
    const searchLower = search.value.toLowerCase();
    filtered = filtered.filter((record) => {
      const patientName = getPatientName(record).toLowerCase();
      const staffName = getStaffName(record).toLowerCase();
      const diagnosis = getDiagnosisName(record).toLowerCase();
      const treatment = getTreatmentName(record).toLowerCase();

      return (
        patientName.includes(searchLower) ||
        staffName.includes(searchLower) ||
        diagnosis.includes(searchLower) ||
        treatment.includes(searchLower)
      );
    });
  }

  // Apply status filter
  if (filterStatus.value !== "all") {
    filtered = filtered.filter(
      (record) => record.Status === filterStatus.value
    );
  }

  // Apply type filter
  if (filterType.value !== "all") {
    filtered = filtered.filter((record) => {
      const diagnosis = getDiagnosisName(record);
      return diagnosis.toLowerCase().includes(filterType.value.toLowerCase());
    });
  }

  return filtered;
});

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * recordsPerPage.value;
  const end = start + recordsPerPage.value;
  return filteredRecords.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredRecords.value.length / recordsPerPage.value);
});

const recentRecords = computed(() => {
  return medicalRecords.value
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
});

const stats = computed(() => {
  const total = medicalRecords.value.length;
  const drafts = medicalRecords.value.filter(
    (r) => r.Status === "Draft"
  ).length;
  const finals = medicalRecords.value.filter(
    (r) => r.Status === "Final"
  ).length;
  const amended = medicalRecords.value.filter(
    (r) => r.Status === "Amended"
  ).length;

  return { total, drafts, finals, amended };
});

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, 6, total);
    } else if (current >= total - 3) {
      pages.push(
        1,
        total - 5,
        total - 4,
        total - 3,
        total - 2,
        total - 1,
        total
      );
    } else {
      pages.push(
        1,
        current - 2,
        current - 1,
        current,
        current + 1,
        current + 2,
        total
      );
    }
  }

  return pages;
});

// CRUD operations with backend integration
const createMedicalRecord = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    const result = await medicalRecordOps.createMedicalRecord(recordForm.value);
    if (result.success) {
      // Refresh data
      const recordsResult = await medicalRecordOps.getAllMedicalRecords();
      if (recordsResult.success) {
        medicalRecords.value = recordsResult.data;
      }
      closeCreateModal();
      alert("Record created successfully");
    } else {
      alert("Failed to create record: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error creating medical record:", err);
    alert(
      "Error creating record: " + (err.message || "Unknown error occurred")
    );
  }
};

const updateMedicalRecord = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    await medicalRecordOps.updateMedicalRecord(
      selectedRecord.value.MedicalRecordID,
      recordForm.value
    );
    // Refresh data
    const data = await medicalRecordOps.getAllMedicalRecords();
    medicalRecords.value = data;
    closeEditModal();
    alert("Record updated successfully");
  } catch (err) {
    console.error("Error updating medical record:", err);
    alert(
      "Error updating record: " + (err.message || "Unknown error occurred")
    );
  }
};

const deleteMedicalRecord = () => {
  medicalRecords.value = medicalRecords.value.filter(
    (record) => record.MedicalRecordID !== selectedRecord.value.MedicalRecordID
  );

  closeDeleteModal();
  alert("Record deleted successfully (mock)");
};

// Form validation
const validateForm = () => {
  formErrors.value = {};

  if (!recordForm.value.patientId) {
    formErrors.value.patientId = "Patient is required";
  }

  if (!recordForm.value.diagnosisId) {
    formErrors.value.diagnosisId = "Diagnosis is required";
  }

  if (!recordForm.value.treatmentId) {
    formErrors.value.treatmentId = "Treatment is required";
  }

  return Object.keys(formErrors.value).length === 0;
};

// Modal management
const resetForm = () => {
  recordForm.value = {
    patientId: "",
    diagnosisId: "",
    treatmentId: "",
    notes: "",
    vitalSigns: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
    },
    status: "Draft",
  };
  formErrors.value = {};
};

const openViewModal = (record) => {
  selectedRecord.value = record;
  showViewModal.value = true;
};

const openEditModal = (record) => {
  selectedRecord.value = record;
  recordForm.value = {
    patientId: record.PatientID || "",
    diagnosisId: record.DiagnosisID || "",
    treatmentId: record.TreatmentID || "",
    notes: record.Notes || "",
    vitalSigns: {
      bloodPressure: record.VitalSigns?.bloodPressure || "",
      heartRate: record.VitalSigns?.heartRate || "",
      temperature: record.VitalSigns?.temperature || "",
      weight: record.VitalSigns?.weight || "",
      height: record.VitalSigns?.height || "",
    },
    status: record.Status || "Draft",
  };
  showEditModal.value = true;
};

const openCreateModal = () => {
  resetForm();
  showCreateModal.value = true;
};

const openDeleteModal = (record) => {
  selectedRecord.value = record;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showViewModal.value = false;
  showEditModal.value = false;
  showDeleteModal.value = false;
  showCreateModal.value = false;
  selectedRecord.value = null;
  resetForm();
};

const closeViewModal = () => {
  showViewModal.value = false;
  selectedRecord.value = null;
};

const closeEditModal = () => {
  showEditModal.value = false;
  selectedRecord.value = null;
  resetForm();
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  resetForm();
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  selectedRecord.value = null;
};

// Helper functions
const getPatientName = (record) => {
  const patient = patients.value.find((p) => p.PatientID === record.PatientID);
  return patient?.Users?.fullName || "Unknown Patient";
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

// Pagination methods
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Removed real-time subscription as Supabase is no longer used

// Removed loading and error states as they are no longer needed

// Export functionality
const exportRecord = (record) => {
  const exportData = {
    patientName: getPatientName(record),
    date: formatDateTime(record.created_at),
    diagnosis: getDiagnosisName(record),
    treatment: getTreatmentName(record),
    notes: record.Notes,
    vitalSigns: record.VitalSigns,
    staffName: getStaffName(record),
  };

  console.log("Exporting record:", exportData);
  // In a real application, this would generate a PDF or export file
  alert("Record export functionality would be implemented here");
};

const printRecord = (record) => {
  console.log("Printing record:", record);
  // In a real application, this would open a print dialog
  alert("Print functionality would be implemented here");
};

// Removed watch as it's no longer necessary with mock data

// Initialize component
onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (!authStore.isAuthenticated || !authStore.user) {
    console.error("User not authenticated");
    return;
  }

  try {
    // Fetch medical records
    const recordsResult = await medicalRecordOps.getAllMedicalRecords();
    if (recordsResult.success) {
      medicalRecords.value = recordsResult.data;
    }

    // Fetch patients
    const patientsResult = await patientOps.getAllPatients();
    if (patientsResult.success) {
      patients.value = patientsResult.data;
    }

    // Fetch diagnoses
    const diagnosesResult = await diagnosisOps.getAllDiagnoses();
    if (diagnosesResult.success) {
      diagnoses.value = diagnosesResult.data;
    }

    // Fetch treatments
    const treatmentsResult = await treatmentOps.getAllTreatments();
    if (treatmentsResult.success) {
      treatments.value = treatmentsResult.data;
    }
  } catch (err) {
    console.error("Error initializing medical records:", err);
    alert(
      "Failed to load medical records data. Please refresh the page or contact support if the problem persists."
    );
    // Set data to empty arrays to prevent further errors and maintain component stability
    medicalRecords.value = [];
    patients.value = [];
    diagnoses.value = [];
    treatments.value = [];
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
          Manage and oversee patient medical records
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary me-2" @click="openCreateModal">
          <i class="bi bi-plus-lg me-2"></i>
          Add Record (Mock)
        </button>
        <div class="btn-group">
          <button
            class="btn btn-outline-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            disabled
          >
            <i class="bi bi-download me-2"></i>
            Export (Disabled)
          </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="#" @click.prevent
                ><i class="bi bi-file-earmark-spreadsheet me-2"></i>Export All
                (CSV) - Disabled</a
              >
            </li>
            <li>
              <a class="dropdown-item" href="#" @click.prevent
                ><i class="bi bi-file-earmark-pdf me-2"></i>Export All (PDF) -
                Disabled</a
              >
            </li>
          </ul>
        </div>
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
            <h4 class="mb-1">{{ stats.total }}</h4>
            <small class="text-muted">Total Records</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ stats.drafts }}</h4>
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
            <h4 class="mb-1">{{ stats.finals }}</h4>
            <small class="text-muted">Final Records</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-week text-info fs-2"></i>
            </div>
            <h4 class="mb-1">{{ recentRecords.length }}</h4>
            <small class="text-muted">Recent (7 days)</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
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
              <option value="hypertension">Hypertension</option>
              <option value="diabetes">Diabetes</option>
              <option value="vaccination">Vaccination</option>
              <option value="consultation">Consultation</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Records Table -->
    <div class="card animate-fade-in-up animation-delay-300">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-file-medical-fill me-2"></i>
          Medical Records ({{ filteredRecords.length }})
        </h5>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Patient</th>
                <th>Diagnosis</th>
                <th>Treatment</th>
                <th>Status</th>
                <th>Date Created</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in paginatedRecords"
                :key="record.MedicalRecordID"
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
                        >ID: {{ record.PatientID }}</small
                      >
                    </div>
                  </div>
                </td>
                <td>
                  <div class="fw-medium">{{ getDiagnosisName(record) }}</div>
                  <small
                    v-if="record.VitalSigns?.bloodPressure"
                    class="text-muted"
                  >
                    BP: {{ record.VitalSigns.bloodPressure }}
                  </small>
                </td>
                <td>
                  <div>{{ getTreatmentName(record) }}</div>
                  <small v-if="record.Notes" class="text-muted"
                    >{{ record.Notes.substring(0, 50) }}...</small
                  >
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(record.Status)}`"
                  >
                    {{ record.Status }}
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
                      title="Edit Record (Mock)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-success"
                      @click="exportRecord(record)"
                      title="Export Record (Mock)"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="openDeleteModal(record)"
                      title="Delete Record (Mock)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="filteredRecords.length > recordsPerPage" class="card-footer">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <small class="text-muted">
                Showing {{ (currentPage - 1) * recordsPerPage + 1 }} to
                {{
                  Math.min(currentPage * recordsPerPage, filteredRecords.length)
                }}
                of {{ filteredRecords.length }} records
              </small>
            </div>
            <nav aria-label="Medical records pagination">
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button
                    class="page-link"
                    @click="prevPage"
                    :disabled="currentPage === 1"
                  >
                    <i class="bi bi-chevron-left"></i>
                  </button>
                </li>

                <li
                  v-for="page in visiblePages"
                  :key="page"
                  class="page-item"
                  :class="{ active: currentPage === page }"
                >
                  <button class="page-link" @click="goToPage(page)">
                    {{ page }}
                  </button>
                </li>

                <li
                  class="page-item"
                  :class="{ disabled: currentPage === totalPages }"
                >
                  <button
                    class="page-link"
                    @click="nextPage"
                    :disabled="currentPage === totalPages"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRecords.length === 0" class="text-center py-5">
          <i class="bi bi-file-medical text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No medical records found</h5>
          <p class="text-muted mb-3">
            {{
              search.value ||
              filterStatus.value !== "all" ||
              filterType.value !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No medical records have been created yet."
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Records Summary -->
    <div
      v-if="recentRecords.length > 0"
      class="card mt-4 animate-fade-in-up animation-delay-400"
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
            :key="record.MedicalRecordID"
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
                        :class="`bg-${getStatusBadgeVariant(record.Status)}`"
                      >
                        {{ record.Status }}
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
                    View (Mock)
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="printRecord(record)"
                  >
                    <i class="bi bi-printer me-1"></i>
                    Print (Mock)
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                    <h4 class="mb-1">{{ getPatientName(selectedRecord) }}</h4>
                    <p class="text-muted mb-1">
                      Patient ID: {{ selectedRecord.PatientID }}
                    </p>
                    <p class="text-muted mb-0">
                      Record ID: {{ selectedRecord.MedicalRecordID }}
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
                        selectedRecord.Status
                      )}`"
                    >
                      {{ selectedRecord.Status }}
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
                      selectedRecord.VitalSigns?.bloodPressure || "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Heart Rate:</strong>
                    {{ selectedRecord.VitalSigns?.heartRate || "Not recorded" }}
                  </div>
                  <div class="info-item">
                    <strong>Temperature:</strong>
                    {{
                      selectedRecord.VitalSigns?.temperature || "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Weight:</strong>
                    {{ selectedRecord.VitalSigns?.weight || "Not recorded" }}
                  </div>
                  <div class="info-item">
                    <strong>Height:</strong>
                    {{ selectedRecord.VitalSigns?.height || "Not recorded" }}
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
                    {{ selectedRecord.Notes || "No additional notes" }}
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
              Edit Record (Mock)
            </button>
            <button
              type="button"
              class="btn btn-success"
              @click="exportRecord(selectedRecord)"
            >
              <i class="bi bi-download me-2"></i>
              Export (Mock)
            </button>
          </div>
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
          <form @submit.prevent="updateMedicalRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-12">
                  <label class="form-label">Diagnosis *</label>
                  <input
                    v-model="recordForm.diagnosis"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Treatment *</label>
                  <textarea
                    v-model="recordForm.treatment"
                    class="form-control"
                    rows="3"
                    required
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="recordForm.notes"
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
                    v-model="recordForm.vitalSigns.bloodPressure"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="recordForm.vitalSigns.heartRate"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 72"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="recordForm.vitalSigns.temperature"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 36.8"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="recordForm.vitalSigns.weight"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 70"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="recordForm.vitalSigns.height"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 175"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="recordForm.status" class="form-select">
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

    <!-- Create Record Modal -->
    <div
      class="modal fade"
      :class="{ show: showCreateModal }"
      :style="{ display: showCreateModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-lg me-2"></i>
              Create Medical Record
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeCreateModal"
            ></button>
          </div>
          <form @submit.prevent="createMedicalRecord">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-12">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="recordForm.patientId"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.patientId }"
                    required
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patients"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.Users?.fullName || "Unknown Patient" }}
                    </option>
                  </select>
                  <div v-if="formErrors.patientId" class="invalid-feedback">
                    {{ formErrors.patientId }}
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Diagnosis *</label>
                  <select
                    v-model="recordForm.diagnosisId"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.diagnosisId }"
                    required
                  >
                    <option value="">Select Diagnosis</option>
                    <option
                      v-for="diagnosis in diagnoses"
                      :key="diagnosis.DiagnosisID"
                      :value="diagnosis.DiagnosisID"
                    >
                      {{ diagnosis.DiagnosisName }}
                    </option>
                  </select>
                  <div v-if="formErrors.diagnosisId" class="invalid-feedback">
                    {{ formErrors.diagnosisId }}
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Treatment *</label>
                  <select
                    v-model="recordForm.treatmentId"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.treatmentId }"
                    required
                  >
                    <option value="">Select Treatment</option>
                    <option
                      v-for="treatment in treatments"
                      :key="treatment.TreatmentID"
                      :value="treatment.TreatmentID"
                    >
                      {{ treatment.TreatmentName }}
                    </option>
                  </select>
                  <div v-if="formErrors.treatmentId" class="invalid-feedback">
                    {{ formErrors.treatmentId }}
                  </div>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="recordForm.notes"
                    class="form-control"
                    rows="3"
                    placeholder="Additional notes about the medical record..."
                  ></textarea>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Vital Signs</label>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure</label>
                  <input
                    v-model="recordForm.vitalSigns.bloodPressure"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="recordForm.vitalSigns.heartRate"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 72"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="recordForm.vitalSigns.temperature"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 36.8"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="recordForm.vitalSigns.weight"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 70"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="recordForm.vitalSigns.height"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 175"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="recordForm.status" class="form-select">
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
                @click="closeCreateModal"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-check-lg me-2"></i>
                Create Record (Mock)
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
              Confirm Deletion
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
              <strong>{{ selectedRecord.patientName }}</strong
              ><br />
              <small>{{ selectedRecord.diagnosis }}</small
              ><br />
              <small>{{ formatDateTime(selectedRecord.createdAt) }}</small>
            </div>
            <p class="text-muted mb-0">
              This action cannot be undone and will permanently remove the
              record.
            </p>
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
              @click="deleteMedicalRecord"
            >
              <i class="bi bi-trash me-2"></i>
              Delete Record (Mock)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        showViewModal || showEditModal || showDeleteModal || showCreateModal
      "
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
