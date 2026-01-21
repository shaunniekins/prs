<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useNotify } from "@/composables/useNotify.js";
import { useSupabase } from "@/composables/useSupabase.js";
import { useAuthStore } from "@/stores/auth.js";
import { supabase } from "@/config/supabaseConfig.js";

// Define props for role-based customization
const props = defineProps({
  // Page title
  title: {
    type: String,
    default: "Appointments",
  },
  // Subtitle/description
  subtitle: {
    type: String,
    default: "Manage appointments",
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
const { appointments: appointmentOps, patients: patientOps } = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const search = ref("");
const showBookModal = ref(false);
const showViewModal = ref(false);
const showRescheduleModal = ref(false);
const showCancelModal = ref(false);
const selectedAppointment = ref(null);
const filterStatus = ref("all");
const error = ref(null);

// View mode: 'list' or 'calendar'
const viewMode = ref("list");

// Calendar state
const currentDate = ref(new Date());

const appointmentsList = ref([]);
const patientsList = ref([]);
const staffList = ref([]);

// Get patient record for the current user (for patient mode)
const currentPatientRecord = ref(null);

// Real-time subscription
let appointmentSubscription = null;

// Form data (only includes fields that exist in Appointment table)
const appointmentForm = ref({
  patientId: "",
  patientName: "",
  dateTime: "",
  reason: "",
  notes: "",
});

// Computed properties
const isPatient = computed(() => props.mode === "patient");
const isNurse = computed(() => props.mode === "nurse");
const isAdmin = computed(() => props.mode === "admin");
const isStaff = computed(
  () => props.mode === "nurse" || props.mode === "admin",
);

// Can the user perform staff actions?
const canManage = computed(() => isStaff.value);

const filteredAppointments = computed(() => {
  return appointmentsList.value.filter((appointment) => {
    const searchLower = search.value.toLowerCase();

    // Search by patient name, reason, or type
    const matchesSearch =
      appointment.patientName?.toLowerCase().includes(searchLower) ||
      appointment.Reason?.toLowerCase().includes(searchLower) ||
      appointment.reason?.toLowerCase().includes(searchLower) ||
      appointment.Type?.toLowerCase().includes(searchLower) ||
      appointment.type?.toLowerCase().includes(searchLower);

    const status = (
      appointment.Status ||
      appointment.status ||
      ""
    ).toLowerCase();
    const matchesStatus =
      filterStatus.value === "all" || status === filterStatus.value;

    return matchesSearch && matchesStatus;
  });
});

const upcomingAppointments = computed(() => {
  const now = new Date();
  return appointmentsList.value.filter((appointment) => {
    const dateTime = appointment.DateTime || appointment.dateTime;
    const status = appointment.Status || appointment.status;
    return new Date(dateTime) > now && status !== "Cancelled";
  });
});

const pendingAppointments = computed(() => {
  return appointmentsList.value.filter((appointment) => {
    const status = (
      appointment.Status ||
      appointment.status ||
      ""
    ).toLowerCase();
    return status === "pending";
  });
});

const completedAppointments = computed(() => {
  return appointmentsList.value.filter((appointment) => {
    const status = (
      appointment.Status ||
      appointment.status ||
      ""
    ).toLowerCase();
    return status === "completed";
  });
});

const todayAppointments = computed(() => {
  const today = new Date().toDateString();
  return appointmentsList.value.filter((appointment) => {
    const dateTime = appointment.DateTime || appointment.dateTime;
    return new Date(dateTime).toDateString() === today;
  });
});

// Stats based on role
const stats = computed(() => {
  if (isPatient.value) {
    return [
      {
        icon: "bi-calendar",
        color: "primary",
        value: appointmentsList.value.length,
        label: "Total Appointments",
      },
      {
        icon: "bi-calendar-event",
        color: "warning",
        value: upcomingAppointments.value.length,
        label: "Upcoming",
      },
      {
        icon: "bi-check-circle",
        color: "success",
        value: completedAppointments.value.length,
        label: "Completed",
      },
      {
        icon: "bi-clock",
        color: "info",
        value: pendingAppointments.value.length,
        label: "Pending",
      },
    ];
  } else {
    return [
      {
        icon: "bi-calendar",
        color: "primary",
        value: appointmentsList.value.length,
        label: "Total Appointments",
      },
      {
        icon: "bi-clock",
        color: "warning",
        value: pendingAppointments.value.length,
        label: "Pending Approval",
      },
      {
        icon: "bi-check-circle",
        color: "success",
        value: todayAppointments.value.length,
        label: "Today's Appointments",
      },
      {
        icon: "bi-calendar-week",
        color: "info",
        value: upcomingAppointments.value.length,
        label: "Upcoming",
      },
    ];
  }
});

// Calendar computed properties
const currentMonth = computed(() => currentDate.value.getMonth());
const currentYear = computed(() => currentDate.value.getFullYear());

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const currentMonthName = computed(() => {
  return `${monthNames[currentMonth.value]} ${currentYear.value}`;
});

const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  const days = [];
  let currentWeek = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const prevDate = new Date(year, month, -firstDay.getDay() + i + 1);
    currentWeek.push({
      date: prevDate,
      day: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: false,
      appointments: [],
    });
  }

  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toDateString();

    // Find appointments for this day
    const dayAppointments = appointmentsList.value.filter((apt) => {
      const aptDate = new Date(apt.dateTime || apt.DateTime);
      return aptDate.toDateString() === dateStr;
    });

    currentWeek.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: date.toDateString() === new Date().toDateString(),
      appointments: dayAppointments,
    });

    // Start a new week on Sunday
    if (currentWeek.length === 7) {
      days.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining days of the last week
  if (currentWeek.length > 0) {
    const remaining = 7 - currentWeek.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      currentWeek.push({
        date: nextDate,
        day: nextDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        appointments: [],
      });
    }
    days.push(currentWeek);
  }

  return days;
});

