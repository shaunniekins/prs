<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";
import { realtimeService } from "../../services/supabaseService.js";

// Supabase integration
const { patients, loading, error } = useSupabase();
const authStore = useAuthStore();
const userRole = computed(() => authStore.userRole);
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Reactive data from Supabase
const patientsList = ref([]);
const isLoading = ref(false);
const errorMessage = ref(null);
const patientsChannel = ref(null);

// Reactive data
const search = ref("");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const showVitalsModal = ref(false);
const selectedPatient = ref(null);
const filterStatus = ref("all");

// Role-based access control
const canAccessPatients = computed(() => {
  return (
    isAuthenticated.value &&
    (userRole.value === "nurse" || userRole.value === "admin")
  );
});

// Form data
const patientForm = ref({
  firstName: "",
  surname: "",
  suffix: "",
  birthDate: "",
  gender: "Male",
  contactNumber: "",
  email: "",
  address: "",
  bloodType: "",
  emergencyContact: "",
  allergies: "",
  currentMedications: "",
  medicalHistory: "",
});

// Form data
const vitalsForm = ref({
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  weight: "",
  height: "",
  oxygenSaturation: "",
  respiratoryRate: "",
  notes: "",
});

// Computed properties
const filteredPatients = computed(() => {
  return patientsList.value.filter((patient) => {
    const matchesSearch =
      patient.firstName.toLowerCase().includes(search.value.toLowerCase()) ||
      patient.surname.toLowerCase().includes(search.value.toLowerCase()) ||
      (patient.email &&
        patient.email.toLowerCase().includes(search.value.toLowerCase())) ||
      patient.contactNumber.includes(search.value);

    const matchesStatus =
      filterStatus.value === "all" ||
      (patient.status && patient.status.toLowerCase() === filterStatus.value);

    return matchesSearch && matchesStatus;
  });
});

// Methods
const resetForm = () => {
  patientForm.value = {
    firstName: "",
    surname: "",
    suffix: "",
    birthDate: "",
    gender: "Male",
    contactNumber: "",
    email: "",
    address: "",
    bloodType: "",
    emergencyContact: "",
    allergies: "",
    currentMedications: "",
    medicalHistory: "",
  };
};

const resetVitalsForm = () => {
  vitalsForm.value = {
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
    oxygenSaturation: "",
    respiratoryRate: "",
    notes: "",
  };
};

const openAddModal = () => {
  resetForm();
  selectedPatient.value = null;
  showAddModal.value = true;
};

const openEditModal = (patient) => {
  selectedPatient.value = patient;
  patientForm.value = { ...patient };
  showEditModal.value = true;
};

const openViewModal = (patient) => {
  selectedPatient.value = patient;
  showViewModal.value = true;
};

const openVitalsModal = (patient) => {
  selectedPatient.value = patient;
  resetVitalsForm();
  showVitalsModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showViewModal.value = false;
  showVitalsModal.value = false;
  selectedPatient.value = null;
  resetForm();
  resetVitalsForm();
};

const addPatient = () => {
  // Generate new patient ID
  const newId = Math.max(...patientsList.value.map((p) => p.PatientID)) + 1;

  // Create new patient object
  const newPatient = {
    ...patientForm.value,
    PatientID: newId,
    registrationDate: new Date().toISOString().split("T")[0],
    lastVisit: "Never",
    status: "Active",
    riskLevel: "Low",
  };

  // Add to patients list
  patientsList.value.push(newPatient);
  closeModals();

  console.log("Patient added successfully");
};

const updatePatient = () => {
  if (!selectedPatient.value) {
    return;
  }

  // Find patient index
  const index = patientsList.value.findIndex(
    (p) => p.PatientID === selectedPatient.value.PatientID
  );
  if (index !== -1) {
    // Update patient data
    patientsList.value[index] = {
      ...patientsList.value[index],
      ...patientForm.value,
    };
    closeModals();
    console.log("Patient updated successfully");
  }
};

const deletePatient = (patient) => {
  if (
    !confirm(
      `Are you sure you want to delete patient ${patient.firstName} ${patient.surname}?`
    )
  ) {
    return;
  }

  // Remove patient from list
  const index = patientsList.value.findIndex(
    (p) => p.PatientID === patient.PatientID
  );
  if (index !== -1) {
    patientsList.value.splice(index, 1);
    console.log("Patient deleted successfully");
  }
};

const recordVitals = () => {
  console.log(
    "Recording vitals for patient:",
    selectedPatient.value.firstName,
    vitalsForm.value
  );
  // In a real application, this would save vitals to the patient's record
  closeModals();
  alert("Vital signs recorded successfully!");
};

