<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import {
  staffService,
  realtimeService,
} from "../../services/supabaseService.js";
import { useAuthStore } from "../../stores/auth.js";
import { useAuthGuard } from "../../composables/useAuthGuard.js";
import api from "../../services/api.js";

// Auth store
const authStore = useAuthStore();
const { waitForAdminAccess } = useAuthGuard();

// Reactive data
const loading = ref(false);
const search = ref("");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedStaff = ref(null);
const staffList = ref([]);

// Form data
const staffForm = ref({
  firstName: "",
  surname: "",
  suffix: "",
  contactNumber: "",
  email: "",
  role: "nurse",
  status: "Active",
});

// Form validation
const formErrors = ref({});
const isFormValid = computed(() => {
  return (
    staffForm.value.firstName &&
    staffForm.value.surname &&
    staffForm.value.contactNumber &&
    staffForm.value.role
  );
});

// Computed properties
const filteredStaff = computed(() => {
  if (!staffList.value.length) return [];

  const searchTerm = search.value.toLowerCase().trim();

  if (!searchTerm) {
    return staffList.value;
  }

  return staffList.value.filter((staff) => {
    // Search in multiple fields with enhanced matching
    const searchableFields = [
      staff.firstName,
      staff.surname,
      staff.email,
      staff.role,
      staff.contactNumber,
      staff.status,
      staff.suffix,
    ];

    return searchableFields.some((field) =>
      field?.toLowerCase().includes(searchTerm),
    );
  });
});

// Additional computed properties for better filtering
const staffByRole = computed(() => {
  const roleFilter = staffForm.value.role;
  if (!roleFilter || roleFilter === "") return staffList.value;
  return staffList.value.filter((staff) => staff.role === roleFilter);
});

const activeStaffCount = computed(
  () => staffList.value.filter((staff) => staff.status === "Active").length,
);

const totalStaffCount = computed(() => staffList.value.length);

// Simple loading state
const isLoading = computed(() => loading.value);

// Error message computed property
const errorMessage = ref("");

// Admin access check using useAuth composable

// Methods
const fetchStaff = async () => {
  loading.value = true;
  try {
    // Fetch staff data from the service

    const response = await staffService.getAllStaff();

    // Format the data for display
    staffList.value = (response.data || []).map((staff) => ({
      id: staff.StaffID,
      userId: staff.UserID,
      firstName: staff.FirstName,
      surname: staff.Surname,
      suffix: staff.Suffix,
      contactNumber: staff.ContactNumber,
      email: staff.Users?.Email,
      role: staff.Role?.RoleName || staff.role, // Fallback if regular field exists
      status: staff.IsActive ? "Active" : "Inactive",
      dateJoined: staff.created_at
        ? new Date(staff.created_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
      lastLogin: staff.Users?.last_sign_in_at || null, // From Supabase auth
      // Check if this is the system administrator (first admin account)
      isSystemAdmin:
        (staff.Role?.RoleName || staff.role)?.toLowerCase() === "admin" &&
        staff.Users?.Email === "admin@clinic.com",
    }));
  } catch (error) {
    console.error("❌ Error loading staff:", error);
    errorMessage.value = "Failed to load staff data. Please try again.";

    // Clear staff list on error to prevent showing stale data
    staffList.value = [];
  } finally {
    loading.value = false;
  }
};

// Form validation methods
const validateForm = () => {
  formErrors.value = {};
  let isValid = true;

  // First name validation
  if (!staffForm.value.firstName.trim()) {
    formErrors.value.firstName = "First name is required";
    isValid = false;
  } else if (staffForm.value.firstName.trim().length < 2) {
    formErrors.value.firstName = "First name must be at least 2 characters";
    isValid = false;
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(staffForm.value.firstName.trim())) {
    formErrors.value.firstName =
      "First name can only contain letters, spaces, hyphens, apostrophes, and periods";
    isValid = false;
  }

  // Surname validation
  if (!staffForm.value.surname.trim()) {
    formErrors.value.surname = "Surname is required";
    isValid = false;
  } else if (staffForm.value.surname.trim().length < 2) {
    formErrors.value.surname = "Surname must be at least 2 characters";
    isValid = false;
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(staffForm.value.surname.trim())) {
    formErrors.value.surname =
      "Surname can only contain letters, spaces, hyphens, apostrophes, and periods";
    isValid = false;
  }

  // Contact number validation
  if (!staffForm.value.contactNumber.trim()) {
    formErrors.value.contactNumber = "Contact number is required";
    isValid = false;
  } else if (staffForm.value.contactNumber.trim().length < 10) {
    formErrors.value.contactNumber =
      "Contact number must be at least 10 digits";
    isValid = false;
  } else if (!/^\+?[\d\s\-\(\)]+$/.test(staffForm.value.contactNumber.trim())) {
    formErrors.value.contactNumber =
      "Please enter a valid contact number (digits, spaces, hyphens, parentheses, and + only)";
    isValid = false;
  }

  // Email validation (required for staff account creation)
  if (!staffForm.value.email || !staffForm.value.email.trim()) {
    formErrors.value.email = "Email is required for staff account creation";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.value.email.trim())) {
    formErrors.value.email =
      "Please enter a valid email address (e.g., name@example.com)";
    isValid = false;
  } else if (staffForm.value.email.trim().length > 254) {
    formErrors.value.email =
      "Email address is too long (maximum 254 characters)";
    isValid = false;
  }

  // Role validation
  if (!staffForm.value.role) {
    formErrors.value.role = "Role is required";
    isValid = false;
  } else if (
    ![
      "nurse",
      "Nurse",
      // "barangay health worker",
      "admin",
      "Admin",
    ].includes(staffForm.value.role)
  ) {
    formErrors.value.role = "Please select a valid role";
    isValid = false;
  }

  // Suffix validation (optional but with constraints if provided)
  if (staffForm.value.suffix && staffForm.value.suffix.trim()) {
    if (staffForm.value.suffix.trim().length > 20) {
      formErrors.value.suffix = "Suffix must be 20 characters or less";
      isValid = false;
    } else if (!/^[a-zA-Z\s\.]+$/.test(staffForm.value.suffix.trim())) {
      formErrors.value.suffix =
        "Suffix can only contain letters, spaces, and periods";
      isValid = false;
    }
  }

  return isValid;
};