// Calendar methods
const navigateMonth = (direction) => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + direction);
  currentDate.value = newDate;
};

const goToToday = () => {
  currentDate.value = new Date();
};

const selectDayAppointment = (appointment) => {
  selectedAppointment.value = appointment;
  showViewModal.value = true;
};

// Methods
const fetchAppointments = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Ensure auth is initialized
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error("Please log in to view appointments");
    }

    let data;

    if (isPatient.value) {
      // Get patient's own appointments
      data = await appointmentOps.getMyAppointments();

      // Also get current patient record for booking
      const patientData = await patientOps.getMyPatients();
      if (patientData && patientData.length > 0) {
        currentPatientRecord.value = patientData[0];
      }
    } else {
      // Get all appointments for staff
      data = await appointmentOps.getAllAppointments();

      // Also fetch patients list for staff to select from
      const patientsData = await patientOps.getAllPatients();
      patientsList.value = patientsData || [];
    }

    // Normalize appointment data
    appointmentsList.value = (data || []).map(normalizeAppointment);
  } catch (err) {
    error.value = err.message || "Failed to fetch appointments";
    showError(error.value);
    console.error("Error fetching appointments:", err);
  } finally {
    loading.value = false;
  }
};

// Normalize appointment data to a consistent format
const normalizeAppointment = (apt) => {
  // Get patient name from joined data or construct it
  let patientName = "";
  if (apt.Patients) {
    patientName =
      `${apt.Patients.FirstName || ""} ${apt.Patients.Surname || ""}`.trim();
  } else if (apt.patientName) {
    patientName = apt.patientName;
  }

  return {
    id: apt.AppointmentID || apt.id,
    AppointmentID: apt.AppointmentID || apt.id,
    patientId: apt.PatientID || apt.patientId,
    patientName,
    patientContact: apt.Patients?.ContactNumber || apt.patientContact || "",
    dateTime: apt.DateTime || apt.dateTime,
    DateTime: apt.DateTime || apt.dateTime,
    type: apt.Type || apt.type || "Consultation",
    Type: apt.Type || apt.type || "Consultation",
    status: apt.Status || apt.status || "Pending",
    Status: apt.Status || apt.status || "Pending",
    reason: apt.Reason || apt.reason || "",
    Reason: apt.Reason || apt.reason || "",
    notes: apt.Notes || apt.notes || "",
    Notes: apt.Notes || apt.notes || "",
    symptoms: apt.Symptoms || apt.symptoms || "",
    Symptoms: apt.Symptoms || apt.symptoms || "",
    priority: apt.Priority || apt.priority || "Normal",
    Priority: apt.Priority || apt.priority || "Normal",
  };
};

const setupRealtimeSubscription = () => {
  appointmentSubscription = supabase
    .channel("appointments-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Appointment" },
      () => {
        fetchAppointments();
      },
    )
    .subscribe();
};

