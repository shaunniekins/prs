<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

// Initialize composables
const {
  treatments: treatmentOps,
  diagnoses: diagnosisOps,
  loading: supabaseLoading,
  error: supabaseError,
} = useSupabase();
const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const userRole = computed(() => authStore.userRole);

// Reactive data for treatments and diagnoses
const treatmentsList = ref([]);
const diagnosesList = ref([]);

// Reactive data
const loading = ref(false);
const search = ref("");
const activeTab = ref("treatments");
const showAddModal = ref(false);
const showEditModal = ref(false);
const isViewMode = ref(false);
const selectedItem = ref(null);
const error = ref(null);
const showDeleteConfirm = ref(false);
const itemToDelete = ref(null);

// Form data
const treatmentForm = ref({
  name: "",
  description: "",
  category: "General",
  medications: [],
  instructions: "",
  contraindications: "",
  sideEffects: "",
  status: "Active",
});

const diagnosisForm = ref({
  name: "",
  code: "",
  description: "",
  category: "General",
  symptoms: "",
  riskFactors: "",
  diagnosticCriteria: "",
  complications: "",
  status: "Active",
});

// Validation errors
const treatmentErrors = ref({});
const diagnosisErrors = ref({});

// Computed properties
const filteredTreatments = computed(() => {
  if (!treatmentsList.value) return [];
  return treatmentsList.value.filter(
    (treatment) =>
      treatment.name?.toLowerCase().includes(search.value.toLowerCase()) ||
      treatment.category?.toLowerCase().includes(search.value.toLowerCase()) ||
      treatment.description?.toLowerCase().includes(search.value.toLowerCase()),
  );
});

const filteredDiagnoses = computed(() => {
  if (!diagnosesList.value) return [];
  return diagnosesList.value.filter(
    (diagnosis) =>
      diagnosis.name?.toLowerCase().includes(search.value.toLowerCase()) ||
      diagnosis.category?.toLowerCase().includes(search.value.toLowerCase()) ||
      diagnosis.code?.toLowerCase().includes(search.value.toLowerCase()),
  );
});

// Computed properties
const canEdit = computed(() => {
  return (
    isAuthenticated.value &&
    (userRole.value === "admin" || userRole.value === "nurse")
  );
});

const canCreate = computed(() => {
  return (
    isAuthenticated.value &&
    (userRole.value === "admin" || userRole.value === "nurse")
  );
});

// Methods
const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Fetch treatments and diagnoses from Supabase
    await Promise.all([
      treatmentOps.getAllTreatments(),
      diagnosisOps.getAllDiagnoses(),
    ]);

    // Update local reactive data
    treatmentsList.value = treatmentOps.treatments.value;
    diagnosesList.value = diagnosisOps.diagnoses.value;
  } catch (err) {
    console.error("Error fetching data:", err);
    error.value = err.message || "Failed to load data";
  } finally {
    loading.value = false;
  }
};

// Form validation
const validateTreatmentForm = () => {
  treatmentErrors.value = {};
  let isValid = true;

  if (!treatmentForm.value.name?.trim()) {
    treatmentErrors.value.name = "Treatment name is required";
    isValid = false;
  }

  if (!treatmentForm.value.description?.trim()) {
    treatmentErrors.value.description = "Description is required";
    isValid = false;
  }

  if (!treatmentForm.value.category) {
    treatmentErrors.value.category = "Category is required";
    isValid = false;
  }

  return isValid;
};

const validateDiagnosisForm = () => {
  diagnosisErrors.value = {};
  let isValid = true;

  if (!diagnosisForm.value.name?.trim()) {
    diagnosisErrors.value.name = "Diagnosis name is required";
    isValid = false;
  }

  if (!diagnosisForm.value.code?.trim()) {
    diagnosisErrors.value.code = "ICD code is required";
    isValid = false;
  }

  if (!diagnosisForm.value.description?.trim()) {
    diagnosisErrors.value.description = "Description is required";
    isValid = false;
  }

  if (!diagnosisForm.value.category) {
    diagnosisErrors.value.category = "Category is required";
    isValid = false;
  }

  return isValid;
};

