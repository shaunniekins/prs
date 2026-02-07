<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { authService, supabase } from "@/services/supabaseService.js";
import api from "@/services/api.js";
import { useNotify } from "@/composables/useNotify.js";
import { useAuthStore } from "@/stores/auth.js";
import { useAuthGuard } from "@/composables/useAuthGuard.js";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import { formatDateTimeClean } from "@/utils/dateUtils.js";

// Auth store
const authStore = useAuthStore();
const { waitForAdminAccess } = useAuthGuard();

// Reactive data
const creatingAccount = ref(false);
const formErrors = ref({});
const formTouched = ref({});
const createdAccounts = ref([]);
const accountHistory = ref([]);
const loadingHistory = ref(false);
const { notify } = useNotify();
const router = useRouter();
const showPreviewModal = ref(false);
const showSuccessModal = ref(false);
const createdAccountForEmail = ref(null);
const sendingCredentialsFromModal = ref(false);
const credentialsSentFromModal = ref(false);
const selectedAccount = ref(null);

const accountForm = ref({
  username: "", // Auto-generated
  email: "",
  role: "Staff", // Patient or Staff
  firstName: "",
  lastName: "",
  suffix: "",
  gender: "",
  contactNumber: "",
  address: "",
  emergencyContactNumber: "",
  birthdate: null, // New birthdate field
});

// Computed property for generated password based on birthdate
// Computed property for generated password (Surname_Firstname<last-4-digits-phone>)
const generatedPassword = computed(() => {
  const surname = accountForm.value.lastName || "";
  const firstName = accountForm.value.firstName || "";
  const contact = accountForm.value.contactNumber || "";

  const cleanSurname = surname.trim().replace(/\s+/g, "");
  const cleanFirstName = firstName.trim().replace(/\s+/g, "");
  const cleanContact = contact.replace(/\D/g, "");
  const lastFourDigits = cleanContact.slice(-4) || "0000";

  if (!cleanSurname && !cleanFirstName) return "";

  return `${cleanSurname}_${cleanFirstName}${lastFourDigits}`;
});

// Computed properties
const generateUsername = () => {
  if (!accountForm.value.firstName || !accountForm.value.lastName) return "";
  const first = accountForm.value.firstName
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const last = accountForm.value.lastName.toLowerCase().replace(/[^a-z]/g, "");
  return `${first}.${last}`;
};

const validateBirthdate = (birthdate) => {
  if (!birthdate) {
    return "Birthdate is required.";
  }
  const date = new Date(birthdate);
  if (isNaN(date.getTime())) {
    return "Invalid date format. Please use MM-DD-YYYY.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    return "Birthdate cannot be in the future.";
  }
  return null;
};

const generatePasswordFromBirthdate = (birthdateString) => {
  if (!birthdateString) {
    return { password: null, error: "Birthdate cannot be empty." };
  }

  const parts = birthdateString.split("/");
  if (parts.length !== 3) {
    return {
      password: null,
      error: "Invalid birthdate format. Expected MM/DD/YYYY.",
    };
  }

  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime())) {
    return {
      password: null,
      error: "Invalid birthdate. Please provide a valid date.",
    };
  }

  const formattedMonth = String(date.getMonth() + 1).padStart(2, "0");
  const formattedDay = String(date.getDate()).padStart(2, "0");
  const formattedYear = String(date.getFullYear()).slice(-2);

  return {
    password: `${formattedMonth}-${formattedDay}-${formattedYear}`,
    error: null,
  };
};

const isFormValid = computed(() => {
  formErrors.value = {};

  // Required field validations
  if (!accountForm.value.firstName?.trim()) {
    formErrors.value.firstName = "First name is required.";
  } else if (accountForm.value.firstName.length < 2) {
    formErrors.value.firstName = "First name must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s-']+$/.test(accountForm.value.firstName)) {
    formErrors.value.firstName =
      "First name can only contain letters, spaces, hyphens, and apostrophes.";
  }

  if (!accountForm.value.lastName?.trim()) {
    formErrors.value.lastName = "Last name is required.";
  } else if (accountForm.value.lastName.length < 2) {
    formErrors.value.lastName = "Last name must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s-']+$/.test(accountForm.value.lastName)) {
    formErrors.value.lastName =
      "Last name can only contain letters, spaces, hyphens, and apostrophes.";
  }

  if (!accountForm.value.email?.trim()) {
    formErrors.value.email = "Email is required.";
  } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(accountForm.value.email)) {
    formErrors.value.email = "Invalid email format.";
  }

  // Contact and emergency contact number validation removed (regex check disabled)

  // Role-specific validations
  // if (accountForm.value.role === "Patient") {
  //   const birthdateError = validateBirthdate(accountForm.value.birthdate);
  //   if (birthdateError) {
  //     formErrors.value.birthdate = birthdateError;
  //   }
  // }

  if (accountForm.value.role === "Staff") {
    // Note: Department and Specialty validation removed as fields are not in current schema
  }

  // Username generation check
  const generatedUsername = generateUsername();
  if (!generatedUsername) {
    formErrors.value.general =
      "Unable to generate username. Please check first and last names.";
  }

  // Password generation check - commented out to allow creation without birthdate
  // if (!accountForm.value.generatedPassword) {
  //   formErrors.value.general =
  //     "Unable to generate password. Please check birthdate.";
  // }

  // Debug: Log validation errors to help identify issues
  // if (Object.keys(formErrors.value).length > 0) {
  //   console.log("Form validation errors:", formErrors.value);
  // }

  return Object.keys(formErrors.value).length === 0;
});

