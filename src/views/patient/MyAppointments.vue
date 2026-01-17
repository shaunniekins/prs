<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNotify } from "@/composables/useNotify.js";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

// Composables
const { showSuccess, showError } = useNotify();
const { appointments: appointmentOps, patients: patientOps } = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const search = ref("");
const showBookModal = ref(false);
const showRescheduleModal = ref(false);
const showCancelModal = ref(false);
const selectedAppointment = ref(null);
const filterStatus = ref("all");
const error = ref(null);

const appointmentsList = ref([]);

// Form data
const appointmentForm = ref({
  dateTime: "",
  type: "",
  reason: "",
  symptoms: "",
  notes: "",
});

// Computed properties
const filteredAppointments = computed(() => {
  return appointmentsList.value.filter((appointment) => {
    const matchesSearch =
      appointment.Reason?.toLowerCase().includes(search.value.toLowerCase()) ||
      false ||
      appointment.Type?.toLowerCase().includes(search.value.toLowerCase()) ||
      false;

    const matchesStatus =
      filterStatus.value === "all" ||
      appointment.Status?.toLowerCase() === filterStatus.value;

    return matchesSearch && matchesStatus;
  });
});

const upcomingAppointments = computed(() => {
  const now = new Date();
  return appointmentsList.value.filter(
    (appointment) =>
      new Date(appointment.DateTime) > now && appointment.Status !== "Cancelled"
  );
});

const pastAppointments = computed(() => {
  const now = new Date();
  return appointmentsList.value.filter(
    (appointment) =>
      new Date(appointment.DateTime) <= now ||
      appointment.Status === "Completed"
  );
});

// Methods
const fetchAppointments = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Ensure auth is initialized before fetching data
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error("Please log in to view appointments");
    }

    const data = await appointmentOps.getMyAppointments();
    appointmentsList.value = data || [];
  } catch (err) {
    error.value = err.message || "Failed to fetch appointments";
    showError(error.value);
    console.error("Error fetching appointments:", err);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  appointmentForm.value = {
    dateTime: "",
    type: "",
    reason: "",
    symptoms: "",
    notes: "",
  };
};

const openBookModal = () => {
  resetForm();
  selectedAppointment.value = null;
  showBookModal.value = true;
};

const openRescheduleModal = (appointment) => {
  selectedAppointment.value = appointment;
  appointmentForm.value = {
    dateTime: appointment.DateTime,
    type: appointment.Type,
    reason: appointment.Reason,
    symptoms: appointment.Symptoms,
    notes: appointment.Notes,
  };
  showRescheduleModal.value = true;
};

const openCancelModal = (appointment) => {
  selectedAppointment.value = appointment;
  showCancelModal.value = true;
};

const closeModals = () => {
  showBookModal.value = false;
  showRescheduleModal.value = false;
  showCancelModal.value = false;
  selectedAppointment.value = null;
  resetForm();
};

