<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAppointmentRequestsStore } from "../../stores/appointmentRequests";
import { useAuthStore } from "../../stores/auth.js";

// Store
const appointmentStore = useAppointmentRequestsStore();
const authStore = useAuthStore();

// Reactive data
const search = ref("");
const showScheduleModal = ref(false);
const showRescheduleModal = ref(false);
const showCancelModal = ref(false);
const showViewModal = ref(false);
const showDenyModal = ref(false);
const selectedAppointment = ref(null);
const filterStatus = ref("all");
const denyReason = ref("");

// Form data
const appointmentForm = ref({
  patientName: "",
  patientContact: "",
  dateTime: "",
  reason: "",
  notes: "",
  type: "",
  duration: "",
  priority: "",
  symptoms: "",
});

// Computed properties
const isNurse = computed(() => authStore.isNurse);

const loading = computed(() => appointmentStore.loading);
const error = computed(() => appointmentStore.error);

const filteredAppointments = computed(() => {
  return appointmentStore.appointmentRequests.filter((appointment) => {
    const matchesSearch =
      appointment.patientName
        .toLowerCase()
        .includes(search.value.toLowerCase()) ||
      appointment.reason.toLowerCase().includes(search.value.toLowerCase()) ||
      appointment.notes.toLowerCase().includes(search.value.toLowerCase());

    const matchesStatus =
      filterStatus.value === "all" ||
      appointment.status.toLowerCase() === filterStatus.value;

    return matchesSearch && matchesStatus;
  });
});

const pendingAppointments = computed(() => appointmentStore.pendingRequests);

const todayAppointments = computed(() => appointmentStore.todayRequests);

const upcomingRequests = computed(() => appointmentStore.upcomingRequests);

// Methods

const fetchAppointments = async () => {
  await appointmentStore.fetchAppointmentRequests();
};

const resetForm = () => {
  appointmentForm.value = {
    patientName: "",
    patientContact: "",
    dateTime: "",
    reason: "",
    notes: "",
    type: "",
    duration: "",
    priority: "",
    symptoms: "",
  };
  denyReason.value = "";
};

const openScheduleModal = () => {
  resetForm();
  selectedAppointment.value = null;
  showScheduleModal.value = true;
};

const openRescheduleModal = (appointment) => {
  selectedAppointment.value = appointment;
  appointmentForm.value = {
    patientName: appointment.patientName,
    patientContact: appointment.patientContact,
    dateTime: appointment.requestedDate,
    reason: appointment.reason,
    notes: appointment.notes,
    type: appointment.type,
    duration: appointment.duration,
    priority: appointment.priority,
    symptoms: appointment.symptoms,
  };
  showRescheduleModal.value = true;
};

const openCancelModal = (appointment) => {
  selectedAppointment.value = appointment;
  showCancelModal.value = true;
};

const openDenyModal = (appointment) => {
  selectedAppointment.value = appointment;
  denyReason.value = "";
  showDenyModal.value = true;
};

const openViewModal = (appointment) => {
  selectedAppointment.value = appointment;
  showViewModal.value = true;
};

const closeModals = () => {
  showScheduleModal.value = false;
  showRescheduleModal.value = false;
  showCancelModal.value = false;
  showDenyModal.value = false;
  showViewModal.value = false;
  selectedAppointment.value = null;
  resetForm();
};

const scheduleAppointment = async () => {
  if (!isNurse.value) {
    console.warn("Access denied: Nurse role required");
    return;
  }

  try {
    const newAppointment = {
      patientName: appointmentForm.value.patientName,
      patientContact: appointmentForm.value.patientContact,
      requestedDate: appointmentForm.value.dateTime,
      reason: appointmentForm.value.reason,
      notes: appointmentForm.value.notes,
      type: appointmentForm.value.type,
      duration: appointmentForm.value.duration,
      priority: appointmentForm.value.priority,
      symptoms: appointmentForm.value.symptoms,
    };

    await appointmentStore.createAppointmentRequest(newAppointment);
    closeModals();

    console.log("Appointment scheduled successfully");
  } catch (error) {
    console.error("Error scheduling appointment:", error);
  }
};

const approveAppointment = async (appointment) => {
  if (!isNurse.value) {
    console.warn("Access denied: Nurse role required");
    return;
  }

  try {
    await appointmentStore.approveRequest(appointment.id);
    console.log("Appointment approved:", appointment.id);
  } catch (error) {
    console.error("Error approving appointment:", error);
  }
};

