<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

// Initialize Supabase composable
const { patients: patientOps, loading, error } = useSupabase();

// Get auth store
const authStore = useAuthStore();

// Reactive data
const search = ref("");
const statusFilter = ref("");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showViewModal = ref(false);
const selectedPatient = ref(null);
const patientsList = ref([]);

// Form data
const patientForm = ref({
  firstName: "",
  surname: "",
  suffix: "",
  address: "",
  gender: "",
  birthDate: "",
  contactNumber: "",
  email: "",
  bloodType: "",
  emergencyContact: "",
});

const filteredPatients = computed(() => {
  if (!patientsList.value.length) return [];

  return patientsList.value.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.surname}`.toLowerCase();
    const searchTerm = search.value.toLowerCase();

    const matchesSearch =
      fullName.includes(searchTerm) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm)) ||
      (patient.contactNumber && patient.contactNumber.includes(search.value));

    const matchesStatus =
      !statusFilter.value || patient.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

// Methods
const fetchPatients = async () => {
  try {
    const data = await patientOps.getAllPatients();
    patientsList.value = data.map((patient) => ({
      PatientID: patient.PatientID,
      firstName: patient.FirstName,
      surname: patient.Surname,
      suffix: patient.Suffix,
      address: patient.Address,
      gender: patient.Gender,
      birthDate: patient.BirthDate,
      contactNumber: patient.ContactNumber,
      email: patient.Users?.Email,
      bloodType: patient.BloodType,
      emergencyContact: patient.EmergencyContact,
      registrationDate: patient.created_at
        ? new Date(patient.created_at).toISOString().split("T")[0]
        : null,
      lastVisit: patient.lastVisit, // This might need to be fetched separately or joined
      status: patient.IsActive ? "Active" : "Inactive",
      Users: patient.Users, // Keep the joined user data
    }));
  } catch (err) {
    console.error("Error fetching patients:", err);
    patientsList.value = [];
  }
};

const resetForm = () => {
  patientForm.value = {
    firstName: "",
    surname: "",
    suffix: "",
    address: "",
    gender: "",
    birthDate: "",
    contactNumber: "",
    email: "",
    bloodType: "",
    emergencyContact: "",
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

const openDeleteModal = (patient) => {
  selectedPatient.value = patient;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showViewModal.value = false;
  showDeleteModal.value = false;
  selectedPatient.value = null;
  resetForm();
};

const addPatient = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Prepare patient data
    const patientData = {
      firstName: patientForm.value.firstName,
      surname: patientForm.value.surname,
      suffix: patientForm.value.suffix || null,
      address: patientForm.value.address,
      gender: patientForm.value.gender,
      birthDate: patientForm.value.birthDate,
      contactNumber: patientForm.value.contactNumber,
      email: patientForm.value.email || null,
      bloodType: patientForm.value.bloodType || null,
      emergencyContact: patientForm.value.emergencyContact || null,
    };

    // Create patient via Supabase
    const newPatient = await patientOps.createPatient(patientData);

    // Add to list with formatted data
    const formattedPatient = {
      PatientID: newPatient.PatientID,
      firstName: newPatient.firstName,
      surname: newPatient.surname,
      suffix: newPatient.suffix,
      address: newPatient.address,
      gender: newPatient.gender,
      birthDate: newPatient.birthDate,
      contactNumber: newPatient.contactNumber,
      email: newPatient.email,
      bloodType: newPatient.bloodType,
      emergencyContact: newPatient.emergencyContact,
      registrationDate: newPatient.created_at
        ? new Date(newPatient.created_at).toISOString().split("T")[0]
        : null,
      lastVisit: newPatient.lastVisit,
      status: newPatient.status || "Active",
      Users: newPatient.Users, // Keep the joined user data
    };

    patientsList.value.unshift(formattedPatient);

    closeModals();

    console.log("Patient added successfully");
  } catch (err) {
    console.error("Error adding patient:", err);
    error.value = "Failed to add patient";
  } finally {
    loading.value = false;
  }
};

const updatePatient = async () => {
  if (!selectedPatient.value?.PatientID) {
    error.value = "No patient selected for update";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Prepare patient data
    const patientData = {
      firstName: patientForm.value.firstName,
      surname: patientForm.value.surname,
      suffix: patientForm.value.suffix || null,
      address: patientForm.value.address,
      gender: patientForm.value.gender,
      birthDate: patientForm.value.birthDate,
      contactNumber: patientForm.value.contactNumber,
      email: patientForm.value.email || null,
      bloodType: patientForm.value.bloodType || null,
      emergencyContact: patientForm.value.emergencyContact || null,
    };

    // Update patient via Supabase
    const updatedPatient = await patientOps.updatePatient(
      selectedPatient.value.PatientID,
      patientData
    );

    // Update in list
    const index = patientsList.value.findIndex(
      (p) => p.PatientID === selectedPatient.value.PatientID
    );
    if (index !== -1) {
      patientsList.value[index] = {
        ...patientsList.value[index],
        ...updatedPatient,
        Users: patientsList.value[index].Users, // Keep the joined user data
      };
    }

    closeModals();
    console.log("Patient updated successfully");
  } catch (err) {
    console.error("Error updating patient:", err);
    error.value = "Failed to update patient";
  } finally {
    loading.value = false;
  }
};

const deletePatient = async () => {
  if (!selectedPatient.value?.PatientID) {
    error.value = "No patient selected for deletion";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Delete patient via Supabase
    await patientOps.deletePatient(selectedPatient.value.PatientID);

    // Remove from list
    patientsList.value = patientsList.value.filter(
      (p) => p.PatientID !== selectedPatient.value.PatientID
    );

    closeModals();
    console.log("Patient deleted successfully");
  } catch (err) {
    console.error("Error deleting patient:", err);
    error.value = "Failed to delete patient";
  } finally {
    loading.value = false;
  }
};

const getStatusBadgeVariant = (status) => {
  return status === "Active" ? "success" : "danger";
};

const getGenderBadgeVariant = (gender) => {
  return gender === "Male" ? "primary" : "info";
};

const calculateAge = (birthDate) => {
  if (!birthDate) return 0;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated && authStore.user) {
    await fetchPatients();
  }
});
</script>

<template>
  <div class="manage-patients">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Manage Patients</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage patient records and information
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-person-plus me-2"></i>
          Register New Patient
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-8">
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
          <div class="col-md-4">
            <select v-model="statusFilter" class="form-select">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
      <p class="mt-3 text-muted">Loading patient data...</p>
    </div>

    <!-- Patients Table -->
    <div v-else class="card animate-fade-in-up animation-delay-200">
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
                <th>Status</th>
                <th>Registration Date</th>
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
                      <small class="text-muted">{{
                        patient.suffix || ""
                      }}</small>
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
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(patient.status)}`"
                  >
                    {{ patient.status }}
                  </span>
                </td>
                <td>
                  {{ new Date(patient.registrationDate).toLocaleDateString() }}
                </td>
                <td>
                  <small>{{
                    patient.lastVisit
                      ? new Date(patient.lastVisit).toLocaleDateString()
                      : "No visits yet"
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
                      class="btn btn-sm btn-outline-danger"
                      @click="openDeleteModal(patient)"
                      title="Delete Patient"
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
          <i class="bi bi-people-fill text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No patients found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : "Get started by registering your first patient."
            }}
          </p>
          <button v-if="!search" class="btn btn-primary" @click="openAddModal">
            <i class="bi bi-person-plus me-2"></i>
            Register New Patient
          </button>
        </div>
      </div>
    </div>

    <!-- Add Patient Modal -->
    <div
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
                    placeholder="Jr., Sr., III, etc."
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
                    placeholder="Name - Contact Number"
                  />
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
                      {{ selectedPatient.surname }}
                      {{ selectedPatient.suffix || "" }}
                    </h4>
                    <p class="text-muted mb-0">
                      Patient ID: {{ selectedPatient.PatientID }}
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
                    ({{ calculateAge(selectedPatient.birthDate) }} years old)
                  </div>
                  <div class="info-item">
                    <strong>Gender:</strong> {{ selectedPatient.gender }}
                  </div>
                  <div class="info-item">
                    <strong>Blood Type:</strong>
                    {{ selectedPatient.bloodType || "Not specified" }}
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
                <label class="form-label fw-medium">Registration Info</label>
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

              <div class="col-md-6">
                <label class="form-label fw-medium">Visit History</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Last Visit:</strong>
                    {{
                      selectedPatient.lastVisit
                        ? new Date(
                            selectedPatient.lastVisit
                          ).toLocaleDateString()
                        : "No visits yet"
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
              @click="openEditModal(selectedPatient)"
            >
              <i class="bi bi-pencil me-2"></i>
              Edit Patient
            </button>
          </div>
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
            <p>Are you sure you want to delete this patient record?</p>
            <div v-if="selectedPatient" class="alert alert-warning">
              <strong
                >{{ selectedPatient.firstName }}
                {{ selectedPatient.surname }}</strong
              ><br />
              <small>{{ selectedPatient.email || "No email provided" }}</small>
            </div>
            <p class="text-muted mb-0">
              This action cannot be undone and will remove all associated
              medical records.
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
            <button type="submit" class="btn btn-danger" @click="deletePatient">
              <i class="bi bi-trash me-2"></i>
              Delete Patient
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showAddModal || showEditModal || showViewModal || showDeleteModal"
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