const bookAppointment = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Get current user's patient record first
    const patientData = await patientOps.getMyPatients();
    if (!patientData || patientData.length === 0) {
      throw new Error("Patient record not found. Please contact support.");
    }

    const appointmentData = {
      PatientID: patientData[0].PatientID,
      DateTime: appointmentForm.value.dateTime,
      Type: appointmentForm.value.type,
      Reason: appointmentForm.value.reason,
      Symptoms: appointmentForm.value.symptoms,
      Notes: appointmentForm.value.notes,
      Status: "Pending",
    };

    await appointmentOps.createAppointment(appointmentData);
    await fetchAppointments();
    closeModals();

    showSuccess("Appointment booked successfully!");
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
    const updateData = {
      DateTime: appointmentForm.value.dateTime,
      Type: appointmentForm.value.type,
      Reason: appointmentForm.value.reason,
      Symptoms: appointmentForm.value.symptoms,
      Notes: appointmentForm.value.notes,
      Status: "Pending", // Reset to pending when rescheduled
    };

    // Mock updating appointment
    console.log(
      "Rescheduling appointment:",
      selectedAppointment.value.AppointmentID,
      updateData
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
    // Mock cancelling appointment
    console.log(
      "Cancelling appointment:",
      selectedAppointment.value.AppointmentID
    );

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

const getStatusBadgeVariant = (status) => {
  const variants = {
    Pending: "warning",
    Confirmed: "success",
    Cancelled: "danger",
    Completed: "info",
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

const isUpcoming = (dateTime) => {
  const now = new Date();
  return new Date(dateTime) > now;
};

const isToday = (dateTime) => {
  const today = new Date().toDateString();
  return new Date(dateTime).toDateString() === today;
};

const canModify = (appointment) => {
  return appointment.Status === "Confirmed" || appointment.Status === "Pending";
};

const canCancel = (appointment) => {
  return (
    appointment.Status !== "Completed" && appointment.Status !== "Cancelled"
  );
};

// Initialization
onMounted(async () => {
  await fetchAppointments();
});

// Cleanup on unmount
onUnmounted(() => {
  // Any cleanup if needed
});
</script>

<template>
  <div class="my-appointments">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">My Appointments</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          View and manage your medical appointments
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openBookModal">
          <i class="bi bi-calendar-plus me-2"></i>
          Book New Appointment
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ appointmentsList.length || 0 }}</h4>
            <small class="text-muted">Total Appointments</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-event text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ upcomingAppointments.length }}</h4>
            <small class="text-muted">Upcoming</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                pastAppointments.filter((a) => a.Status === "Completed").length
              }}
            </h4>
            <small class="text-muted">Completed</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-info fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                pastAppointments.filter((a) => a.Status === "Pending").length
              }}
            </h4>
            <small class="text-muted">Pending</small>
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
                placeholder="Search appointments by reason or type..."
              />
            </div>
          </div>
          <div class="col-md-6">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
      <p class="mt-3 text-muted">Loading appointments...</p>
    </div>

    <!-- Appointments Table -->
    <div v-else class="card animate-fade-in-up animation-delay-300">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-calendar-event me-2"></i>
          My Appointments ({{ filteredAppointments.length }})
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
                  <div>
                    {{ formatDateTime(appointment.DateTime) }}
                  </div>
                  <small
                    v-if="isToday(appointment.DateTime)"
                    class="badge bg-primary"
                    >Today</small
                  >
                  <small
                    v-else-if="isUpcoming(appointment.DateTime)"
                    class="badge bg-info"
                    >Upcoming</small
                  >
                  <small v-else class="badge bg-secondary">Past</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getTypeBadgeVariant(appointment.Type)}`"
                  >
                    {{ appointment.Type }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(appointment.Status)}`"
                  >
                    {{ appointment.Status }}
                  </span>
                </td>
                <td>
                  <div>{{ appointment.Reason }}</div>
                  <small v-if="appointment.Symptoms" class="text-muted">{{
                    appointment.Symptoms
                  }}</small>
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      title="View Details"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      v-if="canModify(appointment)"
                      class="btn btn-sm btn-outline-primary"
                      @click="openRescheduleModal(appointment)"
                      title="Reschedule"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
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
                : "You haven't booked any appointments yet."
            }}
          </p>
          <button v-if="!search" class="btn btn-primary" @click="openBookModal">
            <i class="bi bi-calendar-plus me-2"></i>
            Book Your First Appointment
          </button>
        </div>
      </div>
    </div>

    <!-- Upcoming Appointments Summary -->
    <div
      v-if="upcomingAppointments.length > 0"
      class="card mt-4 animate-fade-in-up animation-delay-400"
    >
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-calendar-event me-2"></i>
          Upcoming Appointments
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div
            v-for="appointment in upcomingAppointments.slice(0, 3)"
            :key="appointment.id"
            class="col-md-12"
          >
            <div
              class="upcoming-appointment-card p-3 border rounded animate-fade-in-up"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-2">
                    <div class="appointment-icon-small me-3">
                      <i class="bi bi-calendar-check text-primary"></i>
                    </div>
                    <div>
                      <strong>{{ appointment.Type }}</strong>
                      <span
                        class="badge ms-2"
                        :class="`bg-${getTypeBadgeVariant(appointment.Type)}`"
                      >
                        {{ appointment.Type }}
                      </span>
                    </div>
                  </div>
                  <h6 class="mb-2">{{ appointment.Reason }}</h6>
                  <p class="mb-1">
                    {{ formatDateTime(appointment.DateTime) }}
                  </p>
                  <small class="text-muted">{{
                    appointment.Notes || "No additional notes"
                  }}</small>
                </div>
                <div class="text-end">
                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    @click="openRescheduleModal(appointment)"
                  >
                    <i class="bi bi-pencil me-1"></i>
                    Reschedule
                  </button>
                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="openCancelModal(appointment)"
                  >
                    <i class="bi bi-x me-1"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Book Appointment Modal -->
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
              Book New Appointment
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
                <div class="col-md-6">
                  <label class="form-label">Preferred Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Appointment Type *</label>
                  <select
                    v-model="appointmentForm.type"
                    class="form-select"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
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
                <div class="col-md-12">
                  <label class="form-label">Symptoms</label>
                  <textarea
                    v-model="appointmentForm.symptoms"
                    class="form-control"
                    rows="2"
                    placeholder="Describe your symptoms or concerns"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Additional Notes</label>
                  <textarea
                    v-model="appointmentForm.notes"
                    class="form-control"
                    rows="2"
                    placeholder="Any additional information or special requests"
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
                {{ loading ? "Booking..." : "Book Appointment" }}
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
                <strong>{{ selectedAppointment.Type }}</strong> -
                {{ formatDateTime(selectedAppointment.DateTime) }}
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
              <strong>{{ selectedAppointment.Type }}</strong
              ><br />
              <small>{{ formatDateTime(selectedAppointment.DateTime) }}</small
              ><br />
              <small>{{ selectedAppointment.Reason }}</small>
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
              type="submit"
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
      v-if="showBookModal || showRescheduleModal || showCancelModal"
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

.appointment-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

.current-appointment {
  border-left: 4px solid var(--primary-gradient-start);
}

.upcoming-appointment-card {
  background-color: var(--light-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.upcoming-appointment-card:hover {
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