const resetForm = () => {
  staffForm.value = {
    firstName: "",
    surname: "",
    suffix: "",
    contactNumber: "",
    email: "",
    role: "nurse",
    status: "Active",
  };
  formErrors.value = {};
};

const openAddModal = () => {
  resetForm();
  selectedStaff.value = null;
  showAddModal.value = true;
};

const openEditModal = (staff) => {
  if (!staff || !staff.id) {
    alert("Invalid staff member selected");
    return;
  }

  selectedStaff.value = staff;

  // Normalize role to match select option values (capitalize first letter)
  const normalizeRole = (role) => {
    if (!role) return "Nurse";
    const roleLower = role.toLowerCase();
    if (roleLower === "nurse") return "Nurse";
    if (roleLower === "admin") return "Admin";
    return "Nurse"; // Default fallback
  };

  staffForm.value = {
    firstName: staff.firstName || "",
    surname: staff.surname || "",
    suffix: staff.suffix || "",
    contactNumber: staff.contactNumber || "",
    email: staff.email || "",
    role: normalizeRole(staff.role),
    status: staff.status || "Active",
  };
  formErrors.value = {};
  showEditModal.value = true;
};

const openDeleteModal = (staff) => {
  // Prevent deletion of system administrator account
  if (staff.isSystemAdmin) {
    alert(
      "Cannot delete the system administrator account. This account is protected.",
    );
    return;
  }
  selectedStaff.value = staff;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showDeleteModal.value = false;
  selectedStaff.value = null;
  resetForm();
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

const addStaff = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    const firstName = staffForm.value.firstName.trim();
    const surname = staffForm.value.surname.trim();
    const contactNumber = staffForm.value.contactNumber.trim();
    const email = staffForm.value.email.trim();

    // Generate default password: Surname_Firstname<last-4-digits-of-contact>
    const generatedPassword = generateDefaultPassword(
      surname,
      firstName,
      contactNumber,
    );
    const username = generateUsername(firstName, surname);

    // Map role to expected format
    const roleMap = {
      nurse: "Nurse",
      admin: "Admin",
      Nurse: "Nurse",
      Admin: "Admin",
    };
    const role = roleMap[staffForm.value.role] || "Nurse";

    // Prepare payload for the account creation API
    const payload = {
      username: username,
      email: email,
      role: role,
      password: generatedPassword,
      firstName: firstName,
      lastName: surname,
      suffix: staffForm.value.suffix.trim() || "",
      contactNumber: contactNumber,
    };

    // Create staff account using the server API
    const response = await api.post("/admin/accounts", payload);

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    // Refresh the staff list
    await fetchStaff();
    closeModals();

    // Show success message with generated credentials
    alert(
      `Staff member created successfully!\n\nUsername: ${username}\nDefault Password: ${generatedPassword}\n\nPlease share these credentials with the staff member securely.`,
    );
  } catch (error) {
    console.error("Error adding staff:", error);
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      "Failed to add staff member. Please try again.";
    errorMessage.value = errorMsg;
    alert(errorMsg);
  } finally {
    loading.value = false;
  }
};