// Form management
const resetTreatmentForm = () => {
  treatmentForm.value = {
    name: "",
    description: "",
    category: "General",
    medications: [],
    instructions: "",
    contraindications: "",
    sideEffects: "",
    status: "Active",
  };
  treatmentErrors.value = {};
};

const resetDiagnosisForm = () => {
  diagnosisForm.value = {
    name: "",
    code: "",
    description: "",
    category: "General",
    symptoms: "",
    riskFactors: "",
    diagnosticCriteria: "",
    complications: "",
    status: "Active",
  };
  diagnosisErrors.value = {};
};

const openAddModal = (type) => {
  selectedItem.value = null;
  isViewMode.value = false;
  if (type === "treatment") {
    resetTreatmentForm();
    showAddModal.value = "treatment";
  } else {
    resetDiagnosisForm();
    showAddModal.value = "diagnosis";
  }
};

const openEditModal = (item, type, readonly = false) => {
  selectedItem.value = item;
  isViewMode.value = readonly;
  if (type === "treatment") {
    treatmentForm.value = { ...item };
    showEditModal.value = "treatment";
  } else {
    diagnosisForm.value = { ...item };
    showEditModal.value = "diagnosis";
  }
};

const openViewModal = (item, type) => {
  openEditModal(item, type, true);
};

const switchToEditMode = () => {
  isViewMode.value = false;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  isViewMode.value = false;
  selectedItem.value = null;
  resetTreatmentForm();
  resetDiagnosisForm();
};

// Delete confirmation
const confirmDelete = (item, type) => {
  itemToDelete.value = { ...item, type };
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  itemToDelete.value = null;
};

const executeDelete = async () => {
  if (!itemToDelete.value) return;

  loading.value = true;
  try {
    if (itemToDelete.value.type === "treatment") {
      await treatmentOps.deleteTreatment(itemToDelete.value.TreatmentID);
    } else {
      await diagnosisOps.deleteDiagnosis(itemToDelete.value.DiagnosisID);
    }

    // Refresh data
    await fetchData();
    showDeleteConfirm.value = false;
    itemToDelete.value = null;
  } catch (err) {
    console.error("Error deleting item:", err);
    error.value = err.message || "Failed to delete item";
  } finally {
    loading.value = false;
  }
};

// CRUD Operations
const addTreatment = async () => {
  if (!validateTreatmentForm()) {
    return;
  }

  loading.value = true;
  try {
    await treatmentOps.createTreatment({
      name: treatmentForm.value.name,
      description: treatmentForm.value.description,
      category: treatmentForm.value.category,
      medications: treatmentForm.value.medications,
      instructions: treatmentForm.value.instructions,
      contraindications: treatmentForm.value.contraindications,
      sideEffects: treatmentForm.value.sideEffects,
      status: treatmentForm.value.status,
    });

    // Refresh data
    await fetchData();
    closeModals();
  } catch (err) {
    console.error("Error adding treatment:", err);
    error.value = err.message || "Failed to add treatment";
  } finally {
    loading.value = false;
  }
};

const addDiagnosis = async () => {
  if (!validateDiagnosisForm()) {
    return;
  }

  loading.value = true;
  try {
    await diagnosisOps.createDiagnosis({
      name: diagnosisForm.value.name,
      code: diagnosisForm.value.code,
      description: diagnosisForm.value.description,
      category: diagnosisForm.value.category,
      symptoms: diagnosisForm.value.symptoms,
      riskFactors: diagnosisForm.value.riskFactors,
      diagnosticCriteria: diagnosisForm.value.diagnosticCriteria,
      complications: diagnosisForm.value.complications,
      status: diagnosisForm.value.status,
    });

    // Refresh data
    await fetchData();
    closeModals();
  } catch (err) {
    console.error("Error adding diagnosis:", err);
    error.value = err.message || "Failed to add diagnosis";
  } finally {
    loading.value = false;
  }
};

