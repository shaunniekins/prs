<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase";
import { useAuthStore } from "../../stores/auth";
import { useAuthGuard } from "../../composables/useAuthGuard";

// Auth store for checking authentication state
const authStore = useAuthStore();
const { waitForNurseAccess } = useAuthGuard();

// Reactive data
const loading = ref(false);
const error = ref(null);

const stats = ref({
  todayAppointments: 0,
  pendingAppointments: 0,
  completedToday: 0,
  totalPatients: 0,
  recentActivities: [],
});

const todaySchedule = ref([]);
const pendingTasks = ref([]);

// Supabase operations
const {
  appointments,
  patients,
  notifications,
  medicalRecords,
  consultationNotes,
  users,
} = useSupabase();

// Fetch dashboard data
const fetchDashboardData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Use the auth guard to wait for authentication with proper timing handling
    const { success, error: authErr } = await waitForNurseAccess();

    if (!success) {
      throw new Error(authErr || "Please log in to view the dashboard");
    }

    // Fetch appointments for today
    const appointmentsData = await appointments.getMyStaffAppointments();
    const today = new Date().toDateString();

    // Filter today's appointments
    const todayAppointments = appointmentsData.filter(
      (apt) => new Date(apt.DateTime).toDateString() === today,
    );

    // Count stats
    const pendingCount = appointmentsData.filter(
      (apt) => apt.Status === "Pending",
    ).length;
    const completedTodayCount = todayAppointments.filter(
      (apt) => apt.Status === "Completed",
    ).length;

    // Fetch patients count
    const patientsData = await patients.getAllPatients();
    const totalPatientsCount = patientsData.length;

    // Fetch pending appointment requests
    const pendingRequests = await users.getPendingAppointmentRequests();

    // Fetch recent notifications for activities
    const notificationsData = await notifications.getAllNotifications();
    const recentNotifications = notificationsData.slice(0, 5).map((notif) => ({
      id: notif.NotificationID,
      type: notif.Type || "notification",
      message: notif.Message,
      time: new Date(notif.CreatedAt).toLocaleString(),
      priority: notif.Priority === "high" ? "high" : "normal",
    }));

    // Update reactive data
    stats.value = {
      todayAppointments: todayAppointments.length,
      pendingAppointments: pendingCount,
      completedToday: completedTodayCount,
      totalPatients: totalPatientsCount,
      recentActivities: recentNotifications,
    };

    todaySchedule.value = todayAppointments;

    // Update pending tasks
    pendingTasks.value = [
      {
        id: 1,
        type: "appointments",
        title: "Appointment Requests",
        count: pendingRequests.length,
        message: `${pendingRequests.length} pending approvals`,
        icon: "bi-calendar-x text-warning",
        route: "/nurse/appointment-requests",
      },
      {
        id: 2,
        type: "records",
        title: "Incomplete Records",
        count: 0, // Could be calculated from medical records
        message: "Check for incomplete records",
        icon: "bi-file-earmark-x text-danger",
        route: "/nurse/medical-records",
      },
      {
        id: 3,
        type: "followups",
        title: "Follow-up Reminders",
        count: 0, // Could be calculated from appointments
        message: "Patients due for follow-up",
        icon: "bi-bell text-info",
        route: "/nurse/patient-management",
      },
    ];
  } catch (err) {
    error.value = err.message || "Failed to load dashboard data";
    console.error("Error fetching dashboard data:", err);
  } finally {
    loading.value = false;
  }
};

// Initialize data on component mount
onMounted(async () => {
  await fetchDashboardData();
});

// Helper methods for appointments
const getMorningAppointments = () => {
  return todaySchedule.value.filter((appointment) => {
    const hour = new Date(appointment.DateTime).getHours();
    return hour >= 8 && hour < 12;
  });
};

const getAfternoonAppointments = () => {
  return todaySchedule.value.filter((appointment) => {
    const hour = new Date(appointment.DateTime).getHours();
    return hour >= 12 && hour < 17;
  });
};