const previewCredentials = () => {
  formErrors.value = {};
  if (isFormValid.value) {
    selectedAccount.value = {
      firstName: accountForm.value.firstName,
      lastName: accountForm.value.lastName,
      email: accountForm.value.email,
      role: accountForm.value.role,
      username: generateUsername(),
      password: generatedPassword.value,
      isHistory: false,
    };
    showPreviewModal.value = true;
  }
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard!", { type: "success", duration: 2000 });
  } catch (error) {
    console.error("Failed to copy:", error);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    notify("Copied to clipboard!", { type: "success", duration: 2000 });
  }
};

const getStatusBadgeVariant = (status) => {
  return status === "active" ? "success" : "danger";
};

const getTypeBadgeVariant = (type) => {
  return type === "patient" ? "info" : "primary";
};

const formatDateTime = (dateTime) => {
  return formatDateTimeClean(dateTime);
};

const loadingAccounts = ref(false);

const fetchCreatedAccounts = async () => {
  loadingAccounts.value = true;
  try {
    const { data: users, error } = await supabase.from("users_with_auth_info")
      .select(`
        UserID,
        Username,
        Email,
        RoleName,
        fullName,
        created_at,
        credentials_sent_at,
        credentials_last_sent_at,
        credentials_sent_count,
        last_sign_in_at
      `);

    if (error) {
      throw error;
    }

    // Fetch Patients and Staff info separately
    const { data: patients } = await supabase
      .from("Patients")
      .select("UserID, FirstName, Surname");
    const { data: staff } = await supabase
      .from("Staff")
      .select("UserID, FirstName, Surname");

    const patientsMap = new Map(patients?.map((p) => [p.UserID, p]) || []);
    const staffMap = new Map(staff?.map((s) => [s.UserID, s]) || []);

    createdAccounts.value = users.map((user) => {
      const isPatient = user.RoleName === "patient";
      const profile = isPatient
        ? patientsMap.get(user.UserID)
        : staffMap.get(user.UserID);
      return {
        id: user.UserID,
        type: isPatient ? "patient" : "staff",
        name: user.fullName,
        firstName: profile?.FirstName || "",
        surname: profile?.Surname || "",
        username: user.Username,
        email: user.Email,
        role: user.RoleName,
        status: "active",
        createdAt: user.created_at,
        credentialsSent: !!user.credentials_sent_at,
        credentialsSentAt: user.credentials_sent_at,
        credentialsLastSentAt: user.credentials_last_sent_at,
        credentialsSentCount: user.credentials_sent_count || 0,
        lastLogin: user.last_sign_in_at,
      };
    });
  } catch (error) {
    console.error("Error loading accounts:", error);
    notify(`Error loading accounts: ${error.message}`, { type: "error" });
    createdAccounts.value = [];
  } finally {
    loadingAccounts.value = false;
  }
};