const getStatusBadgeVariant = (status) => {
  return status === "Active" ? "success" : "danger";
};

const getGenderBadgeVariant = (gender) => {
  return gender === "Male" ? "primary" : "info";
};

const getRiskBadgeVariant = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "danger";
    default:
      return "secondary";
  }
};

const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

const scheduleFollowUp = (patient) => {
  console.log("Scheduling follow-up for patient:", patient.firstName);
  // In a real application, this would open the appointment scheduling modal
  alert("Follow-up appointment scheduling would be implemented here");
};

const viewMedicalHistory = (patient) => {
  console.log("Viewing medical history for patient:", patient.firstName);
  // In a real application, this would navigate to the patient's medical records
  alert("Medical history view would be implemented here");
};

// Fetch patients from Supabase
const fetchPatients = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await patients.getAllPatients();

    // Map the data to the component's expected format
    patientsList.value = (data || []).map((patient) => ({
      PatientID: patient.PatientID,
      firstName: patient.FirstName,
      surname: patient.Surname,
      suffix: patient.Suffix || "",
      birthDate: patient.BirthDate,
      gender: patient.Gender,
      contactNumber: patient.ContactNumber || "",
      email: patient.Users?.Email || "",
      address: patient.Address || "",
      bloodType: patient.BloodType || "",
      emergencyContact: patient.EmergencyContact || "",
      allergies: patient.Allergies || "",
      status: patient.IsActive ? "Active" : "Inactive",
      registrationDate: patient.created_at
        ? new Date(patient.created_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
      lastVisit: "Never", // Would need appointment data to calculate this
      riskLevel: "Low", // Default value
    }));

    console.log(`✅ Loaded ${patientsList.value.length} patients`);
  } catch (err) {
    console.error("❌ Error loading patients:", err);
    errorMessage.value = "Failed to load patient data. Please try again.";
    patientsList.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Handle real-time updates
const handlePatientUpdate = (payload) => {
  console.log("Real-time patient update:", payload);
  // Re-fetch to get properly formatted data with joins
  fetchPatients();
};

// Initialize on mount
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
    await fetchPatients();
    // Subscribe to real-time updates
    patientsChannel.value =
      realtimeService.subscribeToPatients(handlePatientUpdate);
  } catch (err) {
    console.error("Error initializing patient management:", err);
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (patientsChannel.value) {
    realtimeService.unsubscribe(patientsChannel.value);
  }
});
</script>