const updateTreatment = async () => {
  if (!validateTreatmentForm() || !selectedItem.value) {
    return;
  }

  loading.value = true;
  try {
    await treatmentOps.updateTreatment(selectedItem.value.TreatmentID, {
      name: treatmentForm.value.name,
      description: treatmentForm.value.description,
      category: treatmentForm.value.category,
      medications: treatmentForm.value.medications,
      instructions: treatmentForm.value.instructions,
      contraindications: treatmentForm.value.contraindications,
      sideEffects: treatmentForm.value.sideEffects,
      status: treatmentForm.value.status,
    });

    // Refresh data
    await fetchData();
    closeModals();
  } catch (err) {
    console.error("Error updating treatment:", err);
    error.value = err.message || "Failed to update treatment";
  } finally {
    loading.value = false;
  }
};

const updateDiagnosis = async () => {
  if (!validateDiagnosisForm() || !selectedItem.value) {
    return;
  }

  loading.value = true;
  try {
    await diagnosisOps.updateDiagnosis(selectedItem.value.DiagnosisID, {
      name: diagnosisForm.value.name,
      code: diagnosisForm.value.code,
      description: diagnosisForm.value.description,
      category: diagnosisForm.value.category,
      symptoms: diagnosisForm.value.symptoms,
      riskFactors: diagnosisForm.value.riskFactors,
      diagnosticCriteria: diagnosisForm.value.diagnosticCriteria,
      complications: diagnosisForm.value.complications,
      status: diagnosisForm.value.status,
    });

    // Refresh data
    await fetchData();
    closeModals();
  } catch (err) {
    console.error("Error updating diagnosis:", err);
    error.value = err.message || "Failed to update diagnosis";
  } finally {
    loading.value = false;
  }
};

const getStatusBadgeVariant = (status) => {
  return status === "Active" ? "success" : "danger";
};

const getCategoryBadgeVariant = (category) => {
  const variants = {
    Cardiovascular: "danger",
    Endocrine: "warning",
    Respiratory: "info",
    General: "secondary",
  };
  return variants[category] || "secondary";
};

// Utility functions for medications
const addMedication = () => {
  treatmentForm.value.medications.push({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
  });
};

const removeMedication = (index) => {
  treatmentForm.value.medications.splice(index, 1);
};

// Lifecycle hooks
onMounted(async () => {
  // Ensure auth is initialized before fetching data
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated) {
    await fetchData();
  }
});

// Error handling
const clearError = () => {
  error.value = null;
};
</script>