const fetchAccountCreationHistory = async (params = {}) => {
  loadingHistory.value = true;
  try {
    // Query users_with_auth_info view to get last login data
    const { data: users, error } = await supabase
      .from("users_with_auth_info")
      .select(
        `
        UserID,
        Username,
        Email,
        RoleName,
        fullName,
        created_at,
        credentials_sent_at,
        credentials_last_sent_at,
        credentials_sent_count,
        last_sign_in_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch Patients and Staff info separately
    const { data: patients } = await supabase
      .from("Patients")
      .select("UserID, FirstName, Surname");
    const { data: staff } = await supabase
      .from("Staff")
      .select("UserID, FirstName, Surname");

    const patientsMap = new Map(patients?.map((p) => [p.UserID, p]) || []);
    const staffMap = new Map(staff?.map((s) => [s.UserID, s]) || []);

    // Transform data to match expected format
    accountHistory.value = users.map((user) => {
      const isPatient = user.RoleName === "patient";
      const profile = isPatient
        ? patientsMap.get(user.UserID)
        : staffMap.get(user.UserID);
      return {
        id: user.UserID,
        type: isPatient ? "patient" : "staff",
        name:
          user.fullName ||
          `${profile?.FirstName || ""} ${profile?.Surname || ""}`.trim(),
        firstName: profile?.FirstName || "",
        surname: profile?.Surname || "",
        username: user.Username,
        email: user.Email,
        role: user.RoleName,
        status: "active",
        createdAt: user.created_at,
        credentialsSent: !!user.credentials_sent_at,
        credentialsSentAt: user.credentials_sent_at,
        credentialsLastSentAt: user.credentials_last_sent_at,
        credentialsSentCount: user.credentials_sent_count || 0,
        lastLogin: user.last_sign_in_at,
      };
    });
  } catch (error) {
    console.error("Error fetching account creation history:", error);
    notify(`Error fetching account creation history: ${error.message}`, {
      type: "error",
    });
  } finally {
    loadingHistory.value = false;
  }
};

const exportHistory = () => {
  try {
    const headers = [
      "Account Holder,Type,Username,Email,Role,Status,Created,Last Login",
    ];
    const rows = accountHistory.value.map((acc) => {
      const lastLogin = acc.lastLogin
        ? formatDateTime(acc.lastLogin).replace(/,/g, "")
        : "Never";
      return `"${acc.name}","${acc.type}","${acc.username}","${acc.email}","${acc.role}","${acc.status}","${formatDateTime(acc.createdAt).replace(/,/g, "")}","${lastLogin}"`;
    });
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `account_history_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Export failed:", error);
    notify("Failed to export history", { type: "error" });
  }
};

const openPreviewModal = (account) => {
  selectedAccount.value = {
    firstName: account.firstName,
    lastName: account.surname,
    email: account.email,
    role: account.role,
    username: account.username,
    password: "**************", // Masked for history
    isHistory: true, // Flag to hide "Send" button if needed
  };
  showPreviewModal.value = true;
};

onMounted(async () => {
  // Use the auth guard to wait for authentication with proper timing handling
  const { success, error: authErr } = await waitForAdminAccess();

  if (!success) {
    console.error("User not authenticated or not admin", authErr);
    return;
  }

  fetchCreatedAccounts();
  fetchAccountCreationHistory();
});

const sendingCredentials = ref(false);

const sendCredentials = async (retryCount = 0) => {
  const maxRetries = 2;
  const retryDelay = 1000; // 1 second

  if (!isFormValid.value) {
    notify("Please complete the form before sending credentials.", {
      type: "warning",
      duration: 3000,
    });
    return;
  }

  sendingCredentials.value = true;
  try {
    const username = generateUsername();

    await api.post("/emails/send-account-creation", {
      firstName: accountForm.value.firstName,
      surname: accountForm.value.lastName,
      username: username,
      email: accountForm.value.email,
      accountType: accountForm.value.role === "Patient" ? "patient" : "staff",
      role: accountForm.value.role,
      password: generatedPassword.value, // Pass the generated password
    });

    notify("Credentials sent successfully!", {
      type: "success",
      duration: 3000,
    });

    // Refresh lists to show updated tracking data
    await Promise.all([fetchCreatedAccounts(), fetchAccountCreationHistory()]);
  } catch (error) {
    console.error("Error sending credentials:", error);

    // Check if error is retryable
    const isRetryableError =
      error.code === "NETWORK_ERROR" ||
      error.code === "TIMEOUT" ||
      error.response?.status >= 500 ||
      error.message?.includes("network") ||
      error.message?.includes("timeout");

    if (isRetryableError && retryCount < maxRetries) {
      notify(
        `Connection issue. Retrying... (${retryCount + 1}/${maxRetries})`,
        {
          type: "warning",
          duration: 2000,
        },
      );

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1)),
      );
      return sendCredentials(retryCount + 1);
    }

    // Provide user-friendly error messages
    let errorMessage = "Failed to send credentials.";
    if (error.response?.status === 400) {
      errorMessage = "Invalid email data. Please check the account details.";
    } else if (error.response?.status === 401) {
      errorMessage = "Authentication failed. Please log in again.";
    } else if (error.response?.status >= 500) {
      errorMessage =
        "Email service temporarily unavailable. Please try again later.";
    } else if (error.message) {
      errorMessage = `Failed to send credentials: ${error.message}`;
    }

    notify(errorMessage, {
      type: "error",
      duration: 5000,
    });
  } finally {
    sendingCredentials.value = false;
  }
};