const resetForm = () => {
  appointmentForm.value = {
    patientId: "",
    patientName: "",
    dateTime: "",
    reason: "",
    notes: "",
  };
};

const openBookModal = () => {
  resetForm();
  selectedAppointment.value = null;

  // For patients, pre-fill with their info
  if (isPatient.value && currentPatientRecord.value) {
    appointmentForm.value.patientId = currentPatientRecord.value.PatientID;
    appointmentForm.value.patientName = `${currentPatientRecord.value.FirstName} ${currentPatientRecord.value.Surname}`;
  }

  showBookModal.value = true;
};

const openViewModal = (appointment) => {
  selectedAppointment.value = appointment;
  showViewModal.value = true;
};

const openRescheduleModal = (appointment) => {
  selectedAppointment.value = appointment;
  appointmentForm.value = {
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    dateTime: appointment.dateTime || appointment.DateTime,
    reason: appointment.reason || appointment.Reason,
    notes: appointment.notes || appointment.Notes,
  };
  showRescheduleModal.value = true;
};

const openCancelModal = (appointment) => {
  selectedAppointment.value = appointment;
  showCancelModal.value = true;
};

const closeModals = () => {
  showBookModal.value = false;
  showViewModal.value = false;
  showRescheduleModal.value = false;
  showCancelModal.value = false;
  selectedAppointment.value = null;
  resetForm();
};

const bookAppointment = async () => {
  loading.value = true;
  error.value = null;

  try {
    let patientId = appointmentForm.value.patientId;

    // For patients, use their patient record
    if (isPatient.value) {
      if (!currentPatientRecord.value) {
        throw new Error("Patient record not found. Please contact support.");
      }
      patientId = currentPatientRecord.value.PatientID;
    }

    if (!patientId) {
      throw new Error("Please select a patient");
    }

    // Note: Appointment table columns are: PatientID, DateTime, EndDateTime, Status, Reason, Notes
    // 'Type' column does not exist in the schema
    const appointmentData = {
      PatientID: patientId,
      DateTime: appointmentForm.value.dateTime,
      Reason: appointmentForm.value.reason,
      Notes: appointmentForm.value.notes,
      Status: isPatient.value ? "Pending" : "Confirmed",
    };

    await appointmentOps.createAppointment(appointmentData);
    await fetchAppointments();
    closeModals();

    showSuccess(
      isPatient.value
        ? "Appointment request submitted successfully!"
        : "Appointment scheduled successfully!",
    );
  } catch (err) {
    error.value = err.message || "Failed to book appointment";
    showError(error.value);
    console.error("Error booking appointment:", err);
  } finally {
    loading.value = false;
  }
};

const rescheduleAppointment = async () => {
  if (!selectedAppointment.value) {
    showError("No appointment selected");
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Note: 'Type' column does not exist in the Appointment table
    const updateData = {
      DateTime: appointmentForm.value.dateTime,
      Reason: appointmentForm.value.reason,
      Notes: appointmentForm.value.notes,
      Status: "Pending", // Reset to pending when rescheduled
    };

    await appointmentOps.updateAppointment(
      selectedAppointment.value.id,
      updateData,
    );
    await fetchAppointments();
    closeModals();

    showSuccess("Appointment rescheduled successfully!");
  } catch (err) {
    error.value = err.message || "Failed to reschedule appointment";
    showError(error.value);
    console.error("Error rescheduling appointment:", err);
  } finally {
    loading.value = false;
  }
};

const cancelAppointment = async () => {
  if (!selectedAppointment.value) {
    showError("No appointment selected");
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    await appointmentOps.updateAppointment(selectedAppointment.value.id, {
      Status: "Cancelled",
    });
    await fetchAppointments();
    closeModals();

    showSuccess("Appointment cancelled successfully!");
  } catch (err) {
    error.value = err.message || "Failed to cancel appointment";
    showError(error.value);
    console.error("Error cancelling appointment:", err);
  } finally {
    loading.value = false;
  }
};