const formatAppointmentTime = (dateTimeString) => {
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getAppointmentBadgeClass = (type) => {
  const badgeClasses = {
    Consultation: "bg-primary",
    "Follow-up": "bg-info",
    Vaccination: "bg-success",
    Emergency: "bg-danger",
    "Check-up": "bg-warning",
  };
  return badgeClasses[type] || "bg-secondary";
};

const getAppointmentDuration = (appointment) => {
  // Default duration based on type, or show status if not standard
  if (appointment.Status === "Pending") return "Pending";
  if (appointment.Status === "Confirmed") return "Confirmed";

  const durations = {
    Consultation: "30 min",
    "Follow-up": "20 min",
    Vaccination: "15 min",
    Emergency: "45 min",
    "Check-up": "25 min",
  };
  return durations[appointment.Type] || "30 min";
};

const getAppointmentActionButtonClass = (status) => {
  const buttonClasses = {
    Confirmed: "btn-success",
    Scheduled: "btn-outline-success",
    Pending: "btn-outline-warning",
    Completed: "btn-secondary",
    Cancelled: "btn-danger",
  };
  return buttonClasses[status] || "btn-outline-primary";
};

const getAppointmentActionText = (status) => {
  const actionTexts = {
    Confirmed: "Start",
    Scheduled: "Confirm",
    Pending: "Review",
    Completed: "View",
    Cancelled: "Reschedule",
  };
  return actionTexts[status] || "View";
};

const handleAppointmentAction = (appointment) => {};

const getActivityIcon = (type) => {
  const icons = {
    appointment: "bi-calendar-check",
    record: "bi-file-medical",
    patient: "bi-person-plus",
    consultation: "bi-stethoscope",
  };
  return icons[type] || "bi-info-circle";
};

const getActivityColor = (type) => {
  const colors = {
    appointment: "primary",
    record: "success",
    patient: "info",
    consultation: "warning",
  };
  return colors[type] || "secondary";
};
</script>

<template>
  <div class="nurse-dashboard">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="animate-spin mb-3">
        <i class="bi bi-arrow-repeat fs-1 text-primary"></i>
      </div>
      <p class="text-muted">Loading dashboard data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
      <button
        @click="fetchDashboardData"
        class="btn btn-sm btn-outline-danger ms-3"
      >
        Retry
      </button>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else>
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="mb-2 animate-fade-in-left">Nurse Dashboard</h1>
          <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
            Welcome back, Nurse! Here's your daily overview.
          </p>
        </div>
        <div class="animate-fade-in-right">
          <button
            class="btn btn-primary"
            @click="fetchDashboardData"
            :disabled="loading"
          >
            <i
              class="bi bi-arrow-clockwise me-2"
              :class="{ 'animate-spin': loading }"
            ></i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="row g-4 mb-5">
        <!-- Today's Appointments -->
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="card stats-card animate-fade-in-up">
            <div class="card-body text-center">
              <div class="stats-icon mb-3">
                <i
                  class="bi bi-calendar-day-fill text-primary fs-1 animate-float"
                ></i>
              </div>
              <h3 class="card-title text-primary mb-2">
                {{ stats.todayAppointments }}
              </h3>
              <p class="card-text text-muted mb-0">Today's Appointments</p>
              <small class="text-info">
                <i class="bi bi-clock"></i>
                Next: 10:30 AM
              </small>
            </div>
          </div>
        </div>

        <!-- Pending Appointments -->
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="card stats-card animate-fade-in-up animation-delay-100">
            <div class="card-body text-center">
              <div class="stats-icon mb-3">
                <i
                  class="bi bi-clock-history text-warning fs-1 animate-float"
                ></i>
              </div>
              <h3 class="card-title text-warning mb-2">
                {{ stats.pendingAppointments }}
              </h3>
              <p class="card-text text-muted mb-0">Pending Approvals</p>
              <small class="text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Requires attention
              </small>
            </div>
          </div>
        </div>

        <!-- Completed Today -->
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="card stats-card animate-fade-in-up animation-delay-200">
            <div class="card-body text-center">
              <div class="stats-icon mb-3">
                <i
                  class="bi bi-check-circle-fill text-success fs-1 animate-float"
                ></i>
              </div>
              <h3 class="card-title text-success mb-2">
                {{ stats.completedToday }}
              </h3>
              <p class="card-text text-muted mb-0">Completed Today</p>
              <small class="text-success">
                <i class="bi bi-graph-up"></i>
                Great job!
              </small>
            </div>
          </div>
        </div>

        <!-- Total Patients -->
        <div class="col-xl-3 col-lg-6 col-md-6">
          <div class="card stats-card animate-fade-in-up animation-delay-300">
            <div class="card-body text-center">
              <div class="stats-icon mb-3">
                <i class="bi bi-people-fill text-info fs-1 animate-float"></i>
              </div>
              <h3 class="card-title text-info mb-2">
                {{ stats.totalPatients }}
              </h3>
              <p class="card-text text-muted mb-0">Total Patients</p>
              <small class="text-muted"> Under your care </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Row -->
      <div class="row">
        <!-- Today's Schedule -->
        <div class="col-lg-8">
          <div class="card animate-fade-in-left">
            <div
              class="card-header d-flex justify-content-between align-items-center"
            >
              <h5 class="mb-0">
                <i class="bi bi-calendar-event me-2"></i>
                Today's Schedule
              </h5>
              <router-link
                to="/nurse/appointment-requests"
                class="btn btn-sm btn-outline-primary"
              >
                View All
              </router-link>
            </div>
            <div class="card-body p-0">
              <div class="schedule-list">
                <!-- Morning Schedule -->
                <div class="schedule-section mb-4">
                  <h6 class="schedule-time text-primary mb-3">
                    <i class="bi bi-sunrise me-2"></i>
                    Morning (8:00 AM - 12:00 PM)
                  </h6>
                  <div
                    v-for="(appointment, index) in getMorningAppointments()"
                    :key="appointment.AppointmentID"
                    class="schedule-item p-3 border rounded mb-2 animate-fade-in-up"
                    :class="`animation-delay-${index * 100}`"
                  >
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{{
                          formatAppointmentTime(appointment.DateTime)
                        }}</strong>
                        -
                        {{
                          appointment.Patients?.Users?.fullName ||
                          "Unknown Patient"
                        }}
                        <span
                          class="badge ms-2"
                          :class="getAppointmentBadgeClass(appointment.Type)"
                        >
                          {{ appointment.Type }}
                        </span>
                      </div>
                      <div class="text-end">
                        <small class="text-muted">{{
                          getAppointmentDuration(appointment)
                        }}</small
                        ><br />
                        <button
                          class="btn btn-sm"
                          :class="
                            getAppointmentActionButtonClass(appointment.Status)
                          "
                          @click="handleAppointmentAction(appointment)"
                        >
                          {{ getAppointmentActionText(appointment.Status) }}
                        </button>
                      </div>
                    </div>
                    <p class="mb-0 mt-2 text-muted">
                      {{
                        appointment.Notes || `${appointment.Type} appointment`
                      }}
                    </p>
                  </div>

                  <div
                    v-if="getMorningAppointments().length === 0"
                    class="text-center text-muted py-3"
                  >
                    <i class="bi bi-calendar-x me-2"></i>
                    No morning appointments
                  </div>
                </div>

                <!-- Afternoon Schedule -->
                <div class="schedule-section">
                  <h6 class="schedule-time text-primary mb-3">
                    <i class="bi bi-sunset me-2"></i>
                    Afternoon (1:00 PM - 5:00 PM)
                  </h6>
                  <div
                    v-for="(appointment, index) in getAfternoonAppointments()"
                    :key="appointment.AppointmentID"
                    class="schedule-item p-3 border rounded mb-2 animate-fade-in-up"
                    :class="`animation-delay-${(index + 10) * 100}`"
                  >
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{{
                          formatAppointmentTime(appointment.DateTime)
                        }}</strong>
                        - {{ appointment.Patients.Users.fullName }}
                        <span
                          class="badge ms-2"
                          :class="getAppointmentBadgeClass(appointment.Type)"
                        >
                          {{ appointment.Type }}
                        </span>
                      </div>
                      <div class="text-end">
                        <small class="text-muted">{{
                          getAppointmentDuration(appointment)
                        }}</small
                        ><br />
                        <button
                          class="btn btn-sm"
                          :class="
                            getAppointmentActionButtonClass(appointment.Status)
                          "
                          @click="handleAppointmentAction(appointment)"
                        >
                          {{ getAppointmentActionText(appointment.Status) }}
                        </button>
                      </div>
                    </div>
                    <p class="mb-0 mt-2 text-muted">
                      {{
                        appointment.Notes || `${appointment.Type} appointment`
                      }}
                    </p>
                  </div>

                  <div
                    v-if="getAfternoonAppointments().length === 0"
                    class="text-center text-muted py-3"
                  >
                    <i class="bi bi-calendar-x me-2"></i>
                    No afternoon appointments
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Quick Actions & Recent Activities -->
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
              <router-link
                to="/nurse/patient-management"
                class="btn btn-primary"
              >
                <i class="bi bi-person-plus me-2"></i>
                Register Patient
              </router-link>
              <router-link
                to="/nurse/appointment-requests"
                class="btn btn-outline-primary"
              >
                <i class="bi bi-calendar-plus me-2"></i>
                Manage Appointments
              </router-link>
              <router-link
                to="/nurse/medical-records"
                class="btn btn-outline-info"
              >
                <i class="bi bi-file-medical me-2"></i>
                Update Records
              </router-link>
              <router-link
                to="/nurse/consultation-notes"
                class="btn btn-outline-success"
              >
                <i class="bi bi-journal-text me-2"></i>
                Add Consultation Notes
              </router-link>
            </div>
          </div>
        </div>

        <!-- Pending Tasks -->
        <div class="card mt-4 animate-fade-in-right animation-delay-200">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Pending Tasks
            </h5>
          </div>
          <div class="card-body">
            <div
              v-for="task in pendingTasks"
              :key="task.id"
              class="task-item d-flex align-items-center p-2 mb-2 border rounded"
            >
              <div class="task-icon me-3">
                <i :class="task.icon"></i>
              </div>
              <div class="grow">
                <div class="fw-medium">{{ task.title }}</div>
                <small class="text-muted">{{ task.message }}</small>
              </div>
              <router-link
                :to="task.route"
                class="btn btn-sm"
                :class="{
                  'btn-outline-warning': task.type === 'appointments',
                  'btn-outline-danger': task.type === 'records',
                  'btn-outline-info': task.type === 'followups',
                }"
              >
                {{
                  task.type === "appointments"
                    ? "Review"
                    : task.type === "records"
                      ? "Update"
                      : "View"
                }}
              </router-link>
            </div>

            <div
              v-if="pendingTasks.length === 0"
              class="text-center text-muted py-3"
            >
              <i class="bi bi-check-circle me-2"></i>
              No pending tasks
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
          Recent Activities
        </h5>
      </div>
      <div class="card-body p-0">
        <div class="activity-list">
          <div
            v-for="activity in stats.recentActivities"
            :key="activity.id"
            class="activity-item d-flex align-items-start p-3 border-bottom animate-fade-in-up"
            :class="`animation-delay-${activity.id * 100}`"
          >
            <div class="activity-icon me-3">
              <i
                :class="`${getActivityIcon(
                  activity.type,
                )} text-${getActivityColor(activity.type)}`"
              ></i>
            </div>
            <div class="activity-content grow">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <p class="mb-1">{{ activity.message }}</p>
                  <small class="text-muted">
                    <i class="bi bi-clock me-1"></i>
                    {{ activity.time }}
                  </small>
                </div>
                <span
                  v-if="activity.priority === 'high'"
                  class="badge bg-danger"
                  >High Priority</span
                >
              </div>
            </div>
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

.schedule-time {
  border-bottom: 2px solid var(--primary-gradient-start);
  padding-bottom: 0.5rem;
}

.schedule-item {
  background-color: var(--light-color);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.schedule-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task-item {
  transition: background-color 0.2s ease;
}

.task-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.task-icon {
  width: 40px;
  height: 40px;
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
  .nurse-dashboard {
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

  /* Schedule section */
  .schedule-section {
    margin-bottom: var(--space-lg);
  }

  .schedule-time {
    font-size: 1rem;
    margin-bottom: var(--space-md);
  }

  .schedule-item {
    padding: var(--space-md);
    border-radius: 8px;
    margin-bottom: var(--space-sm);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .schedule-item strong {
    font-size: 0.95rem;
  }

  .badge {
    font-size: 0.75rem;
  }

  .btn-sm {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
  }

  /* Quick actions */
  .d-grid.gap-2 {
    gap: var(--space-sm) !important;
  }

  .btn {
    font-size: 0.9rem;
    padding: var(--space-md);
    border-radius: 8px;
  }

  /* Pending tasks */
  .task-item {
    padding: var(--space-md);
    border-radius: 8px;
    margin-bottom: var(--space-sm);
  }

  .task-icon {
    width: 36px;
    height: 36px;
  }

  .fw-medium {
    font-size: 0.9rem;
  }

  /* Recent activities */
  .activity-item {
    padding: var(--space-md);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .activity-icon {
    width: 36px;
    height: 36px;
  }

  /* Loading states */
  .text-center.py-5 {
    padding: var(--space-xl) 0;
  }

  .animate-spin {
    font-size: 1.5rem;
  }

  /* Touch-friendly interactions */
  .card:hover,
  .schedule-item:hover,
  .task-item:hover,
  .activity-item:hover {
    transform: none; /* Disable hover effects on mobile */
  }

  /* Button adjustments */
  .btn-primary {
    width: 100%;
    margin-bottom: var(--space-sm);
  }

  /* Router links as buttons */
  .btn-outline-primary,
  .btn-outline-info,
  .btn-outline-success {
    width: 100%;
    margin-bottom: var(--space-sm);
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

  .schedule-item {
    padding: var(--space-lg);
  }

  .btn {
    font-size: 1rem;
    padding: var(--space-lg);
  }
}
</style>