<template>
  <div class="treatment-diagnosis">
    <!-- Header -->
    <div
      class="d-flex justify-content-between align-items-center mb-4 position-relative"
      style="z-index: 100"
    >
      <div>
        <h1 class="mb-2 animate-fade-in-left">Treatment & Diagnosis</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage treatment protocols and diagnosis guidelines
        </p>
      </div>
      <div class="animate-fade-in-right">
        <div class="btn-group">
          <button
            class="btn btn-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            :disabled="loading"
          >
            <i class="bi bi-plus-circle me-2"></i>
            Add New
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <a
                class="dropdown-item"
                href="#"
                @click.prevent="openAddModal('treatment')"
                ><i class="bi bi-capsule me-2"></i>Add Treatment</a
              >
            </li>
            <li>
              <a
                class="dropdown-item"
                href="#"
                @click.prevent="openAddModal('diagnosis')"
                ><i class="bi bi-clipboard-pulse me-2"></i>Add Diagnosis</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="alert alert-danger alert-dismissible fade show animate-fade-in-up"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
      <button type="button" class="btn-close" @click="clearError"></button>
    </div>

    <!-- Tab Navigation -->
    <ul class="nav nav-tabs mb-4 animate-fade-in-up" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          class="nav-link"
          :class="{ active: activeTab === 'treatments' }"
          @click="activeTab = 'treatments'"
        >
          <i class="bi bi-capsule me-2"></i>Treatments
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          class="nav-link"
          :class="{ active: activeTab === 'diagnoses' }"
          @click="activeTab = 'diagnoses'"
        >
          <i class="bi bi-clipboard-pulse me-2"></i>Diagnoses
        </button>
      </li>
    </ul>

    <!-- Search -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
      <div class="card-body">
        <div class="search-box">
          <i class="bi bi-search search-icon"></i>
          <input
            v-model="search"
            type="text"
            class="form-control"
            placeholder="Search treatments and diagnoses..."
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading data...</p>
    </div>

    <!-- Treatments Tab -->
    <div
      v-else-if="activeTab === 'treatments' && isAuthenticated"
      class="animate-fade-in-up animation-delay-300"
    >
      <div class="card">
        <div
          class="card-header d-flex justify-content-between align-items-center"
        >
          <h5 class="mb-0">
            <i class="bi bi-capsule me-2"></i>
            Treatment Protocols ({{ filteredTreatments.length }})
          </h5>
          <button
            class="btn btn-sm btn-outline-primary"
            @click="fetchData"
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
                  <th>Treatment Name</th>
                  <th>Category</th>
                  <th>Medications</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="treatment in filteredTreatments"
                  :key="treatment.TreatmentID"
                  class="animate-fade-in-up"
                >
                  <td>
                    <div class="fw-medium">{{ treatment.name }}</div>
                    <small class="text-muted">{{
                      treatment.description
                    }}</small>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="`bg-${getCategoryBadgeVariant(
                        treatment.category,
                      )}`"
                    >
                      {{ treatment.category }}
                    </span>
                  </td>
                  <td>
                    <div
                      v-if="
                        treatment.medications &&
                        treatment.medications.length > 0
                      "
                    >
                      <div
                        v-for="med in treatment.medications.slice(0, 2)"
                        :key="med.name"
                        class="mb-1"
                      >
                        <small
                          ><strong>{{ med.name }}</strong> -
                          {{ med.dosage }}</small
                        >
                      </div>
                      <small
                        v-if="treatment.medications.length > 2"
                        class="text-muted"
                      >
                        +{{ treatment.medications.length - 2 }} more
                      </small>
                    </div>
                    <small v-else class="text-muted">No medications</small>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="`bg-${getStatusBadgeVariant(treatment.status)}`"
                    >
                      {{ treatment.status }}
                    </span>
                  </td>
                  <td>
                    {{ new Date(treatment.updated_at).toLocaleDateString() }}
                  </td>
                  <td class="text-center">
                    <div class="btn-group" role="group">
                      <button
                        class="btn btn-sm btn-outline-info"
                        @click="openViewModal(treatment, 'treatment')"
                        title="View Details"
                      >
                        <i class="bi bi-eye"></i>
                      </button>
                      <button
                        v-if="canEdit"
                        class="btn btn-sm btn-outline-primary"
                        @click="openEditModal(treatment, 'treatment')"
                        title="Edit"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        v-if="canEdit"
                        class="btn btn-sm btn-outline-danger"
                        @click="confirmDelete(treatment, 'treatment')"
                        title="Delete"
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
          <div v-if="filteredTreatments.length === 0" class="text-center py-5">
            <i class="bi bi-capsule text-muted fs-1 mb-3"></i>
            <h5 class="text-muted">No treatments found</h5>
            <p class="text-muted mb-3">
              {{
                search
                  ? "No treatments match your search."
                  : "Create treatment protocols to get started."
              }}
            </p>
            <button
              v-if="canCreate"
              class="btn btn-primary"
              @click="openAddModal('treatment')"
            >
              <i class="bi bi-plus-circle me-2"></i>
              Add First Treatment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnoses Tab -->
    <div
      v-else-if="activeTab === 'diagnoses' && isAuthenticated"
      class="animate-fade-in-up animation-delay-300"
    >
      <div class="card">
        <div
          class="card-header d-flex justify-content-between align-items-center"
        >
          <h5 class="mb-0">
            <i class="bi bi-clipboard-pulse me-2"></i>
            Diagnosis Guidelines ({{ filteredDiagnoses.length }})
          </h5>
          <button
            class="btn btn-sm btn-outline-primary"
            @click="fetchData"
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
                  <th>Diagnosis</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Symptoms</th>
                  <th>Status</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="diagnosis in filteredDiagnoses"
                  :key="diagnosis.DiagnosisID"
                  class="animate-fade-in-up"
                >
                  <td>
                    <div class="fw-medium">{{ diagnosis.name }}</div>
                    <small class="text-muted">{{
                      diagnosis.description
                    }}</small>
                  </td>
                  <td>
                    <code class="bg-light px-2 py-1 rounded">{{
                      diagnosis.code
                    }}</code>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="`bg-${getCategoryBadgeVariant(
                        diagnosis.category,
                      )}`"
                    >
                      {{ diagnosis.category }}
                    </span>
                  </td>
                  <td>
                    <small
                      >{{
                        (diagnosis.symptoms || "").substring(0, 60)
                      }}...</small
                    >
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="`bg-${getStatusBadgeVariant(diagnosis.status)}`"
                    >
                      {{ diagnosis.status }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="btn-group" role="group">
                      <button
                        class="btn btn-sm btn-outline-info"
                        @click="openViewModal(diagnosis, 'diagnosis')"
                        title="View Details"
                      >
                        <i class="bi bi-eye"></i>
                      </button>
                      <button
                        v-if="canEdit"
                        class="btn btn-sm btn-outline-primary"
                        @click="openEditModal(diagnosis, 'diagnosis')"
                        title="Edit"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        v-if="canEdit"
                        class="btn btn-sm btn-outline-danger"
                        @click="confirmDelete(diagnosis, 'diagnosis')"
                        title="Delete"
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
          <div v-if="filteredDiagnoses.length === 0" class="text-center py-5">
            <i class="bi bi-clipboard-pulse text-muted fs-1 mb-3"></i>
            <h5 class="text-muted">No diagnoses found</h5>
            <p class="text-muted mb-3">
              {{
                search
                  ? "No diagnoses match your search."
                  : "Add diagnosis guidelines to get started."
              }}
            </p>
            <button
              v-if="canCreate"
              class="btn btn-primary"
              @click="openAddModal('diagnosis')"
            >
              <i class="bi bi-plus-circle me-2"></i>
              Add First Diagnosis
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Authentication Required Message -->
    <div
      v-else-if="!isAuthenticated"
      class="text-center py-5 animate-fade-in-up"
    >
      <i class="bi bi-shield-lock text-muted fs-1 mb-3"></i>
      <h5 class="text-muted">Authentication Required</h5>
      <p class="text-muted">
        Please log in to access treatment and diagnosis management.
      </p>
    </div>

    <!-- Add Treatment Modal -->
    <div
      class="modal fade"
      :class="{ show: showAddModal === 'treatment' }"
      :style="{ display: showAddModal === 'treatment' ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Add New Treatment Protocol
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addTreatment">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Treatment Name *</label>
                  <input
                    v-model="treatmentForm.name"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': treatmentErrors.name }"
                    required
                  />
                  <div v-if="treatmentErrors.name" class="invalid-feedback">
                    {{ treatmentErrors.name }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category *</label>
                  <select
                    v-model="treatmentForm.category"
                    class="form-select"
                    :class="{ 'is-invalid': treatmentErrors.category }"
                    required
                  >
                    <option value="General">General</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Endocrine">Endocrine</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                  <div v-if="treatmentErrors.category" class="invalid-feedback">
                    {{ treatmentErrors.category }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Description *</label>
                  <textarea
                    v-model="treatmentForm.description"
                    class="form-control"
                    :class="{ 'is-invalid': treatmentErrors.description }"
                    rows="2"
                    required
                  ></textarea>
                  <div
                    v-if="treatmentErrors.description"
                    class="invalid-feedback"
                  >
                    {{ treatmentErrors.description }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Medications</label>
                  <div class="medications-section p-3 border rounded">
                    <div
                      v-for="(med, index) in treatmentForm.medications"
                      :key="index"
                      class="medication-item d-flex gap-2 mb-2"
                    >
                      <input
                        v-model="med.name"
                        type="text"
                        class="form-control"
                        placeholder="Medication name"
                      />
                      <input
                        v-model="med.dosage"
                        type="text"
                        class="form-control"
                        placeholder="Dosage"
                      />
                      <input
                        v-model="med.frequency"
                        type="text"
                        class="form-control"
                        placeholder="Frequency"
                      />
                      <button
                        type="button"
                        class="btn btn-outline-danger"
                        @click="removeMedication(index)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm"
                      @click="addMedication"
                    >
                      <i class="bi bi-plus me-1"></i>
                      Add Medication
                    </button>
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Instructions</label>
                  <textarea
                    v-model="treatmentForm.instructions"
                    class="form-control"
                    rows="3"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Contraindications</label>
                  <textarea
                    v-model="treatmentForm.contraindications"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Side Effects</label>
                  <textarea
                    v-model="treatmentForm.sideEffects"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="treatmentForm.status" class="form-select">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
                :disabled="loading"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <i class="bi bi-check-lg me-2"></i>
                {{ loading ? "Adding..." : "Add Treatment" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit/View Treatment Modal -->
    <div
      class="modal fade"
      :class="{ show: showEditModal === 'treatment' }"
      :style="{ display: showEditModal === 'treatment' ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div
            class="modal-header"
            :class="isViewMode ? 'bg-info text-white' : ''"
          >
            <h5 class="modal-title">
              <i
                :class="isViewMode ? 'bi bi-eye me-2' : 'bi bi-pencil me-2'"
              ></i>
              {{
                isViewMode
                  ? "View Treatment Details"
                  : "Edit Treatment Protocol"
              }}
            </h5>
            <button
              type="button"
              :class="isViewMode ? 'btn-close btn-close-white' : 'btn-close'"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateTreatment">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Treatment Name *</label>
                  <input
                    v-model="treatmentForm.name"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': treatmentErrors.name }"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    required
                  />
                  <div v-if="treatmentErrors.name" class="invalid-feedback">
                    {{ treatmentErrors.name }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category *</label>
                  <select
                    v-model="treatmentForm.category"
                    class="form-select"
                    :class="{ 'is-invalid': treatmentErrors.category }"
                    :disabled="isViewMode"
                    required
                  >
                    <option value="General">General</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Endocrine">Endocrine</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                  <div v-if="treatmentErrors.category" class="invalid-feedback">
                    {{ treatmentErrors.category }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Description *</label>
                  <textarea
                    v-model="treatmentForm.description"
                    class="form-control"
                    :class="{ 'is-invalid': treatmentErrors.description }"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                    required
                  ></textarea>
                  <div
                    v-if="treatmentErrors.description"
                    class="invalid-feedback"
                  >
                    {{ treatmentErrors.description }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Medications</label>
                  <div class="medications-section p-3 border rounded">
                    <div
                      v-for="(med, index) in treatmentForm.medications"
                      :key="index"
                      class="medication-item d-flex gap-2 mb-2"
                    >
                      <input
                        v-model="med.name"
                        type="text"
                        class="form-control"
                        placeholder="Medication name"
                        :readonly="isViewMode"
                        :disabled="isViewMode"
                      />
                      <input
                        v-model="med.dosage"
                        type="text"
                        class="form-control"
                        placeholder="Dosage"
                        :readonly="isViewMode"
                        :disabled="isViewMode"
                      />
                      <input
                        v-model="med.frequency"
                        type="text"
                        class="form-control"
                        placeholder="Frequency"
                        :readonly="isViewMode"
                        :disabled="isViewMode"
                      />
                      <button
                        v-if="!isViewMode"
                        type="button"
                        class="btn btn-outline-danger"
                        @click="removeMedication(index)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <button
                      v-if="!isViewMode"
                      type="button"
                      class="btn btn-outline-primary btn-sm"
                      @click="addMedication"
                    >
                      <i class="bi bi-plus me-1"></i>
                      Add Medication
                    </button>
                    <p
                      v-if="
                        isViewMode &&
                        (!treatmentForm.medications ||
                          treatmentForm.medications.length === 0)
                      "
                      class="text-muted mb-0"
                    >
                      No medications specified
                    </p>
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Instructions</label>
                  <textarea
                    v-model="treatmentForm.instructions"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="3"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Contraindications</label>
                  <textarea
                    v-model="treatmentForm.contraindications"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Side Effects</label>
                  <textarea
                    v-model="treatmentForm.sideEffects"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select
                    v-model="treatmentForm.status"
                    class="form-select"
                    :disabled="isViewMode"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
                :disabled="loading"
              >
                {{ isViewMode ? "Close" : "Cancel" }}
              </button>
              <button
                v-if="isViewMode && canEdit"
                type="button"
                class="btn btn-primary"
                @click="switchToEditMode"
              >
                <i class="bi bi-pencil me-2"></i>
                Edit
              </button>
              <button
                v-if="!isViewMode"
                type="submit"
                class="btn btn-primary"
                :disabled="loading"
              >
                <i class="bi bi-check-lg me-2"></i>
                {{ loading ? "Updating..." : "Update Treatment" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Add Diagnosis Modal -->
    <div
      class="modal fade"
      :class="{ show: showAddModal === 'diagnosis' }"
      :style="{ display: showAddModal === 'diagnosis' ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Add New Diagnosis
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addDiagnosis">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Diagnosis Name *</label>
                  <input
                    v-model="diagnosisForm.name"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.name }"
                    required
                  />
                  <div v-if="diagnosisErrors.name" class="invalid-feedback">
                    {{ diagnosisErrors.name }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">ICD Code *</label>
                  <input
                    v-model="diagnosisForm.code"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.code }"
                    placeholder="e.g., I10"
                    required
                  />
                  <div v-if="diagnosisErrors.code" class="invalid-feedback">
                    {{ diagnosisErrors.code }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category *</label>
                  <select
                    v-model="diagnosisForm.category"
                    class="form-select"
                    :class="{ 'is-invalid': diagnosisErrors.category }"
                    required
                  >
                    <option value="General">General</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Endocrine">Endocrine</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                  <div v-if="diagnosisErrors.category" class="invalid-feedback">
                    {{ diagnosisErrors.category }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Description *</label>
                  <textarea
                    v-model="diagnosisForm.description"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.description }"
                    rows="2"
                    required
                  ></textarea>
                  <div
                    v-if="diagnosisErrors.description"
                    class="invalid-feedback"
                  >
                    {{ diagnosisErrors.description }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Symptoms</label>
                  <textarea
                    v-model="diagnosisForm.symptoms"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Risk Factors</label>
                  <textarea
                    v-model="diagnosisForm.riskFactors"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Diagnostic Criteria</label>
                  <textarea
                    v-model="diagnosisForm.diagnosticCriteria"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Complications</label>
                  <textarea
                    v-model="diagnosisForm.complications"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="diagnosisForm.status" class="form-select">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
                :disabled="loading"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <i class="bi bi-check-lg me-2"></i>
                {{ loading ? "Adding..." : "Add Diagnosis" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit/View Diagnosis Modal -->
    <div
      class="modal fade"
      :class="{ show: showEditModal === 'diagnosis' }"
      :style="{ display: showEditModal === 'diagnosis' ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div
            class="modal-header"
            :class="isViewMode ? 'bg-info text-white' : ''"
          >
            <h5 class="modal-title">
              <i
                :class="isViewMode ? 'bi bi-eye me-2' : 'bi bi-pencil me-2'"
              ></i>
              {{ isViewMode ? "View Diagnosis Details" : "Edit Diagnosis" }}
            </h5>
            <button
              type="button"
              :class="isViewMode ? 'btn-close btn-close-white' : 'btn-close'"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateDiagnosis">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Diagnosis Name *</label>
                  <input
                    v-model="diagnosisForm.name"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.name }"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    required
                  />
                  <div v-if="diagnosisErrors.name" class="invalid-feedback">
                    {{ diagnosisErrors.name }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">ICD-10 Code *</label>
                  <input
                    v-model="diagnosisForm.code"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.code }"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    required
                  />
                  <div v-if="diagnosisErrors.code" class="invalid-feedback">
                    {{ diagnosisErrors.code }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <select
                    v-model="diagnosisForm.category"
                    class="form-select"
                    :class="{ 'is-invalid': diagnosisErrors.category }"
                    :disabled="isViewMode"
                  >
                    <option value="General">General</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Endocrine">Endocrine</option>
                    <option value="Respiratory">Respiratory</option>
                  </select>
                  <div v-if="diagnosisErrors.category" class="invalid-feedback">
                    {{ diagnosisErrors.category }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Description *</label>
                  <textarea
                    v-model="diagnosisForm.description"
                    class="form-control"
                    :class="{ 'is-invalid': diagnosisErrors.description }"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                    required
                  ></textarea>
                  <div
                    v-if="diagnosisErrors.description"
                    class="invalid-feedback"
                  >
                    {{ diagnosisErrors.description }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Symptoms</label>
                  <textarea
                    v-model="diagnosisForm.symptoms"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Risk Factors</label>
                  <textarea
                    v-model="diagnosisForm.riskFactors"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Diagnostic Criteria</label>
                  <textarea
                    v-model="diagnosisForm.diagnosticCriteria"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Complications</label>
                  <textarea
                    v-model="diagnosisForm.complications"
                    class="form-control"
                    :readonly="isViewMode"
                    :disabled="isViewMode"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select
                    v-model="diagnosisForm.status"
                    class="form-select"
                    :disabled="isViewMode"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
                :disabled="loading"
              >
                {{ isViewMode ? "Close" : "Cancel" }}
              </button>
              <button
                v-if="isViewMode && canEdit"
                type="button"
                class="btn btn-primary"
                @click="switchToEditMode"
              >
                <i class="bi bi-pencil me-2"></i>
                Edit
              </button>
              <button
                v-if="!isViewMode"
                type="submit"
                class="btn btn-primary"
                :disabled="loading"
              >
                <i class="bi bi-check-lg me-2"></i>
                {{ loading ? "Updating..." : "Update Diagnosis" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showDeleteConfirm }"
      :style="{ display: showDeleteConfirm ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Confirm Delete
            </h5>
            <button
              type="button"
              class="btn-close btn-close-white"
              @click="cancelDelete"
            ></button>
          </div>
          <div class="modal-body" v-if="itemToDelete">
            <p class="mb-0">
              Are you sure you want to delete
              <strong>{{ itemToDelete.name }}</strong
              >?
            </p>
            <p class="text-muted small mt-2 mb-0">
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="cancelDelete"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="executeDelete"
              :disabled="loading"
            >
              <i class="bi bi-trash me-2"></i>
              {{ loading ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showAddModal || showEditModal || showDeleteConfirm"
      class="modal-backdrop fade show"
      @click="
        closeModals();
        cancelDelete();
      "
    ></div>
  </div>
</template>

<style scoped>
/* Fix dropdown menu z-index to appear above other elements */
.btn-group {
  position: relative;
  z-index: 1000;
}

.btn-group .dropdown-menu {
  z-index: 1050;
}

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

.medications-section {
  background-color: rgba(0, 0, 0, 0.02);
}

.medication-item {
  align-items: center;
}

.nav-tabs .nav-link {
  border: none;
  color: var(--text-color);
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
}

.nav-tabs .nav-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--primary-gradient-start);
}

.nav-tabs .nav-link.active {
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  color: white;
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
  .nav-tabs .nav-link {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }
}
</style>
