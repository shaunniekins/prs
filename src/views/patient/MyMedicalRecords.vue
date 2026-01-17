<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

// Initialize composables
const { medicalRecords: medicalRecordOps, patients: patientOps } =
  useSupabase();
const authStore = useAuthStore();
const { user, isAuthenticated } = authStore;

// Reactive data
const loading = ref(false);
const error = ref(null);
const search = ref("");
const showViewModal = ref(false);
const selectedRecord = ref(null);
const filterType = ref("all");
const filterDateRange = ref("all");
const medicalRecords = ref([]);
const patientProfile = ref(null);

// Computed properties
const filteredRecords = computed(() => {
  return medicalRecords.value.filter((record) => {
    const matchesSearch =
      record.diagnosis?.toLowerCase().includes(search.value.toLowerCase()) ||
      record.treatment?.toLowerCase().includes(search.value.toLowerCase()) ||
      record.type?.toLowerCase().includes(search.value.toLowerCase());

    const matchesType =
      filterType.value === "all" ||
      record.type?.toLowerCase() === filterType.value;

    let matchesDate = true;
    if (filterDateRange.value !== "all") {
      const recordDate = new Date(record.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));

      switch (filterDateRange.value) {
        case "week":
          matchesDate = daysDiff <= 7;
          break;
        case "month":
          matchesDate = daysDiff <= 30;
          break;
        case "quarter":
          matchesDate = daysDiff <= 90;
          break;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });
});

const recentRecords = computed(() => {
  return medicalRecords.value
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
});

// Methods
const fetchMedicalRecords = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Ensure auth is initialized before fetching data
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated || !authStore.user) {
      error.value = "Please log in to view your medical records.";
      return;
    }

    console.log("Fetching patient profile first...");

    // First get the patient profile to get PatientID
    const patientData = await patientOps.getMyPatients();
    if (!patientData || patientData.length === 0) {
      console.log("No patient profile found");
      medicalRecords.value = [];
      return;
    }

    patientProfile.value = patientData[0];
    console.log("Patient profile loaded:", patientProfile.value.PatientID);

    // Fetch medical records using PatientID
    const records = await medicalRecordOps.getMedicalRecordsByPatient(
      patientProfile.value.PatientID
    );

    medicalRecords.value = (records || []).map((record) => ({
      id: record.MedicalRecordID,
      patientId: record.PatientID,
      patientName: authStore.user?.fullName || "Patient",
      appointmentId: record.AppointmentID,
      date: record.RecordDate || record.created_at,
      type: record.RecordType || "Consultation",
      diagnosis:
        record.Diagnosis?.DiagnosisName ||
        record.DiagnosisName ||
        "Not specified",
      treatment:
        record.Treatment?.TreatmentName ||
        record.TreatmentName ||
        "Not specified",
      vitalSigns: record.VitalSigns || {},
      notes: record.Notes || "",
      assessment: record.Assessment || "",
      plan: record.Plan || "",
      status: record.Status || "Final",
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));

    console.log(
      `Successfully loaded ${medicalRecords.value.length} medical records`
    );
  } catch (err) {
    console.error("Error fetching medical records:", err);
    error.value =
      err.message || "Failed to load medical records. Please try again.";

    // Set empty array on error to prevent UI issues
    medicalRecords.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchPatientProfile = async () => {
  if (!isAuthenticated.value || !user.value) return;

  try {
    const result = await patientOps.getPatientById(user.value.id);
    if (result) {
      patientProfile.value = result;
    }
  } catch (err) {
    console.error("Error fetching patient profile:", err);
  }
};

const openViewModal = (record) => {
  selectedRecord.value = record;
  showViewModal.value = true;
};

const closeModals = () => {
  showViewModal.value = false;
  selectedRecord.value = null;
};

const downloadRecord = (record) => {
  // Simulate download functionality
  const recordData = {
    patientName: record.patientName,
    date: record.date,
    type: record.type,
    diagnosis: record.diagnosis,
    treatment: record.treatment,
    vitalSigns: record.vitalSigns,
    notes: record.notes,
    assessment: record.assessment,
    plan: record.plan,
  };

  console.log("Downloading record:", recordData);
  // In a real application, this would generate and download a PDF file
  alert("Medical record download would be implemented here");
};

const printRecord = (record) => {
  console.log("Printing record:", record);
  // In a real application, this would open a print dialog
  alert("Print functionality would be implemented here");
};

const requestRecordAccess = () => {
  console.log("Requesting record access");
  // In a real application, this would send a request for record access
  alert("Record access request would be processed");
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Draft: "warning",
    Final: "success",
    Amended: "info",
  };
  return variants[status] || "secondary";
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
  return new Date(dateTime).toLocaleString();
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

onMounted(() => {
  fetchMedicalRecords();
  fetchPatientProfile();
});
</script>
<template>
  <div class="my-medical-records">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">My Medical Records</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          View and download your medical records and health information
        </p>
      </div>
      <div class="animate-fade-in-right">
        <div class="btn-group">
          <button
            class="btn btn-outline-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
          >
            <i class="bi bi-download me-2"></i>
            Export Records
          </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="#" @click="exportAllRecords"
                ><i class="bi bi-file-earmark-pdf me-2"></i>Export All (PDF)</a
              >
            </li>
            <li>
              <a class="dropdown-item" href="#" @click="exportAllRecords"
                ><i class="bi bi-file-earmark-excel me-2"></i>Export All
                (Excel)</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
      <button
        class="btn btn-sm btn-outline-danger ms-2"
        @click="fetchMedicalRecords"
        :disabled="loading"
      >
        <i class="bi bi-arrow-clockwise me-1"></i>
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading medical records...</p>
    </div>

    <!-- Quick Stats -->
    <div v-else class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-file-medical text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ medicalRecords.length }}</h4>
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
            <h4 class="mb-1">{{ recentRecords.length }}</h4>
            <small class="text-muted">Recent (30 days)</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clipboard-pulse text-info fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredRecords.filter(
                  (r) => r.type?.toLowerCase() === "consultation"
                ).length
              }}
            </h4>
            <small class="text-muted">Consultations</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-shield-check text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredRecords.filter(
                  (r) => r.type?.toLowerCase() === "vaccination"
                ).length
              }}
            </h4>
            <small class="text-muted">Vaccinations</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
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
                placeholder="Search records by diagnosis, treatment, or type..."
              />
            </div>
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
          <div class="col-md-4">
            <select v-model="filterDateRange" class="form-select">
              <option value="all">All Dates</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Records Table -->
    <div class="card animate-fade-in-up animation-delay-300">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-file-medical-fill me-2"></i>
          My Medical Records ({{ filteredRecords.length }})
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
                <th>Date</th>
                <th>Type</th>
                <th>Diagnosis</th>
                <th>Treatment</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.id"
                class="animate-fade-in-up"
              >
                <td>
                  <div class="fw-medium">
                    {{ formatDate(record.date || record.createdAt) }}
                  </div>
                  <small class="text-muted">{{
                    record.type || "Consultation"
                  }}</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getTypeBadgeVariant(
                      record.type || 'Consultation'
                    )}`"
                  >
                    {{ record.type || "Consultation" }}
                  </span>
                </td>
                <td>
                  <div class="fw-medium">
                    {{ record.diagnosis || "Not specified" }}
                  </div>
                  <small
                    v-if="record.vitalSigns && record.vitalSigns.bloodPressure"
                    class="text-muted"
                  >
                    BP: {{ record.vitalSigns.bloodPressure }}
                  </small>
                </td>
                <td>
                  <div>{{ record.treatment || "Not specified" }}</div>
                  <small v-if="record.notes" class="text-muted"
                    >{{ record.notes.substring(0, 50) }}...</small
                  >
                </td>
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
                      class="btn btn-sm btn-outline-success"
                      @click="downloadRecord(record)"
                      title="Download"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="printRecord(record)"
                      title="Print"
                    >
                      <i class="bi bi-printer"></i>
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
              search || filterType !== "all" || filterDateRange !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No medical records are available yet."
            }}
          </p>
          <button class="btn btn-primary" @click="requestRecordAccess">
            <i class="bi bi-envelope me-2"></i>
            Request Record Access
          </button>
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
          Recent Medical Records
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div
            v-for="record in recentRecords"
            :key="record.id"
            class="col-md-12"
          >
            <div
              class="recent-record-card p-3 border rounded animate-fade-in-up"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-2">
                    <div class="record-icon me-3">
                      <i class="bi bi-file-medical text-primary"></i>
                    </div>
                    <div>
                      <strong>{{ record.type || "Consultation" }}</strong>
                      <span
                        class="badge ms-2"
                        :class="`bg-${getTypeBadgeVariant(
                          record.type || 'Consultation'
                        )}`"
                      >
                        {{ record.type || "Consultation" }}
                      </span>
                      <span
                        class="badge ms-2"
                        :class="`bg-${getStatusBadgeVariant(
                          record.status || 'Final'
                        )}`"
                      >
                        {{ record.status || "Final" }}
                      </span>
                    </div>
                  </div>
                  <h6 class="mb-2">
                    {{ record.diagnosis || "Not specified" }}
                  </h6>
                  <p class="mb-2">{{ record.treatment || "Not specified" }}</p>
                  <small class="text-muted">
                    {{ formatDate(record.date || record.createdAt) }} •
                    {{ record.notes || "No additional notes" }}
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
                    class="btn btn-sm btn-outline-success"
                    @click="downloadRecord(record)"
                  >
                    <i class="bi bi-download me-1"></i>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Health Summary Card -->
    <div class="card mt-4 animate-fade-in-up animation-delay-500">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-clipboard-pulse me-2"></i>
          My Health Summary
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-4">
          <div class="col-md-6">
            <div class="health-summary-item p-3 border rounded">
              <h6 class="text-primary mb-3">
                <i class="bi bi-clipboard-pulse me-2"></i>
                Current Health Status
              </h6>
              <div
                class="health-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Blood Type</span>
                <span class="badge bg-primary">O+</span>
              </div>
              <div
                class="health-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Allergies</span>
                <span class="badge bg-success">None</span>
              </div>
              <div
                class="health-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Current Medications</span>
                <span class="badge bg-info">2 Active</span>
              </div>
              <div
                class="health-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Active Conditions</span>
                <span class="badge bg-warning">2</span>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="health-summary-item p-3 border rounded">
              <h6 class="text-primary mb-3">
                <i class="bi bi-graph-up me-2"></i>
                Health Trends
              </h6>
              <div
                class="trend-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Blood Pressure</span>
                <span class="text-success">
                  <i class="bi bi-arrow-down me-1"></i>
                  Improving
                </span>
              </div>
              <div
                class="trend-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Weight</span>
                <span class="text-success">
                  <i class="bi bi-arrow-down me-1"></i>
                  Stable
                </span>
              </div>
              <div
                class="trend-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Blood Sugar</span>
                <span class="text-success">
                  <i class="bi bi-arrow-down me-1"></i>
                  Well Controlled
                </span>
              </div>
              <div
                class="trend-item d-flex justify-content-between align-items-center py-2"
              >
                <span>Overall Health</span>
                <span class="text-info">
                  <i class="bi bi-dash me-1"></i>
                  Good
                </span>
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
                  <div class="record-icon-large me-3">
                    <i class="bi bi-file-medical"></i>
                  </div>
                  <div>
                    <h4 class="mb-1">
                      {{
                        formatDate(
                          selectedRecord.date || selectedRecord.createdAt
                        )
                      }}
                      -
                      {{ selectedRecord.type || "Consultation" }}
                    </h4>
                    <p class="text-muted mb-0">
                      Record ID: {{ selectedRecord.id }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Visit Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Visit Type:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getTypeBadgeVariant(
                        selectedRecord.type || 'Consultation'
                      )}`"
                    >
                      {{ selectedRecord.type || "Consultation" }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Date:</strong>
                    {{
                      formatDate(
                        selectedRecord.date || selectedRecord.createdAt
                      )
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        selectedRecord.status || 'Final'
                      )}`"
                    >
                      {{ selectedRecord.status || "Final" }}
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
                      (selectedRecord.vitalSigns &&
                        selectedRecord.vitalSigns.bloodPressure) ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Heart Rate:</strong>
                    {{
                      (selectedRecord.vitalSigns &&
                        selectedRecord.vitalSigns.heartRate) ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Temperature:</strong>
                    {{
                      (selectedRecord.vitalSigns &&
                        selectedRecord.vitalSigns.temperature) ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Weight:</strong>
                    {{
                      (selectedRecord.vitalSigns &&
                        selectedRecord.vitalSigns.weight) ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Height:</strong>
                    {{
                      (selectedRecord.vitalSigns &&
                        selectedRecord.vitalSigns.height) ||
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
                    {{ selectedRecord.diagnosis || "Not specified" }}
                  </div>
                  <div class="info-item">
                    <strong>Treatment:</strong>
                    {{ selectedRecord.treatment || "Not specified" }}
                  </div>
                  <div class="info-item">
                    <strong>Assessment:</strong>
                    {{ selectedRecord.assessment || "No assessment recorded" }}
                  </div>
                  <div class="info-item">
                    <strong>Treatment Plan:</strong>
                    {{ selectedRecord.plan || "No plan recorded" }}
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Consultation Notes</label>
                <div class="info-group">
                  <p class="mb-0">
                    {{ selectedRecord.notes || "No additional notes" }}
                  </p>
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
              class="btn btn-success"
              @click="downloadRecord(selectedRecord)"
            >
              <i class="bi bi-download me-2"></i>
              Download PDF
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="printRecord(selectedRecord)"
            >
              <i class="bi bi-printer me-2"></i>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showViewModal"
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

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-icon-large {
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

.health-summary-item {
  background-color: var(--light-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.health-summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.health-item,
.trend-item {
  padding: 0.5rem 0;
}

.health-item:not(:last-child),
.trend-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