const updateStaff = async () => {
  if (!validateForm()) {
    return;
  }

  if (!selectedStaff.value) {
    alert("No staff member selected for update");
    return;
  }

  loading.value = true;

  try {
    // Prepare staff data for the service (use database column names)
    const staffData = {
      FirstName: staffForm.value.firstName.trim(),
      Surname: staffForm.value.surname.trim(),
      Suffix: staffForm.value.suffix.trim() || "",
      ContactNumber: staffForm.value.contactNumber.trim(),
      IsActive: staffForm.value.status === "Active",
    };

    // Update staff member using the service
    const response = await staffService.updateStaff(
      selectedStaff.value.id,
      staffData,
    );

    if (response.error) {
      throw response.error;
    }

    // Refresh the staff list
    await fetchStaff();
    closeModals();
  } catch (error) {
    console.error("Error updating staff:", error);
    errorMessage.value = "Failed to update staff member. Please try again.";
    alert("Failed to update staff member. Please try again.");
  } finally {
    loading.value = false;
  }
};

const deleteStaff = async () => {
  if (!selectedStaff.value) {
    alert("No staff member selected for deletion");
    return;
  }

  // Double-check system admin protection
  if (selectedStaff.value.isSystemAdmin) {
    alert(
      "Cannot delete the system administrator account. This account is protected.",
    );
    closeModals();
    return;
  }

  loading.value = true;

  try {
    // Delete staff member using the service
    const response = await staffService.deleteStaff(selectedStaff.value.id);

    if (response.error) {
      throw response.error;
    }

    // Refresh the staff list
    await fetchStaff();
    closeModals();
  } catch (error) {
    console.error("Error deleting staff:", error);
    errorMessage.value = "Failed to delete staff member. Please try again.";
    alert("Failed to delete staff member. Please try again.");
  } finally {
    loading.value = false;
  }
};

const getStatusBadgeVariant = (status) => {
  return status === "Active" ? "success" : "danger";
};

const getRoleBadgeVariant = (role) => {
  const variants = {
    Nurse: "info",
    // "Barangay Health Worker": "warning",
    Admin: "dark",
  };
  return variants[role] || "secondary";
};

const staffChannel = ref(null);

// Initialize staff data on mount
onMounted(async () => {
  // Use the auth guard to wait for authentication with proper timing handling
  const { success, error: authErr } = await waitForAdminAccess();

  if (!success) {
    console.error("User not authenticated or not admin", authErr);
    return;
  }

  try {
    await fetchStaff();
    staffChannel.value = realtimeService.subscribeToStaff(handleStaffUpdate);
  } catch (error) {
    console.error("Error initializing staff management:", error);
  }
});

onUnmounted(() => {
  if (staffChannel.value) {
    realtimeService.unsubscribe(staffChannel.value);
  }
});

const handleStaffUpdate = (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === "INSERT") {
    // Re-fetch to get properly formatted data with joins
    fetchStaff();
  } else if (eventType === "UPDATE") {
    const index = staffList.value.findIndex((s) => s.id === newRecord.StaffID);
    if (index !== -1) {
      // Re-fetch to get properly formatted data with joins
      fetchStaff();
    }
  } else if (eventType === "DELETE") {
    const index = staffList.value.findIndex((s) => s.id === oldRecord.StaffID);
    if (index !== -1) {
      staffList.value.splice(index, 1);
    }
  }
};
</script>