const approveAppointment = async (appointment) => {
  loading.value = true;
  try {
    await appointmentOps.updateAppointment(appointment.id, {
      Status: "Confirmed",
    });
    await fetchAppointments();
    showSuccess("Appointment approved!");
  } catch (err) {
    showError("Failed to approve appointment");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const denyAppointment = async (appointment) => {
  loading.value = true;
  try {
    await appointmentOps.updateAppointment(appointment.id, {
      Status: "Denied",
    });
    await fetchAppointments();
    showSuccess("Appointment denied!");
  } catch (err) {
    showError("Failed to deny appointment");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const completeAppointment = async (appointment) => {
  loading.value = true;
  try {
    await appointmentOps.updateAppointment(appointment.id, {
      Status: "Completed",
    });
    await fetchAppointments();
    showSuccess("Appointment marked as completed!");
  } catch (err) {
    showError("Failed to complete appointment");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Helper functions
const getStatusBadgeVariant = (status) => {
  const variants = {
    Pending: "warning",
    pending: "warning",
    Confirmed: "success",
    confirmed: "success",
    Approved: "success",
    approved: "success",
    Cancelled: "danger",
    cancelled: "danger",
    Denied: "danger",
    denied: "danger",
    Completed: "info",
    completed: "info",
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
  if (!dateTime) return "N/A";
  return new Date(dateTime).toLocaleString();
};

const isToday = (dateTime) => {
  if (!dateTime) return false;
  const today = new Date().toDateString();
  return new Date(dateTime).toDateString() === today;
};

const isUpcoming = (dateTime) => {
  if (!dateTime) return false;
  const now = new Date();
  return new Date(dateTime) > now;
};

const canModify = (appointment) => {
  const status = (appointment.status || appointment.Status || "").toLowerCase();
  return status === "confirmed" || status === "pending";
};

const canCancel = (appointment) => {
  const status = (appointment.status || appointment.Status || "").toLowerCase();
  return (
    status !== "completed" && status !== "cancelled" && status !== "denied"
  );
};

const canApprove = (appointment) => {
  const status = (appointment.status || appointment.Status || "").toLowerCase();
  return status === "pending" && isStaff.value;
};

// Lifecycle hooks
onMounted(async () => {
  await fetchAppointments();
  setupRealtimeSubscription();
});

onUnmounted(() => {
  if (appointmentSubscription) {
    supabase.removeChannel(appointmentSubscription);
  }
});
</script>

<template>
  <div class="appointments-view">
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
          class="btn btn-primary"
          @click="openBookModal"
          :disabled="loading"
        >
          <i class="bi bi-calendar-plus me-2"></i>
          {{ isPatient ? "Book Appointment" : "Schedule Appointment" }}
        </button>
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

    <!-- Search, Filters, and View Toggle -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-md-4">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                :placeholder="
                  isPatient
                    ? 'Search by reason...'
                    : 'Search by patient name, reason...'
                "
              />
            </div>
          </div>
          <div class="col-md-4">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option v-if="isStaff" value="denied">Denied</option>
            </select>
          </div>
          <div class="col-md-4">
            <div class="btn-group w-100" role="group">
              <button
                type="button"
                class="btn"
                :class="
                  viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'
                "
                @click="viewMode = 'list'"
              >
                <i class="bi bi-list-ul me-1"></i>
                List
              </button>
              <button
                type="button"
                class="btn"
                :class="
                  viewMode === 'calendar'
                    ? 'btn-primary'
                    : 'btn-outline-primary'
                "
                @click="viewMode = 'calendar'"
              >
                <i class="bi bi-calendar3 me-1"></i>
                Calendar
              </button>
            </div>
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
      <p class="mt-3 text-muted">Loading appointments...</p>
    </div>

    <!-- Appointments Table (List View) -->
    <div
      v-else-if="viewMode === 'list'"
      class="card animate-fade-in-up animation-delay-300"
    >
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-calendar-event me-2"></i>
          {{ isPatient ? "My Appointments" : "Appointment Requests" }}
          ({{ filteredAppointments.length }})
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchAppointments"
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
                <th>Date & Time</th>
                <th>Status</th>
                <th>Reason</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="appointment in filteredAppointments"
                :key="appointment.id"
                class="animate-fade-in-up"
              >
                <!-- Patient Column (Staff only) -->
                <td v-if="isStaff">
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-2">
                      <i class="bi bi-person-circle fs-4 text-muted"></i>
                    </div>
                    <div>
                      <div class="fw-medium">
                        {{ appointment.patientName || "Unknown Patient" }}
                      </div>
                      <small
                        v-if="appointment.patientContact"
                        class="text-muted"
                      >
                        {{ appointment.patientContact }}
                      </small>
                    </div>
                  </div>
                </td>

                <!-- Date & Time -->
                <td>
                  <div>{{ formatDateTime(appointment.dateTime) }}</div>
                  <small
                    v-if="isToday(appointment.dateTime)"
                    class="badge bg-primary"
                    >Today</small
                  >
                  <small
                    v-else-if="isUpcoming(appointment.dateTime)"
                    class="badge bg-info"
                    >Upcoming</small
                  >
                  <small v-else class="badge bg-secondary">Past</small>
                </td>

                <!-- Status -->
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                  >
                    {{ appointment.status }}
                  </span>
                </td>

                <!-- Reason -->
                <td>
                  <div>{{ appointment.reason }}</div>
                  <small v-if="appointment.symptoms" class="text-muted">
                    {{ appointment.symptoms }}
                  </small>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <!-- View Details -->
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(appointment)"
                      title="View Details"
                    >
                      <i class="bi bi-eye"></i>
                    </button>

                    <!-- Staff Actions: Approve/Deny -->
                    <template v-if="canApprove(appointment)">
                      <button
                        class="btn btn-sm btn-success"
                        @click="approveAppointment(appointment)"
                        title="Approve"
                        :disabled="loading"
                      >
                        <i class="bi bi-check"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-danger"
                        @click="denyAppointment(appointment)"
                        title="Deny"
                        :disabled="loading"
                      >
                        <i class="bi bi-x-circle"></i>
                      </button>
                    </template>

                    <!-- Complete (Staff only) -->
                    <button
                      v-if="
                        isStaff &&
                        appointment.status?.toLowerCase() === 'confirmed'
                      "
                      class="btn btn-sm btn-outline-success"
                      @click="completeAppointment(appointment)"
                      title="Mark Complete"
                      :disabled="loading"
                    >
                      <i class="bi bi-check-circle"></i>
                    </button>

                    <!-- Reschedule -->
                    <button
                      v-if="canModify(appointment)"
                      class="btn btn-sm btn-outline-primary"
                      @click="openRescheduleModal(appointment)"
                      title="Reschedule"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>

                    <!-- Cancel -->
                    <button
                      v-if="canCancel(appointment)"
                      class="btn btn-sm btn-outline-danger"
                      @click="openCancelModal(appointment)"
                      title="Cancel"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredAppointments.length === 0" class="text-center py-5">
          <i class="bi bi-calendar-x text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No appointments found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : isPatient
                  ? "You haven't booked any appointments yet."
                  : "No appointment requests yet."
            }}
          </p>
          <button v-if="!search" class="btn btn-primary" @click="openBookModal">
            <i class="bi bi-calendar-plus me-2"></i>
            {{
              isPatient
                ? "Book Your First Appointment"
                : "Schedule First Appointment"
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div
      v-else-if="viewMode === 'calendar'"
      class="card animate-fade-in-up animation-delay-300"
    >
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <div class="d-flex align-items-center">
          <button
            class="btn btn-sm btn-outline-primary me-2"
            @click="navigateMonth(-1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>
          <h5 class="mb-0 mx-3">{{ currentMonthName }}</h5>
          <button
            class="btn btn-sm btn-outline-primary ms-2"
            @click="navigateMonth(1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
        <div>
          <button
            class="btn btn-sm btn-outline-secondary me-2"
            @click="goToToday"
          >
            Today
          </button>
          <button
            class="btn btn-sm btn-outline-primary"
            @click="fetchAppointments"
            :disabled="loading"
          >
            <i
              class="bi bi-arrow-clockwise me-1"
              :class="{ 'animate-spin': loading }"
            ></i>
            Refresh
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="calendar-grid">
          <!-- Day Headers -->
          <div class="calendar-header">
            <div v-for="day in dayNames" :key="day" class="calendar-day-header">
              {{ day }}
            </div>
          </div>

          <!-- Calendar Weeks -->
          <div
            v-for="(week, weekIndex) in calendarDays"
            :key="weekIndex"
            class="calendar-week"
          >
            <div
              v-for="(day, dayIndex) in week"
              :key="dayIndex"
              class="calendar-day"
              :class="{
                'other-month': !day.isCurrentMonth,
                today: day.isToday,
                'has-appointments': day.appointments.length > 0,
              }"
            >
              <div class="day-number">{{ day.day }}</div>
              <div class="day-appointments">
                <div
                  v-for="apt in day.appointments.slice(0, 3)"
                  :key="apt.id"
                  class="appointment-dot"
                  :class="`status-${(apt.status || 'pending').toLowerCase()}`"
                  @click="selectDayAppointment(apt)"
                  :title="`${apt.patientName || 'Appointment'} - ${apt.reason || 'No reason'}`"
                >
                  <span class="appointment-time">
                    {{
                      new Date(apt.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }}
                  </span>
                </div>
                <div
                  v-if="day.appointments.length > 3"
                  class="more-appointments"
                >
                  +{{ day.appointments.length - 3 }} more
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="appointmentsList.length === 0" class="text-center py-5">
          <i class="bi bi-calendar-x text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No appointments scheduled</h5>
          <button class="btn btn-primary mt-2" @click="openBookModal">
            <i class="bi bi-calendar-plus me-2"></i>
            {{
              isPatient
                ? "Book Your First Appointment"
                : "Schedule First Appointment"
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Book/Schedule Modal -->
    <div
      class="modal fade"
      :class="{ show: showBookModal }"
      :style="{ display: showBookModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-plus me-2"></i>
              {{
                isPatient ? "Book New Appointment" : "Schedule New Appointment"
              }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="bookAppointment">
            <div class="modal-body">
              <div class="row g-3">
                <!-- Patient Selection (Staff only) -->
                <div v-if="isStaff" class="col-md-12">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="appointmentForm.patientId"
                    class="form-select"
                    required
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

                <!-- Date & Time (full width when no Type dropdown) -->
                <div class="col-md-12">
                  <label class="form-label">Preferred Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>

                <!-- Reason -->
                <div class="col-md-12">
                  <label class="form-label">Reason for Visit *</label>
                  <input
                    v-model="appointmentForm.reason"
                    type="text"
                    class="form-control"
                    required
                    placeholder="Brief description of your concern"
                  />
                </div>

                <!-- Notes -->
                <div class="col-md-12">
                  <label class="form-label">Additional Notes</label>
                  <textarea
                    v-model="appointmentForm.notes"
                    class="form-control"
                    rows="2"
                    placeholder="Any additional information"
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
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <i
                  class="bi bi-calendar-plus me-2"
                  :class="{ 'animate-spin': loading }"
                ></i>
                {{
                  loading
                    ? "Submitting..."
                    : isPatient
                      ? "Book Appointment"
                      : "Schedule"
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Details Modal -->
    <div
      class="modal fade"
      :class="{ show: showViewModal }"
      :style="{ display: showViewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-info-circle me-2"></i>
              Appointment Details
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedAppointment">
            <div class="mb-3" v-if="isStaff">
              <strong>Patient:</strong>
              <p class="mb-0">{{ selectedAppointment.patientName }}</p>
            </div>
            <div class="mb-3">
              <strong>Date & Time:</strong>
              <p class="mb-0">
                {{ formatDateTime(selectedAppointment.dateTime) }}
              </p>
            </div>
            <div class="mb-3">
              <strong>Status:</strong>
              <span
                class="badge ms-2"
                :class="`bg-${getStatusBadgeVariant(selectedAppointment.status)}`"
              >
                {{ selectedAppointment.status }}
              </span>
            </div>
            <div class="mb-3">
              <strong>Reason:</strong>
              <p class="mb-0">{{ selectedAppointment.reason || "N/A" }}</p>
            </div>
            <div class="mb-3" v-if="selectedAppointment.symptoms">
              <strong>Symptoms:</strong>
              <p class="mb-0">{{ selectedAppointment.symptoms }}</p>
            </div>
            <div class="mb-0" v-if="selectedAppointment.notes">
              <strong>Notes:</strong>
              <p class="mb-0">{{ selectedAppointment.notes }}</p>
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
          </div>
        </div>
      </div>
    </div>

    <!-- Reschedule Modal -->
    <div
      class="modal fade"
      :class="{ show: showRescheduleModal }"
      :style="{ display: showRescheduleModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Reschedule Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="rescheduleAppointment">
            <div class="modal-body">
              <div
                v-if="selectedAppointment"
                class="current-appointment mb-4 p-3 bg-light rounded"
              >
                <h6 class="mb-2">Current Appointment:</h6>
                <strong v-if="isStaff"
                  >{{ selectedAppointment.patientName }} -
                </strong>
                {{ formatDateTime(selectedAppointment.dateTime) }}
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">New Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Reason for Rescheduling</label>
                  <textarea
                    v-model="appointmentForm.notes"
                    class="form-control"
                    rows="2"
                    placeholder="Reason for rescheduling"
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
              <button type="submit" class="btn btn-warning" :disabled="loading">
                <i
                  class="bi bi-arrow-repeat me-2"
                  :class="{ 'animate-spin': loading }"
                ></i>
                {{ loading ? "Rescheduling..." : "Reschedule Appointment" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showCancelModal }"
      :style="{ display: showCancelModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Cancel Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to cancel this appointment?</p>
            <div v-if="selectedAppointment" class="alert alert-warning">
              <strong v-if="isStaff">{{
                selectedAppointment.patientName
              }}</strong>
              <br v-if="isStaff" />
              <strong>{{ selectedAppointment.type }}</strong
              ><br />
              <small>{{ formatDateTime(selectedAppointment.dateTime) }}</small
              ><br />
              <small>{{ selectedAppointment.reason }}</small>
            </div>
            <p class="text-muted mb-0">
              This action cannot be undone. You'll need to book a new
              appointment if needed.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModals"
            >
              Keep Appointment
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="cancelAppointment"
              :disabled="loading"
            >
              <i
                class="bi bi-x-circle me-2"
                :class="{ 'animate-spin': loading }"
              ></i>
              {{ loading ? "Cancelling..." : "Cancel Appointment" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        showBookModal || showViewModal || showRescheduleModal || showCancelModal
      "
      class="modal-backdrop fade show"
      @click="closeModals"
    ></div>
  </div>
</template>

<style scoped>
.appointments-view {
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

/* Calendar Styles */
.calendar-grid {
  display: flex;
  flex-direction: column;
  background-color: #dee2e6;
  border-radius: 0.5rem;
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.calendar-day-header {
  background-color: #0d6efd;
  color: white;
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.calendar-day {
  background-color: white;
  min-height: 100px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.calendar-day:hover {
  background-color: #f0f7ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.calendar-day.other-month {
  background-color: #f8f9fa;
}

.calendar-day.other-month .day-number {
  color: #adb5bd;
}

.calendar-day.today {
  background-color: #e7f1ff;
}

.calendar-day.today .day-number {
  background-color: #0d6efd;
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.calendar-day.has-appointments {
  border-left: 3px solid #198754;
}

.day-number {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.375rem;
  color: #212529;
}

.day-appointments {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.appointment-dot {
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.appointment-dot:hover {
  transform: scale(1.02);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.appointment-dot.status-pending {
  background-color: #fff3cd;
  color: #856404;
  border-left: 3px solid #ffc107;
}

.appointment-dot.status-confirmed {
  background-color: #d4edda;
  color: #155724;
  border-left: 3px solid #198754;
}

.appointment-dot.status-completed {
  background-color: #cff4fc;
  color: #0c5460;
  border-left: 3px solid #0dcaf0;
}

.appointment-dot.status-cancelled,
.appointment-dot.status-denied {
  background-color: #f8d7da;
  color: #721c24;
  border-left: 3px solid #dc3545;
}

.appointment-time {
  font-weight: 600;
}

.more-appointments {
  font-size: 0.7rem;
  color: #6c757d;
  cursor: pointer;
  padding: 2px 6px;
  text-align: center;
  background-color: #e9ecef;
  border-radius: 3px;
  margin-top: 2px;
}

.more-appointments:hover {
  background-color: #dee2e6;
  color: #495057;
}

/* Responsive adjustments for calendar */
@media (max-width: 992px) {
  .calendar-day {
    min-height: 80px;
    padding: 0.375rem;
  }

  .calendar-day-header {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
  }

  .day-number {
    font-size: 0.75rem;
  }

  .appointment-dot {
    font-size: 0.625rem;
    padding: 2px 4px;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 70px;
    padding: 0.25rem;
  }

  .calendar-day-header {
    padding: 0.5rem 0.125rem;
    font-size: 0.625rem;
  }

  .day-number {
    font-size: 0.7rem;
  }

  .appointment-dot {
    font-size: 0.5rem;
    padding: 1px 3px;
  }

  .more-appointments {
    font-size: 0.5rem;
    padding: 1px 3px;
  }

  .calendar-day.today .day-number {
    width: 22px;
    height: 22px;
  }
}
</style>
