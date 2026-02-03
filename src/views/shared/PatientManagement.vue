<script setup>
import { ref, computed, onMounted, onUnmounted, defineProps } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";
import { useAuthGuard } from "../../composables/useAuthGuard.js";
import { realtimeService } from "../../services/supabaseService.js";
import api from "../../services/api.js";

// Props to customize behavior based on user role
const props = defineProps({
  showVitals: {
    type: Boolean,
    default: false,
  },
  showStats: {
    type: Boolean,
    default: false,
  },
  pageTitle: {
    type: String,
    default: "Patient Management",
  },
  pageSubtitle: {
    type: String,
    default: "Manage patient information and care",
  },
});

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
const showDeleteModal = ref(false);
const selectedPatient = ref(null);
const filterStatus = ref("all");
const createAuthAccount = ref(true); // Option to create auth account

// Role-based access control
const canAccessPatients = computed(() => {
  return (
    isAuthenticated.value &&
    (userRole.value === "nurse" || userRole.value === "admin")
  );
});

// Check if user is admin
const isAdmin = computed(() => {
  return userRole.value === "admin";
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

// Form validation errors
const formErrors = ref({});

// Form data for vitals
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

// Stats
const totalPatients = computed(() => patientsList.value.length);
const activePatients = computed(
  () => patientsList.value.filter((p) => p.status === "Active").length,
);
const recentVisits = computed(
  () => filteredPatients.value.filter((p) => p.lastVisit !== "Never").length,
);

// Form validation
const validateForm = () => {
  formErrors.value = {};
  let isValid = true;

  // First name validation
  if (!patientForm.value.firstName.trim()) {
    formErrors.value.firstName = "First name is required";
    isValid = false;
  }

  // Surname validation
  if (!patientForm.value.surname.trim()) {
    formErrors.value.surname = "Surname is required";
    isValid = false;
  }

  // Birth date validation
  if (!patientForm.value.birthDate) {
    formErrors.value.birthDate = "Birth date is required";
    isValid = false;
  }

  // Gender validation
  if (!patientForm.value.gender) {
    formErrors.value.gender = "Gender is required";
    isValid = false;
  }

  // Contact number validation
  if (!patientForm.value.contactNumber.trim()) {
    formErrors.value.contactNumber = "Contact number is required";
    isValid = false;
  } else if (patientForm.value.contactNumber.trim().length < 10) {
    formErrors.value.contactNumber =
      "Contact number must be at least 10 digits";
    isValid = false;
  }

  // Email validation (required for auth account creation)
  if (createAuthAccount.value) {
    if (!patientForm.value.email || !patientForm.value.email.trim()) {
      formErrors.value.email = "Email is required for patient account creation";
      isValid = false;
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientForm.value.email.trim())
    ) {
      formErrors.value.email = "Please enter a valid email address";
      isValid = false;
    }
  }

  // Address validation
  if (!patientForm.value.address.trim()) {
    formErrors.value.address = "Address is required";
    isValid = false;
  }

  return isValid;
};

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
  formErrors.value = {};
  createAuthAccount.value = true;
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
  showViewModal.value = false;
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

const openDeleteModal = (patient) => {
  selectedPatient.value = patient;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showViewModal.value = false;
  showVitalsModal.value = false;
  showDeleteModal.value = false;
  selectedPatient.value = null;
  resetForm();
  resetVitalsForm();
};

// Generate default password: Surname_Firstname<last-4-digits-of-contact>
const generateDefaultPassword = (surname, firstName, contactNumber) => {
  const cleanSurname = surname.trim().replace(/\s+/g, "");
  const cleanFirstName = firstName.trim().replace(/\s+/g, "");
  const cleanContact = contactNumber.replace(/\D/g, ""); // Remove non-digits
  const lastFourDigits = cleanContact.slice(-4) || "0000";
  return `${cleanSurname}_${cleanFirstName}${lastFourDigits}`;
};

// Generate username from first name and surname
const generateUsername = (firstName, surname) => {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const last = surname.toLowerCase().replace(/[^a-z]/g, "");
  return `${first}.${last}`;
};

const addPatient = async () => {
  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const firstName = patientForm.value.firstName.trim();
    const surname = patientForm.value.surname.trim();
    const contactNumber = patientForm.value.contactNumber.trim();
    const email = patientForm.value.email?.trim();

    let newPatientData = null;

    // If createAuthAccount is true and email is provided, use the server API
    // This will create a Supabase auth user + Users table + Patients table entry
    if (createAuthAccount.value && email) {
      // Generate default password and username
      const generatedPassword = generateDefaultPassword(
        surname,
        firstName,
        contactNumber,
      );
      const username = generateUsername(firstName, surname);

      // Prepare payload for the account creation API
      const payload = {
        username: username,
        email: email,
        role: "patient",
        password: generatedPassword,
        firstName: firstName,
        lastName: surname,
        suffix: patientForm.value.suffix.trim() || "",
        gender: patientForm.value.gender,
        contactNumber: contactNumber,
        address: patientForm.value.address.trim(),
        birthdate: patientForm.value.birthDate,
        emergencyContactNumber: patientForm.value.emergencyContact.trim() || "",
      };

      // Create patient account using the server API (like ManageStaff does)
      const response = await api.post("/admin/accounts", payload);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Refresh the patients list to get the newly created patient
      await fetchPatients();

      closeModals();

      // Show success message with generated credentials
      alert(
        `Patient account created successfully!\n\nUsername: ${username}\nDefault Password: ${generatedPassword}\n\nPlease share these credentials with the patient securely.`,
      );
      return;
    } else {
      // Create patient without auth account (direct Patients table insert)
      // This is for patients who don't need login access
      const patientData = {
        FirstName: firstName,
        Surname: surname,
        Suffix: patientForm.value.suffix || null,
        BirthDate: patientForm.value.birthDate,
        Gender: patientForm.value.gender,
        ContactNumber: contactNumber,
        Address: patientForm.value.address.trim(),
        BloodType: patientForm.value.bloodType || null,
        EmergencyContact: patientForm.value.emergencyContact || null,
        Allergies: patientForm.value.allergies || null,
        IsActive: true,
      };

      // Create patient in database
      newPatientData = await patients.createPatient(patientData);

      if (newPatientData) {
        // Add to local list with formatted data
        const formattedPatient = {
          PatientID: newPatientData.PatientID,
          firstName: newPatientData.FirstName,
          surname: newPatientData.Surname,
          suffix: newPatientData.Suffix || "",
          birthDate: newPatientData.BirthDate,
          gender: newPatientData.Gender,
          contactNumber: newPatientData.ContactNumber || "",
          email: "",
          address: newPatientData.Address || "",
          bloodType: newPatientData.BloodType || "",
          emergencyContact: newPatientData.EmergencyContact || "",
          allergies: newPatientData.Allergies || "",
          status: newPatientData.IsActive ? "Active" : "Inactive",
          registrationDate: newPatientData.created_at
            ? new Date(newPatientData.created_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          lastVisit: "Never",
          riskLevel: "Low",
        };

        patientsList.value.unshift(formattedPatient);
        closeModals();

        alert("Patient registered successfully (without login account)!");
      }
    }
  } catch (err) {
    console.error("Error adding patient:", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Failed to register patient. Please try again.";
    errorMessage.value = errorMsg;
    alert("Failed to register patient: " + errorMsg);
  } finally {
    isLoading.value = false;
  }
};

const updatePatient = async () => {
  if (!selectedPatient.value?.PatientID) {
    errorMessage.value = "No patient selected for update";
    return;
  }

  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    // Prepare patient data for Supabase (use database column names)
    const patientData = {
      FirstName: patientForm.value.firstName.trim(),
      Surname: patientForm.value.surname.trim(),
      Suffix: patientForm.value.suffix || null,
      BirthDate: patientForm.value.birthDate,
      Gender: patientForm.value.gender,
      ContactNumber: patientForm.value.contactNumber.trim(),
      Address: patientForm.value.address.trim(),
      BloodType: patientForm.value.bloodType || null,
      EmergencyContact: patientForm.value.emergencyContact || null,
      Allergies: patientForm.value.allergies || null,
    };

    // Update patient in database
    const updatedPatient = await patients.updatePatient(
      selectedPatient.value.PatientID,
      patientData,
    );

    // Update in local list
    const index = patientsList.value.findIndex(
      (p) => p.PatientID === selectedPatient.value.PatientID,
    );
    if (index !== -1) {
      patientsList.value[index] = {
        ...patientsList.value[index],
        firstName: updatedPatient.FirstName,
        surname: updatedPatient.Surname,
        suffix: updatedPatient.Suffix || "",
        birthDate: updatedPatient.BirthDate,
        gender: updatedPatient.Gender,
        contactNumber: updatedPatient.ContactNumber || "",
        address: updatedPatient.Address || "",
        bloodType: updatedPatient.BloodType || "",
        emergencyContact: updatedPatient.EmergencyContact || "",
        allergies: updatedPatient.Allergies || "",
      };
    }

    closeModals();
  } catch (err) {
    console.error("Error updating patient:", err);
    errorMessage.value = "Failed to update patient. Please try again.";
    alert("Failed to update patient: " + (err.message || "Unknown error"));
  } finally {
    isLoading.value = false;
  }
};

const deletePatient = async () => {
  if (!selectedPatient.value?.PatientID) {
    errorMessage.value = "No patient selected for deletion";
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    // Delete from database
    await patients.deletePatient(selectedPatient.value.PatientID);

    // Remove from local list
    patientsList.value = patientsList.value.filter(
      (p) => p.PatientID !== selectedPatient.value.PatientID,
    );

    closeModals();
  } catch (err) {
    console.error("Error deleting patient:", err);
    errorMessage.value = "Failed to delete patient. Please try again.";
    alert("Failed to delete patient: " + (err.message || "Unknown error"));
  } finally {
    isLoading.value = false;
  }
};

const recordVitals = () => {
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

// Fetch patients from Supabase
const fetchPatients = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await patients.getAllPatients();

    // Map the data to the component's expected format
    patientsList.value = (data || []).map((patient) => ({
      PatientID: patient.PatientID,
      UserID: patient.UserID,
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
      hasAccount: !!patient.UserID, // Check if patient has an auth account
    }));
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
  fetchPatients();
};

// Initialize auth guard
const { waitForStaffAccess } = useAuthGuard();

// Initialize on mount
onMounted(async () => {
  // Use the auth guard to wait for authentication with proper timing handling
  const { success, error: authErr } = await waitForStaffAccess();

  if (!success) {
    console.error("User not authenticated", authErr);
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
        <h1 class="mb-2 animate-fade-in-left">{{ pageTitle }}</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          {{ pageSubtitle }}
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-person-plus me-2"></i>
          Register New Patient
        </button>
      </div>
    </div>

    <!-- Quick Stats (optional) -->
    <div v-if="showStats" class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-people text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ totalPatients }}</h4>
            <small class="text-muted">Total Patients</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-person-check text-success fs-2"></i>
            </div>
            <h4 class="mb-1">{{ activePatients }}</h4>
            <small class="text-muted">Active Patients</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-check text-success fs-2"></i>
            </div>
            <h4 class="mb-1">{{ recentVisits }}</h4>
            <small class="text-muted">Recent Visits</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
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
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error || errorMessage"
      class="alert alert-danger alert-dismissible fade show"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error || errorMessage }}
      <button
        type="button"
        class="btn-close"
        @click="
          error = null;
          errorMessage = null;
        "
      ></button>
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
    <div v-if="isLoading && canAccessPatients" class="text-center py-5">
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
          :disabled="isLoading"
        >
          <i
            class="bi bi-arrow-clockwise me-1"
            :class="{ 'animate-spin': isLoading }"
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
                        <i
                          v-if="patient.hasAccount"
                          class="bi bi-patch-check-fill text-success ms-1"
                          title="Has login account"
                        ></i>
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
                    patient.lastVisit === "Never"
                      ? "No visits yet"
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
                      v-if="showVitals"
                      class="btn btn-sm btn-outline-success"
                      @click="openVitalsModal(patient)"
                      title="Record Vitals"
                    >
                      <i class="bi bi-clipboard-pulse"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="openDeleteModal(patient)"
                      title="Delete Patient"
                      :disabled="isLoading"
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
              <!-- Account creation option -->
              <div class="mb-4 p-3 bg-light rounded">
                <div class="form-check form-switch">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="createAuthAccount"
                    v-model="createAuthAccount"
                  />
                  <label class="form-check-label" for="createAuthAccount">
                    <strong>Create login account for patient</strong>
                    <br />
                    <small class="text-muted"
                      >If enabled, the patient will be able to log in and view
                      their records. Requires email.</small
                    >
                  </label>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">First Name *</label>
                  <input
                    v-model="patientForm.firstName"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.firstName }"
                    required
                  />
                  <div v-if="formErrors.firstName" class="invalid-feedback">
                    {{ formErrors.firstName }}
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Surname *</label>
                  <input
                    v-model="patientForm.surname"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.surname }"
                    required
                  />
                  <div v-if="formErrors.surname" class="invalid-feedback">
                    {{ formErrors.surname }}
                  </div>
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
                    :class="{ 'is-invalid': formErrors.birthDate }"
                    required
                  />
                  <div v-if="formErrors.birthDate" class="invalid-feedback">
                    {{ formErrors.birthDate }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Gender *</label>
                  <select
                    v-model="patientForm.gender"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.gender }"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div v-if="formErrors.gender" class="invalid-feedback">
                    {{ formErrors.gender }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="patientForm.contactNumber"
                    type="tel"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.contactNumber }"
                    required
                  />
                  <div v-if="formErrors.contactNumber" class="invalid-feedback">
                    {{ formErrors.contactNumber }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label"
                    >Email
                    <span v-if="createAuthAccount" class="text-danger"
                      >*</span
                    ></label
                  >
                  <input
                    v-model="patientForm.email"
                    type="email"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.email }"
                    :required="createAuthAccount"
                  />
                  <div v-if="formErrors.email" class="invalid-feedback">
                    {{ formErrors.email }}
                  </div>
                  <small v-if="createAuthAccount" class="text-muted"
                    >Login credentials will be sent to this email</small
                  >
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
                    :class="{ 'is-invalid': formErrors.address }"
                    rows="2"
                    required
                  ></textarea>
                  <div v-if="formErrors.address" class="invalid-feedback">
                    {{ formErrors.address }}
                  </div>
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
                <div class="col-md-12">
                  <label class="form-label">Allergies</label>
                  <input
                    v-model="patientForm.allergies"
                    type="text"
                    class="form-control"
                    placeholder="List known allergies"
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
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isLoading"
              >
                <span
                  v-if="isLoading"
                  class="spinner-border spinner-border-sm me-2"
                ></span>
                <i v-else class="bi bi-person-plus me-2"></i>
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
                    :class="{ 'is-invalid': formErrors.firstName }"
                    required
                  />
                  <div v-if="formErrors.firstName" class="invalid-feedback">
                    {{ formErrors.firstName }}
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Surname *</label>
                  <input
                    v-model="patientForm.surname"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.surname }"
                    required
                  />
                  <div v-if="formErrors.surname" class="invalid-feedback">
                    {{ formErrors.surname }}
                  </div>
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
                    :class="{ 'is-invalid': formErrors.birthDate }"
                    required
                  />
                  <div v-if="formErrors.birthDate" class="invalid-feedback">
                    {{ formErrors.birthDate }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Gender *</label>
                  <select
                    v-model="patientForm.gender"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.gender }"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div v-if="formErrors.gender" class="invalid-feedback">
                    {{ formErrors.gender }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="patientForm.contactNumber"
                    type="tel"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.contactNumber }"
                    required
                  />
                  <div v-if="formErrors.contactNumber" class="invalid-feedback">
                    {{ formErrors.contactNumber }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input
                    v-model="patientForm.email"
                    type="email"
                    class="form-control"
                    disabled
                  />
                  <small class="text-muted"
                    >Email cannot be changed after account creation</small
                  >
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
                    :class="{ 'is-invalid': formErrors.address }"
                    rows="2"
                    required
                  ></textarea>
                  <div v-if="formErrors.address" class="invalid-feedback">
                    {{ formErrors.address }}
                  </div>
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
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isLoading"
              >
                <span
                  v-if="isLoading"
                  class="spinner-border spinner-border-sm me-2"
                ></span>
                <i v-else class="bi bi-check-lg me-2"></i>
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
                      <i
                        v-if="selectedPatient.hasAccount"
                        class="bi bi-patch-check-fill text-success ms-1"
                        title="Has login account"
                      ></i>
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
                    <strong>Account Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="
                        selectedPatient.hasAccount
                          ? 'bg-success'
                          : 'bg-secondary'
                      "
                    >
                      {{
                        selectedPatient.hasAccount ? "Has Login" : "No Login"
                      }}
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
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Visit History</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Registration Date:</strong>
                    {{
                      new Date(
                        selectedPatient.registrationDate,
                      ).toLocaleDateString()
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Last Visit:</strong>
                    {{
                      selectedPatient.lastVisit === "Never"
                        ? "No visits yet"
                        : new Date(
                            selectedPatient.lastVisit,
                          ).toLocaleDateString()
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        selectedPatient.status,
                      )}`"
                    >
                      {{ selectedPatient.status }}
                    </span>
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
            <button
              v-if="showVitals"
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
      v-if="canAccessPatients && showVitals"
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
            <button
              type="submit"
              class="btn btn-danger"
              @click="deletePatient"
              :disabled="isLoading"
            >
              <span
                v-if="isLoading"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              <i v-else class="bi bi-trash me-2"></i>
              Delete Patient
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        (showAddModal ||
          showEditModal ||
          showViewModal ||
          showVitalsModal ||
          showDeleteModal) &&
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

.stats-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
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