const handleSuccessModalClose = () => {
  showSuccessModal.value = false;
  resetForm();
  createdAccountForEmail.value = null;
  credentialsSentFromModal.value = false;
};

const sendCredentialsFromModal = async () => {
  if (!createdAccountForEmail.value) return;

  sendingCredentialsFromModal.value = true;
  try {
    const account = createdAccountForEmail.value;
    await api.post("/emails/send-account-creation", {
      firstName: account.firstName,
      surname: account.lastName,
      username: account.username,
      email: account.email,
      accountType:
        account.role === "Patient" || account.role === "patient"
          ? "patient"
          : "staff",
      role: account.role,
      password: account.password, // Include password from createdAccountForEmail
    });

    notify("Credentials sent successfully!", {
      type: "success",
      duration: 3000,
    });
    credentialsSentFromModal.value = true;

    // Refresh lists to show updated tracking data
    await Promise.all([fetchCreatedAccounts(), fetchAccountCreationHistory()]);
  } catch (error) {
    console.error("Error sending credentials:", error);
    notify("Failed to send credentials. Please try again.", {
      type: "error",
      duration: 3000,
    });
  } finally {
    sendingCredentialsFromModal.value = false;
  }
};

const createAccount = async (retryCount = 0) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  formErrors.value = {};
  if (!isFormValid.value) {
    notify("Please complete the form before creating an account.", {
      type: "warning",
      duration: 3000,
    });
    return;
  }

  creatingAccount.value = true;
  try {
    const username = generateUsername();
    const payload = {
      username: username,
      email: accountForm.value.email,
      role: accountForm.value.role,
      password: generatedPassword.value,
      firstName: accountForm.value.firstName,
      lastName: accountForm.value.lastName,
      suffix: accountForm.value.suffix,
      gender: accountForm.value.gender,
      contactNumber: accountForm.value.contactNumber,
      address: accountForm.value.address,
      emergencyContactNumber: accountForm.value.emergencyContactNumber,
      birthdate: accountForm.value.birthdate,
    };

    // Use Express API for account creation (uses server-side admin API)
    const response = await api.post("/admin/accounts", payload);

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    notify("Account created successfully!", {
      type: "success",
      duration: 3000,
    });

    createdAccountForEmail.value = {
      ...response.data?.user,
      username: username,
      password: generatedPassword.value,
      firstName: accountForm.value.firstName,
      lastName: accountForm.value.lastName,
    };
    showSuccessModal.value = true;
    resetForm();
    fetchCreatedAccounts(); // Refresh the list of created accounts
  } catch (error) {
    console.error("Error creating account:", error);

    // Check if error is retryable (network errors, temporary server issues)
    const isRetryableError =
      error.code === "NETWORK_ERROR" ||
      error.code === "TIMEOUT" ||
      error.response?.status >= 500 ||
      error.message?.includes("network") ||
      error.message?.includes("timeout");

    if (isRetryableError && retryCount < maxRetries) {
      notify(
        `Connection issue. Retrying... (${retryCount + 1}/${maxRetries})`,
        {
          type: "warning",
          duration: 2000,
        },
      );

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1)),
      );
      return createAccount(retryCount + 1);
    }

    // Provide user-friendly error messages
    let errorMessage = "Failed to create account.";
    if (error.response?.status === 400) {
      errorMessage =
        error.response?.data?.message ||
        "Invalid data provided. Please check your inputs.";
    } else if (error.response?.status === 401) {
      errorMessage = "Authentication failed. Please log in again.";
    } else if (error.response?.status === 403) {
      errorMessage = "You don't have permission to create accounts.";
    } else if (
      error.response?.status === 409 ||
      error.response?.data?.message?.includes("already")
    ) {
      errorMessage = "An account with this email already exists.";
    } else if (error.response?.status >= 500) {
      errorMessage =
        error.response?.data?.message ||
        "Server error. Please try again later.";
    } else if (error.message) {
      errorMessage = `Failed to create account: ${error.message}`;
    }

    notify(errorMessage, {
      type: "error",
      duration: 5000,
    });
  } finally {
    creatingAccount.value = false;
  }
};

const navigateToDashboard = () => {
  router.push("/admin/dashboard");
};

const resendingAccountId = ref(null);