<template>
  <div class="patient-management">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Patient Management</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage patient information and care
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-person-plus me-2"></i>
          Register New Patient
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-people text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ patientsList.length }}</h4>
            <small class="text-muted">Total Patients</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-check text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredPatients.filter((p) => p.lastVisit !== "Never").length
              }}
            </h4>
            <small class="text-muted">Recent Visits</small>
          </div>
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
                placeholder="Search patients by name, email, or contact number..."
              />
            </div>
          </div>
          <div class="col-md-3">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="col-md-3">
            <select class="form-select">
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="alert alert-danger alert-dismissible fade show"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Authentication Required -->
    <div v-if="!canAccessPatients" class="alert alert-warning" role="alert">
      <i class="bi bi-shield-exclamation me-2"></i>
      You need to be logged in as a nurse or admin to access patient management.
      <router-link to="/login" class="btn btn-sm btn-primary ms-2"
        >Login</router-link
      >
    </div>

    <!-- Loading State -->
    <div v-if="loading && canAccessPatients" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading patient data...</p>
    </div>

    <!-- Patients Table -->
    <div
      v-else-if="canAccessPatients"
      class="card animate-fade-in-up animation-delay-300"
    >
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-people-fill me-2"></i>
          Patients ({{ filteredPatients.length }})
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchPatients"
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
                <th>Contact</th>
                <th>Age/Gender</th>
                <th>Last Visit</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="patient in filteredPatients"
                :key="patient.PatientID"
                class="animate-fade-in-up"
              >
                <td>
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">
                        {{ patient.firstName }} {{ patient.surname }}
                      </div>
                      <small class="text-muted">{{ patient.suffix }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ patient.contactNumber }}</div>
                  <small class="text-muted">{{ patient.email }}</small>
                </td>
                <td>
                  <div>{{ calculateAge(patient.birthDate) }} years old</div>
                  <span
                    class="badge"
                    :class="`bg-${getGenderBadgeVariant(patient.gender)}`"
                  >
                    {{ patient.gender }}
                  </span>
                </td>
                <td>
                  <small>{{
                    patient.lastVisit === "Never"
                      ? "Never"
                      : new Date(patient.lastVisit).toLocaleDateString()
                  }}</small>
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(patient)"
                      title="View Details"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="openEditModal(patient)"
                      title="Edit Patient"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-success"
                      @click="openVitalsModal(patient)"
                      title="Record Vitals"
                    >
                      <i class="bi bi-clipboard-pulse"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="deletePatient(patient)"
                      title="Delete Patient"
                      :disabled="loading"
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
        <div v-if="filteredPatients.length === 0" class="text-center py-5">
          <i class="bi bi-people text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No patients found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : "Get started by registering your first patient."
            }}
          </p>
          <button
            v-if="!search && canAccessPatients"
            class="btn btn-primary"
            @click="openAddModal"
          >
            <i class="bi bi-person-plus me-2"></i>
            Register New Patient
          </button>
        </div>
      </div>
    </div>

    <!-- Add Patient Modal -->
    <div
      v-if="canAccessPatients"
      class="modal fade"
      :class="{ show: showAddModal }"
      :style="{ display: showAddModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-person-plus me-2"></i>
              Register New Patient
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addPatient">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">First Name *</label>
                  <input
                    v-model="patientForm.firstName"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Surname *</label>
                  <input
                    v-model="patientForm.surname"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Suffix</label>
                  <input
                    v-model="patientForm.suffix"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Birth Date *</label>
                  <input
                    v-model="patientForm.birthDate"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Gender *</label>
                  <select
                    v-model="patientForm.gender"
                    class="form-select"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="patientForm.contactNumber"
                    type="tel"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input
                    v-model="patientForm.email"
                    type="email"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Type</label>
                  <select v-model="patientForm.bloodType" class="form-select">
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Address *</label>
                  <textarea
                    v-model="patientForm.address"
                    class="form-control"
                    rows="2"
                    required
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Emergency Contact</label>
                  <input
                    v-model="patientForm.emergencyContact"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Allergies</label>
                  <input
                    v-model="patientForm.allergies"
                    type="text"
                    class="form-control"
                    placeholder="List known allergies"
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Current Medications</label>
                  <textarea
                    v-model="patientForm.currentMedications"
                    class="form-control"
                    rows="2"
                    placeholder="Current medications and dosages"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Medical History</label>
                  <textarea
                    v-model="patientForm.medicalHistory"
                    class="form-control"
                    rows="2"
                    placeholder="Brief medical history"
                  ></textarea>
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
                <i class="bi bi-person-plus me-2"></i>
                Register Patient
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Patient Modal -->
    <div
      v-if="canAccessPatients"
      class="modal fade"
      :class="{ show: showEditModal }"
      :style="{ display: showEditModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Edit Patient Information
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updatePatient">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">First Name *</label>
                  <input
                    v-model="patientForm.firstName"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Surname *</label>
                  <input
                    v-model="patientForm.surname"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Suffix</label>
                  <input
                    v-model="patientForm.suffix"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Birth Date *</label>
                  <input
                    v-model="patientForm.birthDate"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Gender *</label>
                  <select
                    v-model="patientForm.gender"
                    class="form-select"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="patientForm.contactNumber"
                    type="tel"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input
                    v-model="patientForm.email"
                    type="email"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Type</label>
                  <select v-model="patientForm.bloodType" class="form-select">
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Address *</label>
                  <textarea
                    v-model="patientForm.address"
                    class="form-control"
                    rows="2"
                    required
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Emergency Contact</label>
                  <input
                    v-model="patientForm.emergencyContact"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Allergies</label>
                  <input
                    v-model="patientForm.allergies"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Current Medications</label>
                  <textarea
                    v-model="patientForm.currentMedications"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Medical History</label>
                  <textarea
                    v-model="patientForm.medicalHistory"
                    class="form-control"
                    rows="2"
                  ></textarea>
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
                Update Patient
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Patient Modal -->
    <div
      v-if="canAccessPatients"
      class="modal fade"
      :class="{ show: showViewModal }"
      :style="{ display: showViewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-person-lines-fill me-2"></i>
              Patient Details
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedPatient">
            <div class="row g-3">
              <div class="col-md-12">
                <div class="patient-header d-flex align-items-center mb-4">
                  <div class="patient-avatar-large me-3">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <div>
                    <h4 class="mb-1">
                      {{ selectedPatient.firstName }}
                      {{ selectedPatient.surname }} {{ selectedPatient.suffix }}
                    </h4>
                    <p class="text-muted mb-0">
                      Age: {{ calculateAge(selectedPatient.birthDate) }} |
                      {{ selectedPatient.gender }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Personal Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Birth Date:</strong>
                    {{
                      new Date(selectedPatient.birthDate).toLocaleDateString()
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Blood Type:</strong>
                    {{ selectedPatient.bloodType || "Not specified" }}
                  </div>
                  <div class="info-item">
                    <strong>Risk Level:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getRiskBadgeVariant(
                        selectedPatient.riskLevel
                      )}`"
                    >
                      {{ selectedPatient.riskLevel }} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Contact Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Contact:</strong>
                    {{ selectedPatient.contactNumber }}
                  </div>
                  <div class="info-item">
                    <strong>Email:</strong>
                    {{ selectedPatient.email || "Not provided" }}
                  </div>
                  <div class="info-item">
                    <strong>Emergency Contact:</strong>
                    {{ selectedPatient.emergencyContact || "Not provided" }}
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Address</label>
                <div class="info-group">
                  <p class="mb-0">{{ selectedPatient.address }}</p>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Medical Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Allergies:</strong>
                    {{ selectedPatient.allergies || "None reported" }}
                  </div>
                  <div class="info-item">
                    <strong>Current Medications:</strong>
                    {{ selectedPatient.currentMedications || "None" }}
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Visit History</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Registration Date:</strong>
                    {{
                      new Date(
                        selectedPatient.registrationDate
                      ).toLocaleDateString()
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Last Visit:</strong>
                    {{
                      selectedPatient.lastVisit === "Never"
                        ? "No visits yet"
                        : new Date(
                            selectedPatient.lastVisit
                          ).toLocaleDateString()
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        selectedPatient.status
                      )}`"
                    >
                      {{ selectedPatient.status }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Medical History</label>
                <div class="info-group">
                  <p class="mb-0">
                    {{
                      selectedPatient.medicalHistory ||
                      "No medical history recorded"
                    }}
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
              class="btn btn-primary"
              @click="openEditModal(selectedPatient)"
            >
              <i class="bi bi-pencil me-2"></i>
              Edit Patient
            </button>
            <button
              type="button"
              class="btn btn-success"
              @click="openVitalsModal(selectedPatient)"
            >
              <i class="bi bi-clipboard-pulse me-2"></i>
              Record Vitals
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Record Vitals Modal -->
    <div
      v-if="canAccessPatients"
      class="modal fade"
      :class="{ show: showVitalsModal }"
      :style="{ display: showVitalsModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-clipboard-pulse me-2"></i>
              Record Vital Signs
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="recordVitals">
            <div class="modal-body">
              <div
                v-if="selectedPatient"
                class="patient-info mb-4 p-3 bg-light rounded"
              >
                <h6 class="mb-2">Recording vitals for:</h6>
                <strong
                  >{{ selectedPatient.firstName }}
                  {{ selectedPatient.surname }}</strong
                >
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure *</label>
                  <input
                    v-model="vitalsForm.bloodPressure"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 120/80"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm) *</label>
                  <input
                    v-model="vitalsForm.heartRate"
                    type="number"
                    class="form-control"
                    placeholder="e.g., 72"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C) *</label>
                  <input
                    v-model="vitalsForm.temperature"
                    type="number"
                    step="0.1"
                    class="form-control"
                    placeholder="e.g., 36.8"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg) *</label>
                  <input
                    v-model="vitalsForm.weight"
                    type="number"
                    step="0.1"
                    class="form-control"
                    placeholder="e.g., 70.5"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="vitalsForm.height"
                    type="number"
                    class="form-control"
                    placeholder="e.g., 175"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Oxygen Saturation (%)</label>
                  <input
                    v-model="vitalsForm.oxygenSaturation"
                    type="number"
                    class="form-control"
                    placeholder="e.g., 98"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label"
                    >Respiratory Rate (breaths/min)</label
                  >
                  <input
                    v-model="vitalsForm.respiratoryRate"
                    type="number"
                    class="form-control"
                    placeholder="e.g., 16"
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="vitalsForm.notes"
                    class="form-control"
                    rows="3"
                    placeholder="Additional observations or notes"
                  ></textarea>
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
              <button type="submit" class="btn btn-success">
                <i class="bi bi-check-lg me-2"></i>
                Record Vitals
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        (showAddModal || showEditModal || showViewModal || showVitalsModal) &&
        canAccessPatients
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

.patient-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 1rem;
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
