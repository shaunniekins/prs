<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import useSupabase from "@/composables/useSupabase";
import { useAuthStore } from "../../stores/auth";

// Initialize Supabase composable
const {
  patients: patientOps,
  appointments: appointmentOps,
  staff: staffOps,
  medicalRecords: medicalRecordOps,
  reports: reportOps,
  supabase,
  loading: supabaseLoading,
  error: supabaseError,
  requireRole,
} = useSupabase();

// Reactive data
const errorMessage = ref("");
const loading = ref(false);
const stats = ref({
  totalPatients: 0,
  totalStaff: 0,
  todayAppointments: 0,
  pendingAppointments: 0,
  totalRecords: 0,
  recentActivities: [],
});

// Authentication state
const user = ref(null);
const isAuthenticated = ref(false);
const userRole = ref("");
const authLoading = ref(true);

// Initialize auth state
const initializeAuth = async () => {
  try {
    // Initialize authentication first
    const authStore = useAuthStore();
    await authStore.initializeAuth();

    // Check if user is authenticated and has admin role
    if (!authStore.isAuthenticated || authStore.userRole !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    // Get current user info from auth store
    user.value = authStore.user;
    isAuthenticated.value = authStore.isAuthenticated;
    userRole.value = authStore.userRole;
  } catch (error) {
    errorMessage.value = "Access denied. Admin privileges required.";
  } finally {
    authLoading.value = false;
  }
};

// Methods
const fetchDashboardData = async () => {
  if (!isAuthenticated.value || userRole.value !== "admin") {
    errorMessage.value = "Access denied. Admin privileges required.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    // Fetch overview statistics
    const overviewStats = await reportOps.getOverviewStats();

    // Fetch today's appointments
    const today = new Date().toISOString().split("T")[0];
    const { data: todayAppts, error: todayError } = await supabase
      .from("Appointment")
      .select("*", { count: "exact" })
      .gte("DateTime", `${today}T00:00:00`)
      .lt("DateTime", `${today}T23:59:59`);

    if (todayError) throw todayError;

    // Fetch pending appointments
    const { data: pendingAppts, error: pendingError } = await supabase
      .from("Appointment")
      .select("*", { count: "exact" })
      .eq("Status", "Pending");

    if (pendingError) throw pendingError;

    // Fetch recent activities (notifications or recent records)
    const { data: recentNotifications, error: notificationsError } =
      await supabase
        .from("Notification")
        .select("*")
        .order("CreatedAt", { ascending: false })
        .limit(5);

    if (notificationsError) throw notificationsError;

    // Transform recent activities
    const recentActivities = recentNotifications.map((notification) => ({
      id: notification.NotificationID,
      type: getActivityType(notification.Type),
      message: notification.Title,
      time: new Date(notification.CreatedAt).toLocaleString(),
    }));

    // Update stats
    const newStats = {
      totalPatients: overviewStats.totalPatients || 0,
      totalStaff: overviewStats.totalStaff || 0,
      todayAppointments: todayAppts?.length || 0,
      pendingAppointments: pendingAppts?.length || 0,
      totalRecords: overviewStats.totalRecords || 0,
      recentActivities,
    };

    stats.value = newStats;
  } catch (error) {
    // Provide more specific error handling
    if (error.message?.includes("Failed to fetch overview statistics")) {
      errorMessage.value =
        "Unable to load dashboard statistics. Please check your database connection.";
    } else if (
      error.message?.includes("network") ||
      error.message?.includes("fetch")
    ) {
      errorMessage.value =
        "Network error. Please check your internet connection and try again.";
    } else if (
      error.message?.includes("permission") ||
      error.message?.includes("unauthorized")
    ) {
      errorMessage.value =
        "Access denied. You don't have permission to view this data.";
    } else {
      errorMessage.value =
        error.message || "Failed to load dashboard data. Please try again.";
    }
  } finally {
    loading.value = false;
  }
};

// Helper function to map notification types to activity types
const getActivityType = (notificationType) => {
  const typeMap = {
    appointment_reminder: "appointment",
    system_alert: "record",
    patient_registration: "patient",
    staff_update: "staff",
  };
  return typeMap[notificationType] || "info";
};

const getActivityIcon = (type) => {
  const icons = {
    appointment: "bi-calendar-check",
    record: "bi-file-medical",
    patient: "bi-person-plus",
    staff: "bi-person-badge-plus",
  };
  return icons[type] || "bi-info-circle";
};

const getActivityColor = (type) => {
  const colors = {
    appointment: "primary",
    record: "success",
    patient: "info",
    staff: "warning",
  };
  return colors[type] || "secondary";
};

// Initialize component
onMounted(async () => {
  await initializeAuth();

  if (isAuthenticated.value && userRole.value === "admin") {
    await fetchDashboardData();
  } else {
  }
});
</script>

<template>
  <div class="admin-dashboard">
    <div class="container-fluid py-4">
      <!-- Header -->
      <div class="row mb-4">
        <div class="col-12">
          <h1 class="h3 mb-0">Admin Dashboard</h1>
          <p class="text-muted">
            Welcome back, {{ user?.fullName || "Admin" }}
          </p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ errorMessage }}
      </div>

      <!-- Loading State -->
      <div v-if="authLoading || loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">
          {{ authLoading ? "Initializing..." : "Loading dashboard data..." }}
        </p>
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="isAuthenticated && userRole === 'admin'">
        <!-- Statistics Cards -->
        <div class="row mb-4">
          <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div
                      class="text-xs font-weight-bold text-primary text-uppercase mb-1"
                    >
                      Total Patients
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ stats.totalPatients }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="bi bi-people-fill fa-2x text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-success shadow h-100 py-2">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div
                      class="text-xs font-weight-bold text-success text-uppercase mb-1"
                    >
                      Total Staff
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ stats.totalStaff }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="bi bi-person-badge-fill fa-2x text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-info shadow h-100 py-2">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div
                      class="text-xs font-weight-bold text-info text-uppercase mb-1"
                    >
                      Today's Appointments
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ stats.todayAppointments }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="bi bi-calendar-check-fill fa-2x text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-left-warning shadow h-100 py-2">
              <div class="card-body">
                <div class="row no-gutters align-items-center">
                  <div class="col mr-2">
                    <div
                      class="text-xs font-weight-bold text-warning text-uppercase mb-1"
                    >
                      Pending Appointments
                    </div>
                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                      {{ stats.pendingAppointments }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <i class="bi bi-clock-fill fa-2x text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Row -->
        <div class="row">
          <!-- Recent Activities -->
          <div class="col-xl-8 col-lg-7">
            <div class="card shadow mb-4">
              <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold text-primary">
                  Recent Activities
                </h6>
              </div>
              <div class="card-body">
                <div
                  v-if="stats.recentActivities.length === 0"
                  class="text-center py-4"
                >
                  <i class="bi bi-info-circle text-muted fa-3x mb-3"></i>
                  <p class="text-muted">No recent activities to display</p>
                </div>
                <div v-else class="timeline">
                  <div
                    v-for="activity in stats.recentActivities"
                    :key="activity.id"
                    class="timeline-item"
                  >
                    <div class="timeline-marker">
                      <i
                        :class="`bi ${getActivityIcon(
                          activity.type
                        )} text-${getActivityColor(activity.type)}`"
                      ></i>
                    </div>
                    <div class="timeline-content">
                      <h6 class="timeline-title">{{ activity.message }}</h6>
                      <p class="timeline-meta">{{ activity.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="col-xl-4 col-lg-5">
            <div class="card shadow mb-4">
              <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold text-primary">Quick Stats</h6>
              </div>
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="text-primary mr-3">
                    <i class="bi bi-file-medical fa-2x"></i>
                  </div>
                  <div>
                    <div class="font-weight-bold">Total Medical Records</div>
                    <div class="text-muted">{{ stats.totalRecords }}</div>
                  </div>
                </div>
                <hr />
                <div class="d-flex align-items-center">
                  <div class="text-success mr-3">
                    <i class="bi bi-check-circle fa-2x"></i>
                  </div>
                  <div>
                    <div class="font-weight-bold">System Status</div>
                    <div class="text-success">All Systems Operational</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background-color: #f8f9fc;
}

.card {
  border: none;
  border-radius: 0.35rem;
}

.border-left-primary {
  border-left: 0.25rem solid #4e73df !important;
}

.border-left-success {
  border-left: 0.25rem solid #1cc88a !important;
}

.border-left-info {
  border-left: 0.25rem solid #36b9cc !important;
}

.border-left-warning {
  border-left: 0.25rem solid #f6c23e !important;
}

.text-primary {
  color: #5a5c69 !important;
}

.text-gray-800 {
  color: #5a5c69 !important;
}

.font-weight-bold {
  font-weight: 700 !important;
}

.text-xs {
  font-size: 0.7rem;
}

.text-uppercase {
  text-transform: uppercase !important;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e9ecef;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-marker {
  position: absolute;
  left: -22px;
  top: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-marker i {
  font-size: 8px;
}

.timeline-content {
  background: white;
  padding: 15px;
  border-radius: 0.35rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.timeline-title {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 600;
  color: #5a5c69;
}

.timeline-meta {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.spinner-border {
  width: 3rem;
  height: 3rem;
}

/* Mobile-first responsive design */
@media (max-width: 767px) {
  .admin-dashboard {
    padding: 0;
  }

  .container-fluid {
    padding: 0 var(--space-sm);
  }

  /* Header adjustments */
  .row.mb-4 .col-12 {
    padding: 0;
  }

  h1.h3 {
    font-size: 1.5rem;
    margin-bottom: var(--space-xs);
  }

  .text-muted {
    font-size: 0.875rem;
  }

  /* Stats cards - stack vertically on mobile */
  .row.mb-4 {
    margin-left: 0;
    margin-right: 0;
  }

  .col-xl-3 {
    padding: 0 var(--space-xs) var(--space-md);
  }

  .card.border-left-primary,
  .card.border-left-success,
  .card.border-left-info,
  .card.border-left-warning {
    margin-bottom: var(--space-md);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .card-body {
    padding: var(--space-md);
    text-align: center;
  }

  .text-xs {
    font-size: 0.75rem;
  }

  .h5 {
    font-size: 1.5rem;
    margin-bottom: var(--space-xs);
  }

  .fa-2x {
    font-size: 1.5rem !important;
  }

  /* Main content adjustments */
  .row.mb-4 .col-xl-8,
  .row.mb-4 .col-lg-7 {
    padding: 0;
    margin-bottom: var(--space-lg);
  }

  .row.mb-4 .col-xl-4,
  .row.mb-4 .col-lg-5 {
    padding: 0;
  }

  .card.shadow {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    padding: var(--space-md);
    background: linear-gradient(135deg, #f8f9fc 0%, #e9ecef 100%);
    border-bottom: 1px solid #dee2e6;
  }

  .card-header h6 {
    font-size: 1rem;
    margin: 0;
  }

  .card-body {
    padding: var(--space-md);
  }

  /* Timeline adjustments */
  .timeline {
    padding-left: 20px;
  }

  .timeline-item {
    margin-bottom: var(--space-md);
  }

  .timeline-marker {
    width: 12px;
    height: 12px;
    left: -18px;
  }

  .timeline-marker i {
    font-size: 6px;
  }

  .timeline-content {
    padding: var(--space-sm);
    border-radius: 8px;
  }

  .timeline-title {
    font-size: 0.875rem;
  }

  .timeline-meta {
    font-size: 0.75rem;
  }

  /* Quick stats adjustments */
  .d-flex.align-items-center.mb-3 {
    flex-direction: column;
    text-align: center;
    margin-bottom: var(--space-md);
  }

  .text-primary.mr-3,
  .text-success.mr-3 {
    margin-right: 0;
    margin-bottom: var(--space-xs);
  }

  .font-weight-bold {
    font-size: 0.875rem;
  }

  .text-muted {
    font-size: 0.75rem;
  }

  /* Touch-friendly interactions */
  .card:hover {
    transform: none; /* Disable hover effects on mobile */
  }

  /* Loading and error states */
  .text-center.py-5 {
    padding: var(--space-xl) 0;
  }

  .spinner-border {
    width: 2rem;
    height: 2rem;
  }
}

/* Small tablets (768px to 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .container-fluid {
    padding: 0 var(--space-md);
  }

  .col-xl-3 {
    margin-bottom: var(--space-md);
  }

  .card-body {
    padding: var(--space-lg);
  }

  .h5 {
    font-size: 1.75rem;
  }

  .fa-2x {
    font-size: 2rem !important;
  }
}
</style>
