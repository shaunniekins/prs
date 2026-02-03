<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";
import { useAuthGuard } from "../../composables/useAuthGuard.js";

// Initialize composables
const { appointments, medicalRecords, patients, loading, error } =
  useSupabase();
const authStore = useAuthStore();
const { user } = authStore;
const { waitForPatientAccess } = useAuthGuard();

// Reactive data
const appointmentsData = ref([]);
const medicalRecordsData = ref([]);
const patientData = ref(null);
const stats = ref({
  totalAppointments: 0,
  upcomingAppointments: 0,
  completedAppointments: 0,
  totalRecords: 0,
  recentActivities: [],
});

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const formatAppointmentDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActivityIcon = (type) => {
  const icons = {
    appointment: "bi-calendar-check",
    record: "bi-file-medical",
    vaccination: "bi-shield-check",
    consultation: "bi-stethoscope",
  };
  return icons[type] || "bi-info-circle";
};

const getActivityColor = (type) => {
  const colors = {
    appointment: "primary",
    record: "success",
    vaccination: "info",
    consultation: "warning",
  };
  return colors[type] || "secondary";
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Pending: "warning",
    Confirmed: "info",
    Completed: "success",
    Cancelled: "danger",
  };
  return variants[status] || "secondary";
};

const bookAppointment = () => {
  window.location.href = "/patient/appointments";
};

const viewMedicalRecord = () => {
  window.location.href = "/patient/medical-records";
};

const updateProfile = () => {
  alert("Profile update would be implemented here");
};

// Fetch data method
const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Use the auth guard to wait for authentication with proper timing handling
    const { success, error: authErr } = await waitForPatientAccess();

    if (!success) {
      throw new Error(authErr || "Please log in to view the dashboard");
    }

    const appointmentsResult = await appointments.getMyAppointments();

    appointmentsData.value = appointmentsResult || [];

    const patientResult = await patients.getMyPatients();

    patientData.value =
      patientResult && patientResult.length > 0 ? patientResult[0] : null;

    if (patientData.value?.PatientID) {
      const recordsResult = await medicalRecords.getMedicalRecordsByPatient(
        patientData.value.PatientID,
      );

      medicalRecordsData.value = recordsResult || [];
    } else {
      medicalRecordsData.value = [];
    }

    computeStats();
  } catch (err) {
    console.error("❌ [Dashboard] Error fetching dashboard data:", err);
    error.value =
      err.message || "Failed to load dashboard data. Please try again.";
  } finally {
    loading.value = false;
  }
};

// Compute stats from fetched data
const computeStats = () => {
  const now = new Date();

  // Total appointments
  stats.value.totalAppointments = appointmentsData.value.length;

  // Upcoming appointments (future dates)
  stats.value.upcomingAppointments = appointmentsData.value.filter((apt) => {
    const aptDate = new Date(apt.DateTime);
    return aptDate > now;
  }).length;

  // Completed appointments (past dates with completed status)
  stats.value.completedAppointments = appointmentsData.value.filter((apt) => {
    const aptDate = new Date(apt.DateTime);
    return aptDate < now && apt.Status === "Completed";
  }).length;

  // Total medical records
  stats.value.totalRecords = medicalRecordsData.value.length;
};

// Lifecycle hooks
onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  // No cleanup needed
});
</script>