<template>
  <div class="manage-staff">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Manage Staff</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage staff accounts and permissions
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-person-plus me-2"></i>
          Add New Staff
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
                placeholder="Search staff by name, email, or role..."
              />
            </div>
          </div>
          <div class="col-md-4">
            <select class="form-select" v-model="staffForm.role">
              <option value="">All Roles</option>
              <option value="Nurse">Nurse</option>
              <!-- <option value="Barangay Health Worker">
                Barangay Health Worker
              </option> -->
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">
        <span v-if="loading">Loading staff data...</span>
        <span v-else>Loading...</span>
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ errorMessage }}
      <button class="btn btn-sm btn-outline-danger ms-2" @click="fetchStaff">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Retry
      </button>
    </div>

    <!-- Staff Table -->
    <div v-else class="card animate-fade-in-up animation-delay-200">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-people-fill me-2"></i>
          Staff Members ({{ filteredStaff.length }})
          <small class="text-muted ms-2">
            <span v-if="activeStaffCount < totalStaffCount">
              {{ activeStaffCount }} active
            </span>
          </small>
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchStaff"
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
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th>Last Login</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="staff in filteredStaff"
                :key="staff.id"
                class="animate-fade-in-up"
                :class="{
                  'opacity-75': staff._isOptimistic,
                  'optimistic-update': staff._isOptimistic,
                }"
              >
                <td>
                  <div class="d-flex align-items-center">
                    <div class="staff-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">
                        {{ staff.firstName }} {{ staff.surname }}
                      </div>
                      <small class="text-muted">{{ staff.suffix }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ staff.contactNumber }}</div>
                  <small class="text-muted">{{ staff.email }}</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getRoleBadgeVariant(staff.role)}`"
                  >
                    {{ staff.role }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(staff.status)}`"
                  >
                    {{ staff.status }}
                  </span>
                </td>
                <td>{{ new Date(staff.dateJoined).toLocaleDateString() }}</td>
                <td>
                  <small>{{
                    staff.lastLogin
                      ? new Date(staff.lastLogin).toLocaleString()
                      : "No login yet"
                  }}</small>
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="openEditModal(staff)"
                      title="Edit Staff"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="openDeleteModal(staff)"
                      :disabled="staff.isSystemAdmin"
                      :title="
                        staff.isSystemAdmin
                          ? 'System administrator cannot be deleted'
                          : 'Delete Staff'
                      "
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
        <div v-if="filteredStaff.length === 0" class="text-center py-5">
          <i class="bi bi-people-fill text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No staff members found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : "Get started by adding your first staff member."
            }}
          </p>
          <button v-if="!search" class="btn btn-primary" @click="openAddModal">
            <i class="bi bi-person-plus me-2"></i>
            Add New Staff
          </button>
        </div>
      </div>
    </div>

    <!-- Add Staff Modal -->
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
              Add New Staff Member
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addStaff">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">First Name *</label>
                  <input
                    v-model="staffForm.firstName"
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
                    v-model="staffForm.surname"
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
                    v-model="staffForm.suffix"
                    type="text"
                    class="form-control"
                    placeholder="MD, RN, BHW, etc."
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="staffForm.contactNumber"
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
                  <label class="form-label">Email *</label>
                  <input
                    v-model="staffForm.email"
                    type="email"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.email }"
                    placeholder="staff@example.com"
                    required
                  />
                  <div v-if="formErrors.email" class="invalid-feedback">
                    {{ formErrors.email }}
                  </div>
                  <small class="form-text text-muted">
                    Email is used for staff login credentials
                  </small>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Role *</label>
                  <select
                    v-model="staffForm.role"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.role }"
                    required
                  >
                    <option value="Nurse">Nurse</option>
                    <!-- <option value="Barangay Health Worker">
                      Barangay Health Worker
                    </option> -->
                    <option value="Admin">Admin</option>
                  </select>
                  <div v-if="formErrors.role" class="invalid-feedback">
                    {{ formErrors.role }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Status</label>
                  <select v-model="staffForm.status" class="form-select">
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
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="loading || !isFormValid"
              >
                <i v-if="loading" class="bi bi-hourglass-split me-2"></i>
                <i v-else class="bi bi-person-plus me-2"></i>
                {{ loading ? "Adding..." : "Add Staff" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Staff Modal -->
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
              Edit Staff Member
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateStaff">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">First Name *</label>
                  <input
                    v-model="staffForm.firstName"
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
                    v-model="staffForm.surname"
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
                    v-model="staffForm.suffix"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="staffForm.contactNumber"
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
                    v-model="staffForm.email"
                    type="email"
                    class="form-control"
                    :class="{ 'is-invalid': formErrors.email }"
                    placeholder="staff@example.com (optional)"
                  />
                  <div v-if="formErrors.email" class="invalid-feedback">
                    {{ formErrors.email }}
                  </div>
                  <small class="form-text text-muted">
                    Email is optional and for display purposes only
                  </small>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Role *</label>
                  <select
                    v-model="staffForm.role"
                    class="form-select"
                    :class="{ 'is-invalid': formErrors.role }"
                    required
                  >
                    <option value="Nurse">Nurse</option>
                    <!-- <option value="Barangay Health Worker">
                      Barangay Health Worker
                    </option> -->
                    <option value="Admin">Admin</option>
                  </select>
                  <div v-if="formErrors.role" class="invalid-feedback">
                    {{ formErrors.role }}
                  </div>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Status</label>
                  <select v-model="staffForm.status" class="form-select">
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
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="loading || !isFormValid"
              >
                <i v-if="loading" class="bi bi-hourglass-split me-2"></i>
                <i v-else class="bi bi-check-lg me-2"></i>
                {{ loading ? "Updating..." : "Update Staff" }}
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
            <div class="text-center mb-4">
              <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
            </div>
            <h5 class="text-center mb-3">Confirm Staff Deletion</h5>
            <p class="text-center mb-4">
              Are you sure you want to delete this staff member? This action
              cannot be undone.
            </p>

            <div v-if="selectedStaff" class="alert alert-warning">
              <div class="d-flex align-items-center">
                <div class="staff-avatar-small me-3">
                  <i class="bi bi-person-circle"></i>
                </div>
                <div>
                  <strong class="d-block"
                    >{{ selectedStaff.firstName }}
                    {{ selectedStaff.surname }}
                    <span v-if="selectedStaff.suffix">{{
                      selectedStaff.suffix
                    }}</span></strong
                  >
                  <small class="text-muted">{{ selectedStaff.email }}</small
                  ><br />
                  <small class="badge bg-info">{{ selectedStaff.role }}</small>
                  <small class="badge bg-success ms-1">{{
                    selectedStaff.status
                  }}</small>
                </div>
              </div>
            </div>

            <div class="alert alert-danger">
              <strong>Warning:</strong> Deleting this staff member will
              permanently remove them from the system. Make sure this is the
              correct action before proceeding.
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
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteStaff"
              :disabled="loading"
            >
              <i v-if="loading" class="bi bi-hourglass-split me-2"></i>
              <i v-else class="bi bi-trash me-2"></i>
              {{ loading ? "Deleting..." : "Delete Staff" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showAddModal || showEditModal || showDeleteModal"
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

.staff-avatar {
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

/* Optimistic updates styling */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

/* Enhanced optimistic update indicators */
.optimistic-update {
  position: relative;
}

.optimistic-update::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(59, 130, 246, 0.1),
    transparent
  );
  animation: shimmer 1.5s infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Enhanced delete confirmation styling */
.staff-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start, #007bff);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

/* Loading state for form submissions */
.form-loading {
  pointer-events: none;
  opacity: 0.7;
}

/* Enhanced modal styling */
.modal-content {
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.modal-header .btn-close {
  filter: invert(1);
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

  .modal-dialog {
    margin: 0.5rem;
  }

  /* Table responsive improvements */
  .table-responsive {
    font-size: 0.875rem;
  }

  .staff-avatar {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  /* Modal responsive improvements */
  .modal-body .row {
    margin: 0 -0.5rem;
  }

  .modal-body .row > * {
    padding: 0 0.5rem;
  }

  /* Form improvements on mobile */
  .form-label {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .form-control,
  .form-select {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 576px) {
  /* Extra small screens */
  .manage-staff .card {
    margin: 0 -0.75rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .manage-staff .card-header {
    padding: 1rem 0.75rem;
  }

  .manage-staff .card-body {
    padding: 1rem 0.75rem;
  }

  /* Stack form fields vertically on very small screens */
  .modal-body .col-md-4,
  .modal-body .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 1rem;
  }

  /* Adjust search and filter layout */
  .search-box {
    margin-bottom: 1rem;
  }

  .search-box input {
    font-size: 1rem; /* Prevents zoom on iOS */
  }
}
</style>