const denyAppointment = async () => {
  if (!isNurse.value) {
    console.warn("Access denied: Nurse role required");
    return;
  }

  if (!selectedAppointment.value || !denyReason.value.trim()) {
    return;
  }

  try {
    await appointmentStore.denyRequest(
      selectedAppointment.value.id,
      denyReason.value
    );
    closeModals();
    console.log("Appointment denied:", selectedAppointment.value.id);
  } catch (error) {
    console.error("Error denying appointment:", error);
  }
};

const rescheduleAppointment = async () => {
  if (!isNurse.value) {
    console.warn("Access denied: Nurse role required");
    return;
  }

  try {
    const updateData = {
      requestedDate: appointmentForm.value.dateTime,
      reason: appointmentForm.value.reason,
      notes: appointmentForm.value.notes,
      type: appointmentForm.value.type,
      duration: appointmentForm.value.duration,
      priority: appointmentForm.value.priority,
      symptoms: appointmentForm.value.symptoms,
    };

    await appointmentStore.updateRequest(
      selectedAppointment.value.id,
      updateData
    );
    closeModals();
    console.log("Appointment rescheduled successfully");
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
  }
};

const cancelAppointment = async () => {
  if (!isNurse.value) {
    console.warn("Access denied: Nurse role required");
    return;
  }

  try {
    await appointmentStore.denyRequest(
      selectedAppointment.value.id,
      "Cancelled by nurse"
    );
    closeModals();
    console.log("Appointment cancelled successfully");
  } catch (error) {
    console.error("Error cancelling appointment:", error);
  }
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Pending: "warning",
    Approved: "success",
    Denied: "danger",
    Cancelled: "danger",
    Completed: "info",
  };
  return variants[status] || "secondary";
};

const getPriorityBadgeVariant = (priority) => {
  const variants = {
    Low: "secondary",
    Normal: "primary",
    High: "danger",
  };
  return variants[priority] || "secondary";
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

const isToday = (dateTime) => {
  const today = new Date().toDateString();
  return new Date(dateTime).toDateString() === today;
};

const isUpcoming = (dateTime) => {
  const now = new Date();
  return new Date(dateTime) > now;
};

// Lifecycle hooks
onMounted(async () => {
  // Ensure auth is initialized before fetching data
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated && authStore.isNurse) {
    await fetchAppointments();
    await appointmentStore.setupRealtimeSubscription();
  }
});

onUnmounted(() => {
  appointmentStore.reset();
});
</script>