const resendCredentials = async (account) => {
  resendingAccountId.value = account.id;
  try {
    // Regenerate password from stored name (same logic as generatedPassword computed)
    const cleanSurname = (account.surname || "").trim().replace(/\s+/g, "");
    const cleanFirstName = (account.firstName || "").trim().replace(/\s+/g, "");
    const password = `${cleanSurname}_${cleanFirstName}0000`;

    await api.post("/emails/send-account-creation", {
      firstName: account.firstName,
      surname: account.surname,
      username: account.username,
      email: account.email,
      accountType:
        account.type || (account.role === "patient" ? "patient" : "staff"),
      role: account.role,
      password: password,
    });

    notify("Credentials resent successfully!", {
      type: "success",
      duration: 3000,
    });

    // Refresh lists to show updated tracking data
    await Promise.all([fetchCreatedAccounts(), fetchAccountCreationHistory()]);
  } catch (error) {
    console.error("Error resending credentials:", error);
    notify("Failed to resend credentials. Please try again.", {
      type: "error",
      duration: 5000,
    });
  } finally {
    resendingAccountId.value = null;
  }
};

const deletingAccountId = ref(null);

const deleteAccount = async (account) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete the account for "${account.name || account.username}"? This action cannot be undone.`,
  );

  if (!confirmed) return;

  deletingAccountId.value = account.id;
  try {
    await api.delete(`/admin/accounts/${account.id}`);
    notify("Account deleted successfully!", {
      type: "success",
      duration: 3000,
    });
    // Refresh both lists
    fetchCreatedAccounts();
    fetchAccountCreationHistory();
  } catch (error) {
    console.error("Error deleting account:", error);
    let errorMessage = "Failed to delete account.";
    if (error.response?.status === 401) {
      errorMessage = "Authentication failed. Please log in again.";
    } else if (error.response?.status === 403) {
      errorMessage = "You don't have permission to delete accounts.";
    } else if (error.response?.status >= 500) {
      errorMessage =
        error.response?.data?.message ||
        "Server error. Please try again later.";
    } else if (error.message) {
      errorMessage = `Failed to delete account: ${error.message}`;
    }
    notify(errorMessage, {
      type: "error",
      duration: 5000,
    });
  } finally {
    deletingAccountId.value = null;
  }
};

const closeModals = () => {
  showPreviewModal.value = false;
  selectedAccount.value = null;
};

const resetForm = () => {
  accountForm.value = {
    username: "",
    email: "",
    role: "Staff",
    firstName: "",
    lastName: "",
    suffix: "",
    gender: "",
    contactNumber: "",
    address: "",
    emergencyContactNumber: "",
    birthdate: null,
    // Note: generatedPassword is a computed property, so we reset birthdate instead
  };
  formErrors.value = {};
  formTouched.value = {};
};
</script>

<template>
  <div class="account-creation">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Account Creation</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Create new user accounts with automatic credential generation and
          delivery
        </p>
      </div>
    </div>

    <!-- Main Form -->
    <div class="animate-fade-in-up">
      <div class="row position-relative" style="z-index: 10">
        <!-- Account Creation Form -->
        <div class="col-lg-8">
          <div class="card animate-fade-in-left">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-person-gear me-2"></i>
                New Account Information
              </h5>
            </div>
            <div class="card-body">
              <form @submit.prevent="createAccount">
                <!-- Role Selection -->
                <div class="row g-3">
                  <div class="col-md-12">
                    <label class="form-label">Role *</label>
                    <select
                      v-model="accountForm.role"
                      class="form-select"
                      required
                    >
                      <option value="Patient">Patient</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <!-- Basic Information -->
                  <div class="col-md-4">
                    <label class="form-label">First Name *</label>
                    <input
                      v-model="accountForm.firstName"
                      type="text"
                      class="form-control"
                      :class="{
                        'is-invalid':
                          formTouched.firstName && formErrors.firstName,
                      }"
                      required
                      @blur="formTouched.firstName = true"
                    />
                    <div
                      v-if="formTouched.firstName && formErrors.firstName"
                      class="invalid-feedback"
                    >
                      {{ formErrors.firstName }}
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Last Name *</label>
                    <input
                      v-model="accountForm.lastName"
                      type="text"
                      class="form-control"
                      :class="{
                        'is-invalid':
                          formTouched.lastName && formErrors.lastName,
                      }"
                      required
                      @blur="formTouched.lastName = true"
                    />
                    <div
                      v-if="formTouched.lastName && formErrors.lastName"
                      class="invalid-feedback"
                    >
                      {{ formErrors.lastName }}
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Suffix</label>
                    <input
                      v-model="accountForm.suffix"
                      type="text"
                      class="form-control"
                      placeholder="e.g., Jr., Sr., III"
                    />
                  </div>

                  <!-- Additional Fields -->
                  <div class="col-md-6">
                    <label class="form-label">Gender</label>
                    <select v-model="accountForm.gender" class="form-select">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Contact Number</label>
                    <input
                      v-model="accountForm.contactNumber"
                      type="tel"
                      class="form-control"
                      placeholder="e.g., +1-234-567-8900"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Address</label>
                    <input
                      v-model="accountForm.address"
                      type="text"
                      class="form-control"
                      placeholder="Street address, city, state, zip"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Emergency Contact Number</label>
                    <input
                      v-model="accountForm.emergencyContactNumber"
                      type="tel"
                      class="form-control"
                      placeholder="Emergency contact phone number"
                    />
                  </div>

                  <!-- Birthdate Field -->
                  <div class="col-md-6">
                    <label class="form-label">Birthdate *</label>
                    <VueDatePicker
                      v-model="accountForm.birthdate"
                      :enable-time-picker="false"
                      format="MM-dd-yyyy"
                      :class="{ 'is-invalid': formErrors.birthdate }"
                      placeholder="MM-DD-YYYY"
                    ></VueDatePicker>
                    <div v-if="formErrors.birthdate" class="invalid-feedback">
                      {{ formErrors.birthdate }}
                    </div>
                  </div>

                  <!-- Email Address -->
                  <div class="col-md-7 mb-3">
                    <label class="form-label">Email Address *</label>
                    <input
                      v-model="accountForm.email"
                      type="email"
                      class="form-control"
                      :class="{
                        'is-invalid': formTouched.email && formErrors.email,
                      }"
                      required
                      @blur="formTouched.email = true"
                    />
                    <div
                      v-if="formTouched.email && formErrors.email"
                      class="invalid-feedback"
                    >
                      {{ formErrors.email }}
                    </div>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="d-grid">
                  <button
                    type="submit"
                    class="btn btn-primary btn-lg"
                    :disabled="!isFormValid || creatingAccount"
                  >
                    <i
                      class="bi me-2"
                      :class="
                        creatingAccount
                          ? 'bi-hourglass-split'
                          : 'bi-person-plus'
                      "
                    ></i>
                    {{
                      creatingAccount ? "Creating Account..." : "Create Account"
                    }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Credential Preview -->
        <div class="col-lg-4">
          <div class="card animate-fade-in-right">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-key me-2"></i>
                Generated Credentials
              </h5>
            </div>
            <div class="card-body">
              <div v-if="!isFormValid" class="text-center py-4">
                <i class="bi bi-person-plus text-muted fs-1 mb-3"></i>
                <p class="text-muted">Complete the form to create an account</p>
              </div>

              <div v-else class="credentials-preview">
                <div class="alert alert-info">
                  <h6 class="alert-heading">
                    <i class="bi bi-info-circle me-2"></i>
                    Account Preview
                  </h6>
                  <p class="mb-2">The following account will be created:</p>
                </div>

                <div class="credential-item mb-3">
                  <label class="form-label small text-muted">USERNAME</label>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control"
                      :value="generateUsername()"
                      readonly
                    />
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="copyToClipboard(generateUsername())"
                    >
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div class="credential-item mb-3">
                  <label class="form-label small text-muted"
                    >EMAIL ADDRESS</label
                  >
                  <div class="input-group">
                    <input
                      type="email"
                      class="form-control"
                      :value="accountForm.email"
                      readonly
                    />
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="copyToClipboard(accountForm.email)"
                    >
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div class="credential-item mb-3">
                  <label class="form-label small text-muted">PASSWORD</label>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control"
                      :value="generatedPassword"
                      readonly
                    />
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="copyToClipboard(generatedPassword)"
                    >
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div class="credential-item mb-4">
                  <label class="form-label small text-muted">FULL NAME</label>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control"
                      :value="`${accountForm.firstName} ${accountForm.lastName}`"
                      readonly
                    />
                  </div>
                </div>

                <div class="d-grid gap-2">
                  <button
                    class="btn btn-success"
                    @click="createAccount"
                    :disabled="creatingAccount"
                  >
                    <i
                      class="bi me-2"
                      :class="
                        creatingAccount
                          ? 'bi-hourglass-split'
                          : 'bi-person-plus'
                      "
                    ></i>
                    {{
                      creatingAccount ? "Creating Account..." : "Create Account"
                    }}
                  </button>
                  <button
                    class="btn btn-outline-primary"
                    @click="previewCredentials"
                  >
                    <i class="bi bi-eye me-2"></i>
                    Preview Details
                  </button>
                </div>

                <div class="mt-3">
                  <small class="text-muted">
                    <i class="bi bi-info-circle me-1"></i>
                    Account will be created with the provided password securely
                    hashed with bcrypt.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Creation History Tab -->
    <div class="animate-fade-in-up">
      <div class="card">
        <div
          class="card-header d-flex justify-content-between align-items-center"
        >
          <h5 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>
            Account Creation History
          </h5>
          <div class="d-flex gap-2">
            <button
              class="btn btn-sm btn-outline-primary"
              @click="exportHistory"
            >
              <i class="bi bi-download me-1"></i>
              Export History
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="fetchAccountCreationHistory"
            >
              <i class="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="loadingHistory" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading accounts...</p>
          </div>
          <template v-else>
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Account Holder</th>
                    <th>Type</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Credentials Sent</th>
                    <th>Last Login</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="account in accountHistory" :key="account.id">
                    <td>
                      <div class="d-flex align-items-center">
                        <div class="account-avatar me-3">
                          <i class="bi bi-person-circle"></i>
                        </div>
                        <div>
                          <div class="fw-medium">{{ account.name }}</div>
                          <small class="text-muted">{{ account.email }}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        class="badge"
                        :class="`bg-${getTypeBadgeVariant(account.type)}`"
                      >
                        {{ account.role }}
                      </span>
                    </td>
                    <td>
                      <code class="bg-light px-2 py-1 rounded">{{
                        account.username
                      }}</code>
                    </td>
                    <td>
                      <span
                        class="badge"
                        :class="`bg-${getStatusBadgeVariant(account.status)}`"
                      >
                        {{ account.status }}
                      </span>
                    </td>
                    <td>
                      <small class="small">{{
                        formatDateTime(account.createdAt)
                      }}</small>
                    </td>
                    <td>
                      <div v-if="account.credentialsSent">
                        <div class="d-flex align-items-center gap-2">
                          <i class="bi bi-check-circle-fill text-success"></i>
                          <div>
                            <small class="small">
                              {{ formatDateTime(account.credentialsSentAt) }}
                            </small>
                            <small
                              v-if="account.credentialsSentCount > 1"
                              class="text-muted"
                            >
                              Sent {{ account.credentialsSentCount }} times
                            </small>
                            <small
                              v-if="
                                account.credentialsLastSentAt &&
                                account.credentialsSentCount > 1
                              "
                              class="text-muted d-block"
                            >
                              Last:
                              {{
                                formatDateTime(account.credentialsLastSentAt)
                              }}
                            </small>
                          </div>
                        </div>
                      </div>
                      <small v-else class="text-muted">
                        <i class="bi bi-x-circle"></i>
                        Not sent
                      </small>
                    </td>
                    <td>
                      <small v-if="account.lastLogin">{{
                        formatDateTime(account.lastLogin)
                      }}</small>
                      <small v-else class="text-muted">Never</small>
                    </td>
                    <td class="text-center">
                      <div class="btn-group" role="group">
                        <button
                          class="btn btn-sm btn-outline-info"
                          title="View Details"
                          @click="openPreviewModal(account)"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-outline-primary"
                          title="Resend Credentials"
                          @click="resendCredentials(account)"
                          :disabled="resendingAccountId === account.id"
                        >
                          <i
                            :class="
                              resendingAccountId === account.id
                                ? 'bi bi-hourglass-split animate-spin'
                                : 'bi bi-send'
                            "
                          ></i>
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger"
                          title="Delete Account"
                          @click="deleteAccount(account)"
                          :disabled="deletingAccountId === account.id"
                        >
                          <i
                            :class="
                              deletingAccountId === account.id
                                ? 'bi bi-hourglass-split animate-spin'
                                : 'bi bi-trash'
                            "
                          ></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty State -->
            <div
              v-if="!loadingHistory && accountHistory.length === 0"
              class="text-center py-5"
            >
              <i class="bi bi-person-plus text-muted fs-1 mb-3"></i>
              <h5 class="text-muted">No accounts created yet</h5>
              <p class="text-muted mb-3">
                Create your first user account to get started.
              </p>
              <button class="btn btn-primary" @click="activeTab = 'create'">
                <i class="bi bi-person-plus me-2"></i>
                Create First Account
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div
      class="modal fade"
      :class="{ show: showPreviewModal }"
      :style="{ display: showPreviewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-eye me-2"></i>
              Email & SMS Preview
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedAccount">
              <!-- Account Preview -->
              <div class="mb-4">
                <h6 class="fw-medium">
                  <i class="bi bi-person-circle me-2"></i>
                  Account Details Preview
                </h6>
                <div class="account-preview border rounded p-3 bg-light">
                  <div class="account-summary mb-3">
                    <h5 class="text-primary mb-2">
                      {{ selectedAccount.firstName }}
                      {{ selectedAccount.lastName }}
                    </h5>
                    <p class="mb-2">
                      <strong>Email:</strong> {{ selectedAccount.email }}
                    </p>
                    <p class="mb-2">
                      <strong>Role:</strong> {{ selectedAccount.role }}
                    </p>
                    <p class="mb-2">
                      <strong>Username:</strong> {{ selectedAccount.username }}
                    </p>
                  </div>

                  <div
                    v-if="selectedAccount.role === 'Patient'"
                    class="patient-details"
                  >
                    <h6 class="fw-medium">Patient Information:</h6>
                  </div>

                  <div v-else class="staff-details">
                    <h6 class="fw-medium">Staff Information:</h6>
                  </div>
                </div>
              </div>

              <!-- Email Preview -->
              <div>
                <h6 class="fw-medium">
                  <i class="bi bi-envelope me-2"></i>
                  Confirmation Email Preview
                </h6>
                <div class="email-preview border rounded p-3 bg-light">
                  <div class="email-header mb-3">
                    <strong>Subject:</strong> Welcome to Baan KM-3 Health Center
                  </div>
                  <div class="email-body">
                    <p>
                      Hello
                      <strong
                        >{{ selectedAccount.firstName }}
                        {{ selectedAccount.lastName }}</strong
                      >,
                    </p>
                    <p>
                      Your account has been successfully created! Here are your
                      login details:
                    </p>
                    <div class="credentials-box p-3 bg-white rounded mb-3">
                      <p>
                        <strong>Username:</strong>
                        {{ selectedAccount.username }}
                      </p>
                      <p><strong>Email:</strong> {{ selectedAccount.email }}</p>
                      <p><strong>Role:</strong> {{ selectedAccount.role }}</p>
                      <!-- <p>
                        <strong>Password:</strong> {{ selectedAccount.password }}
                      </p> -->
                    </div>
                    <p>
                      You can now log in to the system using your email and the
                      password provided above.
                    </p>
                    <p>
                      Best regards,<br />Baan KM-3 Health Center Information
                      System
                    </p>
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
              v-if="!selectedAccount?.isHistory"
              type="button"
              class="btn btn-primary"
              @click="sendCredentialsFromModal"
              :disabled="sendingCredentialsFromModal"
            >
              <i class="bi bi-send me-2"></i>
              {{
                sendingCredentialsFromModal ? "Sending..." : "Send Credentials"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showPreviewModal"
      class="modal-backdrop fade show"
      @click="closeModals"
    ></div>

    <!-- Success Modal -->
    <div
      v-if="showSuccessModal"
      class="modal fade show"
      style="display: block"
      tabindex="-1"
      role="dialog"
      aria-labelledby="successModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body p-0">
            <div class="card border-0">
              <div class="card-body text-center p-4">
                <i class="bi bi-check-circle-fill text-success fs-1 mb-3"></i>
                <p class="card-text fs-5 fw-bold mb-4">
                  Account registered successfully
                </p>
                <button
                  type="button"
                  class="btn btn-primary me-2"
                  @click="handleSuccessModalClose"
                >
                  OK
                </button>
                <!-- <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="navigateToDashboard"
                >
                  Go to Dashboard
                </button> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal Backdrop -->
    <div
      v-if="showSuccessModal"
      class="modal-backdrop fade show"
      @click="handleSuccessModalClose"
    ></div>
  </div>
</template>

<style scoped>
/* Date picker z-index fix */
:deep(.dp__menu) {
  z-index: 9999 !important;
}

/* Success modal fade-in animation */
.modal.fade .modal-dialog {
  transition: transform 0.3s ease-out;
  transform: translate(0, -50px);
}

.modal.show .modal-dialog {
  transform: translate(0, 0);
}

/* Center the success modal */
.modal-dialog-centered .modal-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
}
.account-avatar {
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

.credentials-preview {
  background: linear-gradient(
    135deg,
    rgba(67, 97, 238, 0.05),
    rgba(63, 55, 201, 0.05)
  );
  padding: 1rem;
  border-radius: 10px;
}

.credential-item {
  background-color: white;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.form-check-input:checked {
  background-color: var(--primary-gradient-start);
  border-color: var(--primary-gradient-start);
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

.email-preview,
.sms-preview {
  font-size: 0.9rem;
  line-height: 1.4;
}

.credentials-box {
  border: 1px solid var(--primary-gradient-start);
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