<template>
  <div class="patient-dashboard">
    <!-- Main Dashboard Content -->
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">My Dashboard</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Welcome to your health overview.
        </p>
      </div>
    </div>

    <!-- Welcome Message -->
    <div class="alert alert-primary animate-fade-in-up">
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-info-circle text-primary fs-4"></i>
        </div>
        <div class="grow">
          <h6 class="alert-heading mb-1">
            Welcome to Baan KM-3 Health Center Information System
          </h6>
          <p class="mb-0">
            You can view your appointments, medical records, and manage your
            health information here.
          </p>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="row g-4 mb-5">
      <!-- Total Appointments -->
      <div class="col-xl-3 col-lg-6 col-md-6">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-3">
              <i
                class="bi bi-calendar-check text-primary fs-1 animate-float"
              ></i>
            </div>
            <h3 class="card-title text-primary mb-2">
              {{ stats.totalAppointments }}
            </h3>
            <p class="card-text text-muted mb-0">Total Appointments</p>
            <small class="text-success">
              <i class="bi bi-graph-up"></i>
              {{ stats.completedAppointments }} completed
            </small>
          </div>
        </div>
      </div>

      <!-- Upcoming Appointments -->
      <div class="col-xl-3 col-lg-6 col-md-6">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-3">
              <i
                class="bi bi-calendar-event text-warning fs-1 animate-float"
              ></i>
            </div>
            <h3 class="card-title text-warning mb-2">
              {{ stats.upcomingAppointments }}
            </h3>
            <p class="card-text text-muted mb-0">Upcoming Appointments</p>
            <small class="text-info">
              <i class="bi bi-clock"></i>
              {{
                stats.upcomingAppointments > 0
                  ? `${stats.upcomingAppointments} scheduled`
                  : "No upcoming appointments"
              }}
            </small>
          </div>
        </div>
      </div>

      <!-- Completed Appointments -->
      <div class="col-xl-3 col-lg-6 col-md-6">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-3">
              <i
                class="bi bi-check-circle-fill text-success fs-1 animate-float"
              ></i>
            </div>
            <h3 class="card-title text-success mb-2">
              {{ stats.completedAppointments }}
            </h3>
            <p class="card-text text-muted mb-0">Completed Visits</p>
            <small class="text-muted">{{
              stats.completedAppointments > 0
                ? `${stats.completedAppointments} visits completed`
                : "No completed visits"
            }}</small>
          </div>
        </div>
      </div>

      <!-- Medical Records -->
      <div class="col-xl-3 col-lg-6 col-md-6">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-3">
              <i class="bi bi-file-medical text-info fs-1 animate-float"></i>
            </div>
            <h3 class="card-title text-info mb-2">{{ stats.totalRecords }}</h3>
            <p class="card-text text-muted mb-0">Medical Records</p>
            <small class="text-muted">{{
              stats.totalRecords > 0
                ? `${stats.totalRecords} records available`
                : "No records available"
            }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Row -->
    <div class="row">
      <!-- Upcoming Appointments -->
      <div class="col-lg-8">
        <div class="card animate-fade-in-left">
          <div
            class="card-header d-flex justify-content-between align-items-center"
          >
            <h5 class="mb-0">
              <i class="bi bi-calendar-event me-2"></i>
              My Upcoming Appointments
            </h5>
            <router-link
              to="/patient/appointments"
              class="btn btn-sm btn-outline-primary"
            >
              View All
            </router-link>
          </div>
          <div class="card-body p-0">
            <div class="appointments-list">
              <!-- Loading State -->
              <div v-if="loading" class="text-center py-5">
                <div
                  class="spinner-border text-primary animate-pulse"
                  role="status"
                >
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading appointments...</p>
              </div>

              <!-- Appointments List -->
              <div v-else-if="appointmentsData.length > 0">
                <div
                  v-for="appointment in appointmentsData.slice(0, 3)"
                  :key="appointment.AppointmentID"
                  class="appointment-item p-3 border-bottom animate-fade-in-up"
                >
                  <div class="d-flex align-items-start">
                    <div class="appointment-icon me-3">
                      <i class="bi bi-calendar-check text-primary"></i>
                    </div>
                    <div class="grow">
                      <div
                        class="d-flex justify-content-between align-items-start"
                      >
                        <div>
                          <h6 class="mb-1">
                            {{ appointment.Type || "Appointment" }}
                          </h6>
                          <p class="mb-1 text-muted small">
                            {{ appointment.Reason || "No reason specified" }}
                          </p>
                          <p class="mb-0 text-primary fw-bold">
                            {{ formatAppointmentDate(appointment.DateTime) }}
                          </p>
                        </div>
                        <div class="text-end">
                          <span
                            class="badge"
                            :class="`bg-${getStatusBadgeVariant(
                              appointment.Status,
                            )}`"
                          >
                            {{ appointment.Status || "Pending" }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No appointments message -->
              <div v-else class="text-center py-4 animate-fade-in-up">
                <i class="bi bi-calendar-plus text-muted fs-4 mb-2"></i>
                <p class="text-muted mb-3">No upcoming appointments</p>
                <button class="btn btn-primary" @click="bookAppointment">
                  <i class="bi bi-calendar-plus me-2"></i>
                  Book New Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions & Health Summary -->
      <div class="col-lg-4">
        <!-- Quick Actions -->
        <div class="card animate-fade-in-right">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-lightning-charge me-2"></i>
              Quick Actions
            </h5>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <button class="btn btn-primary" @click="bookAppointment">
                <i class="bi bi-calendar-plus me-2"></i>
                Book Appointment
              </button>
              <router-link
                to="/patient/appointments"
                class="btn btn-outline-primary"
              >
                <i class="bi bi-calendar-event me-2"></i>
                My Appointments
              </router-link>
              <router-link
                to="/patient/medical-records"
                class="btn btn-outline-info"
              >
                <i class="bi bi-file-medical me-2"></i>
                My Medical Records
              </router-link>
              <button class="btn btn-outline-success" @click="updateProfile">
                <i class="bi bi-person-gear me-2"></i>
                Update Profile
              </button>
            </div>
          </div>
        </div>

        <!-- Health Summary -->
        <div class="card mt-4 animate-fade-in-right animation-delay-200">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-clipboard-pulse me-2"></i>
              Health Summary
            </h5>
          </div>
          <div class="card-body">
            <div
              class="health-item d-flex justify-content-between align-items-center py-2"
            >
              <span>Blood Type</span>
              <span class="badge bg-primary">{{
                patientData?.BloodType || "Not specified"
              }}</span>
            </div>
            <div
              class="health-item d-flex justify-content-between align-items-center py-2 border-top"
            >
              <span>Allergies</span>
              <span class="badge bg-success">{{
                patientData?.Allergies || "None"
              }}</span>
            </div>
            <div
              class="health-item d-flex justify-content-between align-items-center py-2 border-top"
            >
              <span>Current Medications</span>
              <span class="badge bg-info">{{
                patientData?.CurrentMedications || "0 Active"
              }}</span>
            </div>
            <div
              class="health-item d-flex justify-content-between align-items-center py-2 border-top"
            >
              <span>Last Check-up</span>
              <span class="text-muted">{{
                patientData?.LastCheckup
                  ? formatDate(patientData.LastCheckup)
                  : "N/A"
              }}</span>
            </div>
            <div class="text-center mt-3">
              <button
                class="btn btn-outline-primary btn-sm"
                @click="viewMedicalRecord"
              >
                <i class="bi bi-eye me-1"></i>
                View Full Records
              </button>
            </div>
          </div>
        </div>

        <!-- Reminders -->
        <div class="card mt-4 animate-fade-in-right animation-delay-300">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-bell me-2"></i>
              Health Reminders
            </h5>
          </div>
          <div class="card-body">
            <div class="text-center py-3">
              <i class="bi bi-check-circle text-success fs-4 mb-2"></i>
              <p class="text-muted mb-0">No pending reminders</p>
              <small class="text-muted">You're all caught up!</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="card mt-4 animate-fade-in-up animation-delay-400">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-activity me-2"></i>
          Recent Health Activities
        </h5>
      </div>
      <div class="card-body p-0">
        <div class="activity-list">
          <!-- No activities message -->
          <div class="text-center py-4">
            <i class="bi bi-activity text-muted fs-4 mb-2"></i>
            <p class="text-muted mb-0">No recent activities</p>
            <small class="text-muted"
              >Activities will appear here as they occur</small
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stats-icon {
  position: relative;
}

.appointment-item {
  transition: background-color 0.2s ease;
}

.appointment-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.appointment-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.appointment-details {
  margin-top: 0.5rem;
}

.appointment-actions .btn {
  font-size: 0.8rem;
}

.health-item {
  padding: 0.5rem 0;
}

.health-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.reminder-item {
  transition: background-color 0.2s ease;
}

.reminder-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.reminder-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-item {
  transition: background-color 0.2s ease;
}

.activity-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

/* Mobile-first responsive design */
@media (max-width: 767px) {
  .patient-dashboard {
    padding: 0;
  }

  /* Header adjustments */
  .d-flex.justify-content-between.align-items-center.mb-4 {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }

  h1 {
    font-size: 1.75rem;
    margin-bottom: var(--space-xs);
  }

  .text-muted {
    font-size: 0.875rem;
  }

  /* Welcome message */
  .alert.alert-primary {
    border-radius: 12px;
    margin-bottom: var(--space-lg);
  }

  .alert-icon {
    margin-right: var(--space-md);
  }

  .alert-heading {
    font-size: 1.1rem;
  }

  /* Stats cards - stack vertically on mobile */
  .row.g-4.mb-5 {
    --bs-gutter-x: 0;
    margin-left: 0;
    margin-right: 0;
  }

  .col-xl-3 {
    padding: 0 var(--space-xs) var(--space-md);
  }

  .stats-card {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: var(--space-md);
  }

  .stats-card .card-body {
    padding: var(--space-lg) var(--space-md);
    text-align: center;
  }

  .card-title {
    font-size: 2rem;
    margin-bottom: var(--space-xs);
  }

  .card-text {
    font-size: 0.875rem;
  }

  .stats-icon {
    margin-bottom: var(--space-md);
  }

  .animate-float {
    animation-duration: 3s; /* Reduce animation on mobile for performance */
  }

  /* Main content adjustments */
  .row .col-lg-8 {
    padding: 0;
    margin-bottom: var(--space-lg);
  }

  .row .col-lg-4 {
    padding: 0;
  }

  .card {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    padding: var(--space-md);
    border-radius: 12px 12px 0 0;
  }

  .card-body {
    padding: var(--space-md);
  }

  /* Appointments list */
  .appointments-list {
    padding: 0;
  }

  .appointment-item {
    padding: var(--space-md);
    border-radius: 8px;
    margin-bottom: var(--space-sm);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .appointment-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .appointment-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .appointment-details h6 {
    font-size: 1rem;
    margin-bottom: var(--space-xs);
  }

  .badge {
    font-size: 0.75rem;
  }

  /* Quick actions */
  .d-grid.gap-2 {
    gap: var(--space-sm) !important;
  }

  .btn {
    font-size: 0.9rem;
    padding: var(--space-md);
    border-radius: 8px;
    width: 100%;
    margin-bottom: var(--space-sm);
  }

  /* Health summary */
  .health-item {
    padding: var(--space-sm) 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .health-item:last-child {
    border-bottom: none;
  }

  /* Reminders */
  .text-center.py-3 {
    padding: var(--space-lg) 0;
  }

  /* Recent activities */
  .activity-list {
    padding: 0;
  }

  .text-center.py-4 {
    padding: var(--space-xl) 0;
  }

  /* Loading states */
  .text-center.py-5 {
    padding: var(--space-xl) 0;
  }

  .spinner-border {
    width: 2rem;
    height: 2rem;
  }

  /* Touch-friendly interactions */
  .card:hover,
  .appointment-item:hover,
  .reminder-item:hover,
  .activity-item:hover {
    transform: none; /* Disable hover effects on mobile */
  }
}

/* Small tablets (768px to 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .col-xl-3 {
    margin-bottom: var(--space-md);
  }

  .stats-card .card-body {
    padding: var(--space-xl);
  }

  .card-title {
    font-size: 2.5rem;
  }

  .appointment-item {
    padding: var(--space-lg);
  }

  .btn {
    font-size: 1rem;
    padding: var(--space-lg);
  }
}
</style>