<template>
  <div class="appointment-requests">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Appointment Requests</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage patient appointment requests and scheduling
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button
          v-if="isNurse"
          class="btn btn-primary"
          @click="openScheduleModal"
          :disabled="appointmentStore.loading"
        >
          <i class="bi bi-calendar-plus me-2"></i>
          Schedule Appointment
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="alert alert-danger animate-fade-in-up"
      role="alert"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">Error Loading Appointments</h6>
          <p class="mb-0">{{ error }}</p>
        </div>
        <button
          class="btn btn-danger btn-sm"
          @click="
            appointmentStore.clearError();
            fetchAppointments();
          "
        >
          <i class="bi bi-arrow-clockwise me-1"></i>
          Retry
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div v-if="isNurse" class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{ appointmentStore.appointmentRequests.length }}
            </h4>
            <small class="text-muted">Total Appointments</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ pendingAppointments.length }}</h4>
            <small class="text-muted">Pending Approval</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">{{ todayAppointments.length }}</h4>
            <small class="text-muted">Today's Appointments</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-week text-info fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{ upcomingRequests.length }}
            </h4>
            <small class="text-muted">Upcoming This Week</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Access Denied Message -->
    <div v-else class="alert alert-warning animate-fade-in-up" role="alert">
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-shield-exclamation text-warning fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">Access Restricted</h6>
          <p class="mb-0">
            You need nurse privileges to manage appointment requests.
          </p>
        </div>
      </div>
    </div>

    <!-- Pending Appointments Alert -->
    <div
      v-if="pendingAppointments.length > 0"
      class="alert alert-warning animate-fade-in-up animation-delay-200"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-exclamation-triangle text-warning fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">
            Pending Appointments Require Action
          </h6>
          <p class="mb-0">
            You have {{ pendingAppointments.length }} appointment request(s)
            waiting for approval.
          </p>
        </div>
        <button class="btn btn-warning btn-sm">
          <i class="bi bi-eye me-1"></i>
          Review Pending
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-300">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search appointments by patient name or reason..."
              />
            </div>
          </div>
          <div class="col-md-6">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
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
      <p class="mt-3 text-muted">Loading appointments...</p>
    </div>

    <!-- Appointments Table -->
    <div
      v-if="isNurse && !loading"
      class="card animate-fade-in-up animation-delay-400"
    >
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-calendar-event me-2"></i>
          Appointment Requests ({{ filteredAppointments.length }})
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
                <th>Patient</th>
                <th>Date & Time</th>
                <th>Type</th>
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
                <td>
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">{{ appointment.patientName }}</div>
                      <small class="text-muted">{{
                        appointment.patientContact
                      }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ formatDateTime(appointment.requestedDate) }}</div>
                  <small
                    v-if="isToday(appointment.requestedDate)"
                    class="badge bg-primary"
                    >Today</small
                  >
                  <small
                    v-else-if="isUpcoming(appointment.requestedDate)"
                    class="badge bg-info"
                    >Upcoming</small
                  >
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getTypeBadgeVariant(appointment.type)}`"
                  >
                    {{ appointment.type }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                  >
                    {{ appointment.status }}
                  </span>
                </td>
                <td>
                  <div>{{ appointment.reason }}</div>
                  <small v-if="appointment.symptoms" class="text-muted">{{
                    appointment.symptoms
                  }}</small>
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(appointment)"
                      title="View Details"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      v-if="appointment.status === 'Pending'"
                      class="btn btn-sm btn-success"
                      @click="approveAppointment(appointment)"
                      title="Approve"
                      :disabled="loading"
                    >
                      <i class="bi bi-check"></i>
                    </button>
                    <button
                      v-if="appointment.status === 'Pending'"
                      class="btn btn-sm btn-danger"
                      @click="openDenyModal(appointment)"
                      title="Deny"
                      :disabled="loading"
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-warning"
                      @click="openRescheduleModal(appointment)"
                      title="Reschedule"
                      :disabled="loading"
                    >
                      <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button
                      v-if="
                        appointment.status !== 'Denied' &&
                        appointment.status !== 'Cancelled'
                      "
                      class="btn btn-sm btn-outline-danger"
                      @click="openCancelModal(appointment)"
                      title="Cancel"
                      :disabled="loading"
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
                : "No appointment requests yet."
            }}
          </p>
          <button
            v-if="!search"
            class="btn btn-primary"
            @click="openScheduleModal"
          >
            <i class="bi bi-calendar-plus me-2"></i>
            Schedule First Appointment
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Appointment Modal -->
    <div
      class="modal fade"
      :class="{ show: showScheduleModal }"
      :style="{ display: showScheduleModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-plus me-2"></i>
              Schedule New Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="scheduleAppointment">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient Name *</label>
                  <input
                    v-model="appointmentForm.patientName"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Contact Number *</label>
                  <input
                    v-model="appointmentForm.patientContact"
                    type="tel"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Duration (minutes)</label>
                  <select
                    v-model="appointmentForm.duration"
                    class="form-select"
                  >
                    <option value="">Select Duration</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Appointment Type *</label>
                  <select
                    v-model="appointmentForm.type"
                    class="form-select"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select
                    v-model="appointmentForm.priority"
                    class="form-select"
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Reason for Visit *</label>
                  <input
                    v-model="appointmentForm.reason"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Symptoms/Notes</label>
                  <textarea
                    v-model="appointmentForm.symptoms"
                    class="form-control"
                    rows="3"
                    placeholder="Describe symptoms or additional notes"
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
                <i class="bi bi-calendar-plus me-2"></i>
                Schedule Appointment
              </button>
            </div>
          </form>
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
              <i class="bi bi-arrow-repeat me-2"></i>
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
                <strong>{{ selectedAppointment.patientName }}</strong> -
                {{ formatDateTime(selectedAppointment.dateTime) }}
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient Name</label>
                  <input
                    v-model="appointmentForm.patientName"
                    type="text"
                    class="form-control"
                    readonly
                  />
                </div>
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
              <button type="submit" class="btn btn-warning">
                <i class="bi bi-arrow-repeat me-2"></i>
                Reschedule Appointment
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
              <strong>{{ selectedAppointment.patientName }}</strong
              ><br />
              <small>{{ formatDateTime(selectedAppointment.dateTime) }}</small
              ><br />
              <small>{{ selectedAppointment.reason }}</small>
            </div>
            <p class="text-muted mb-0">
              This action will notify the patient and mark the appointment as
              cancelled.
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
              type="submit"
              class="btn btn-danger"
              @click="cancelAppointment"
            >
              <i class="bi bi-x-circle me-2"></i>
              Cancel Appointment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- View Appointment Modal -->
    <div
      class="modal fade"
      :class="{ show: showViewModal }"
      :style="{ display: showViewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-event me-2"></i>
              Appointment Details
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedAppointment">
            <div class="row g-3">
              <div class="col-md-12">
                <div
                  class="appointment-header d-flex align-items-center mb-4 p-3 bg-light rounded"
                >
                  <div class="patient-avatar-large me-3">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <div>
                    <h4 class="mb-1">{{ selectedAppointment.patientName }}</h4>
                    <p class="text-muted mb-1">
                      {{ selectedAppointment.patientContact }}
                    </p>
                    <p class="text-muted mb-0">
                      Patient ID: {{ selectedAppointment.patientId }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium"
                  >Appointment Information</label
                >
                <div class="info-group">
                  <div class="info-item">
                    <strong>Date & Time:</strong>
                    {{ formatDateTime(selectedAppointment.dateTime) }}
                  </div>
                  <div class="info-item">
                    <strong>Type:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getTypeBadgeVariant(
                        selectedAppointment.type
                      )}`"
                    >
                      {{ selectedAppointment.type }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Duration:</strong>
                    {{ selectedAppointment.duration }} minutes
                  </div>
                  <div class="info-item">
                    <strong>Priority:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getPriorityBadgeVariant(
                        selectedAppointment.priority
                      )}`"
                    >
                      {{ selectedAppointment.priority }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        selectedAppointment.status
                      )}`"
                    >
                      {{ selectedAppointment.status }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Request Details</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Requested By:</strong>
                    {{ selectedAppointment.requestedBy }}
                  </div>
                  <div class="info-item">
                    <strong>Requested At:</strong>
                    {{ formatDateTime(selectedAppointment.requestedAt) }}
                  </div>
                  <div class="info-item">
                    <strong>Reason:</strong> {{ selectedAppointment.reason }}
                  </div>
                  <div class="info-item">
                    <strong>Symptoms:</strong>
                    {{ selectedAppointment.symptoms || "Not specified" }}
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Notes</label>
                <div class="info-group">
                  <p class="mb-0">
                    {{ selectedAppointment.notes || "No additional notes" }}
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
              v-if="selectedAppointment?.status === 'Pending'"
              type="button"
              class="btn btn-success"
              @click="approveAppointment(selectedAppointment)"
            >
              <i class="bi bi-check me-2"></i>
              Approve Appointment
            </button>
            <button
              type="button"
              class="btn btn-warning"
              @click="openRescheduleModal(selectedAppointment)"
            >
              <i class="bi bi-arrow-repeat me-2"></i>
              Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Deny Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showDenyModal }"
      :style="{ display: showDenyModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger">
              <i class="bi bi-x-circle me-2"></i>
              Deny Appointment Request
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to deny this appointment request?</p>
            <div v-if="selectedAppointment" class="alert alert-warning">
              <strong>{{ selectedAppointment.patientName }}</strong
              ><br />
              <small>{{
                formatDateTime(selectedAppointment.requestedDate)
              }}</small
              ><br />
              <small>{{ selectedAppointment.reason }}</small>
            </div>
            <div class="mb-3">
              <label class="form-label">Reason for Denial *</label>
              <textarea
                v-model="denyReason"
                class="form-control"
                rows="3"
                placeholder="Please provide a reason for denying this request"
                required
              ></textarea>
            </div>
            <p class="text-muted mb-0">
              This action will notify the patient and mark the appointment as
              denied.
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
              @click="denyAppointment"
              :disabled="!denyReason.trim()"
            >
              <i class="bi bi-x-circle me-2"></i>
              Deny Appointment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="
        showScheduleModal ||
        showRescheduleModal ||
        showCancelModal ||
        showDenyModal ||
        showViewModal
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

.appointment-header {
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

.current-appointment {
  border-left: 4px solid var(--primary-gradient-start);
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
