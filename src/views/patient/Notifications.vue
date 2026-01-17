<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

// Initialize composables
const { notifications: notificationOps } = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const error = ref(null);
const search = ref("");
const filterType = ref("all");
const filterStatus = ref("all");
const notifications = ref([]);

// Computed properties
const filteredNotifications = computed(() => {
  return notifications.value.filter((notification) => {
    const matchesSearch =
      notification.Title.toLowerCase().includes(search.value.toLowerCase()) ||
      notification.Message.toLowerCase().includes(search.value.toLowerCase());

    const matchesType =
      filterType.value === "all" || notification.Type === filterType.value;
    const matchesStatus =
      filterStatus.value === "all" ||
      (filterStatus.value === "unread"
        ? !notification.IsRead
        : notification.IsRead);

    return matchesSearch && matchesType && matchesStatus;
  });
});

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.IsRead).length;
});

const highPriorityCount = computed(() => {
  return notifications.value.filter((n) => n.Priority === "high" && !n.IsRead)
    .length;
});

const actionRequiredCount = computed(() => {
  return notifications.value.filter((n) => n.ActionRequired && !n.IsRead)
    .length;
});

// Methods
const fetchNotifications = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Ensure auth is initialized before fetching data
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error("Please log in to view notifications");
    }

    const result = await notificationOps.getMyNotifications();
    // The function returns data directly, not an object with success property
    notifications.value = result || [];
    console.log(
      `Successfully loaded ${notifications.value.length} notifications`
    );
  } catch (err) {
    console.error("Error fetching notifications:", err);
    error.value =
      err.message || "Failed to load notifications. Please try again.";
    notifications.value = [];
  } finally {
    loading.value = false;
  }
};

const markAsRead = async (notification) => {
  try {
    await notificationOps.markAsRead(notification.NotificationID);
    notification.IsRead = true;
    console.log("Notification marked as read:", notification.NotificationID);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    error.value = err.message || "Failed to mark notification as read";
  }
};

const markAllAsRead = async () => {
  try {
    await notificationOps.markAllAsRead();
    notifications.value.forEach((n) => (n.IsRead = true));
    console.log("All notifications marked as read");
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    error.value = err.message || "Failed to mark all notifications as read";
  }
};

const deleteNotification = async (notification) => {
  try {
    await notificationOps.deleteNotification(notification.NotificationID);
    const index = notifications.value.findIndex(
      (n) => n.NotificationID === notification.NotificationID
    );
    if (index !== -1) {
      notifications.value.splice(index, 1);
      console.log("Notification deleted:", notification.NotificationID);
    }
  } catch (err) {
    console.error("Error deleting notification:", err);
    error.value = err.message || "Failed to delete notification";
  }
};

const performAction = (notification) => {
  if (notification.RelatedAppointmentID) {
    console.log("Viewing appointment:", notification.RelatedAppointmentID);
    // In a real application, this would navigate to the appointment
    alert(
      `View appointment ${notification.RelatedAppointmentID} would be implemented here`
    );
  } else if (notification.RelatedRecordID) {
    console.log("Viewing medical record:", notification.RelatedRecordID);
    // In a real application, this would navigate to the medical record
    alert(
      `View medical record ${notification.RelatedRecordID} would be implemented here`
    );
  } else {
    console.log(
      "Performing general action for notification:",
      notification.NotificationID
    );
    // In a real application, this would perform the appropriate action
    alert(
      `Action "${notification.ActionText || "View"}" would be implemented here`
    );
  }
};

const getStatusBadgeVariant = (isRead) => {
  return isRead ? "success" : "warning";
};

const getPriorityBadgeVariant = (priority) => {
  const variants = {
    low: "secondary",
    normal: "primary",
    high: "danger",
  };
  return variants[priority] || "secondary";
};

const getTypeBadgeVariant = (type) => {
  const variants = {
    appointment_reminder: "info",
    system_alert: "warning",
    medical_record: "success",
    account_update: "primary",
  };
  return variants[type] || "secondary";
};

const getNotificationIcon = (type) => {
  const icons = {
    appointment_reminder: "bi-calendar-event",
    system_alert: "bi-exclamation-triangle",
    medical_record: "bi-file-medical",
    account_update: "bi-person-gear",
  };
  return icons[type] || "bi-bell";
};

const formatDateTime = (dateTime) => {
  return new Date(dateTime).toLocaleString();
};

const formatTimeAgo = (dateTime) => {
  const now = new Date();
  const notificationDate = new Date(dateTime);
  const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }
};

onMounted(async () => {
  try {
    await fetchNotifications();
  } catch (err) {
    console.error("Error initializing notifications:", err);
  }
});
</script>

<template>
  <div class="patient-notifications">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">My Notifications</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Stay updated with your health reminders and appointments
        </p>
      </div>
      <div class="animate-fade-in-right">
        <div class="d-flex gap-2">
          <button
            v-if="unreadCount > 0"
            class="btn btn-outline-primary"
            @click="markAllAsRead"
          >
            <i class="bi bi-check-all me-2"></i>
            Mark All Read
          </button>
          <button
            class="btn btn-primary"
            @click="fetchNotifications"
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
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <!-- Error Alert -->
      <div v-if="error" class="col-12">
        <div class="alert alert-danger animate-fade-in-up">
          <div class="d-flex align-items-center">
            <div class="alert-icon me-3">
              <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="alert-heading mb-1">Error Loading Notifications</h6>
              <p class="mb-0">{{ error }}</p>
            </div>
            <button class="btn btn-danger btn-sm" @click="fetchNotifications">
              <i class="bi bi-arrow-clockwise me-1"></i>
              Retry
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-bell text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ notifications.length }}</h4>
            <small class="text-muted">Total Notifications</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-envelope-exclamation text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ unreadCount }}</h4>
            <small class="text-muted">Unread</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-exclamation-triangle text-danger fs-2"></i>
            </div>
            <h4 class="mb-1">{{ highPriorityCount }}</h4>
            <small class="text-muted">High Priority</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">{{ actionRequiredCount }}</h4>
            <small class="text-muted">Action Required</small>
          </div>
        </div>
      </div>
    </div>

    <!-- High Priority Alert -->
    <div
      v-if="highPriorityCount > 0"
      class="alert alert-danger animate-fade-in-up animation-delay-200"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">
            High Priority Notifications Require Attention
          </h6>
          <p class="mb-0">
            You have {{ highPriorityCount }} high priority notification(s) that
            need immediate attention.
          </p>
        </div>
        <button class="btn btn-danger btn-sm">
          <i class="bi bi-eye me-1"></i>
          View High Priority
        </button>
      </div>
    </div>

    <!-- Action Required Alert -->
    <div
      v-if="actionRequiredCount > 0"
      class="alert alert-info animate-fade-in-up animation-delay-300"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-check-circle text-info fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1">Action Required</h6>
          <p class="mb-0">
            You have {{ actionRequiredCount }} notification(s) that require your
            attention.
          </p>
        </div>
        <button class="btn btn-info btn-sm">
          <i class="bi bi-eye me-1"></i>
          View Actions
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-400">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search notifications by title or message..."
              />
            </div>
          </div>
          <div class="col-md-3">
            <select v-model="filterType" class="form-select">
              <option value="all">All Types</option>
              <option value="appointment_reminder">Appointment Reminder</option>
              <option value="system_alert">System Alert</option>
              <option value="medical_record">Medical Record</option>
              <option value="account_update">Account Update</option>
            </select>
          </div>
          <div class="col-md-3">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
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
      <p class="mt-3 text-muted">Loading notifications...</p>
    </div>

    <!-- Notifications List -->
    <div v-else class="card animate-fade-in-up animation-delay-500">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-bell-fill me-2"></i>
          Notifications ({{ filteredNotifications.length }})
        </h5>
        <div class="d-flex align-items-center gap-2">
          <span v-if="unreadCount > 0" class="badge bg-warning text-dark">
            {{ unreadCount }} unread
          </span>
          <span v-if="highPriorityCount > 0" class="badge bg-danger">
            {{ highPriorityCount }} high priority
          </span>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="notifications-list">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.NotificationID"
            class="notification-item p-4 border-bottom animate-fade-in-up"
            :class="{
              unread: !notification.IsRead,
              'bg-light': !notification.IsRead,
            }"
          >
            <div class="d-flex align-items-start">
              <div class="notification-icon me-3">
                <i
                  :class="`${getNotificationIcon(
                    notification.Type
                  )} text-${getTypeBadgeVariant(notification.Type)} fs-4`"
                ></i>
              </div>

              <div class="notification-content flex-grow-1">
                <div
                  class="d-flex justify-content-between align-items-start mb-2"
                >
                  <div>
                    <h6 class="mb-1">{{ notification.Title }}</h6>
                  </div>
                  <div class="text-end">
                    <span
                      class="badge me-2"
                      :class="`bg-${getPriorityBadgeVariant(
                        notification.Priority
                      )}`"
                    >
                      {{ notification.Priority }}
                    </span>
                    <span
                      class="badge"
                      :class="`bg-${getStatusBadgeVariant(
                        notification.IsRead
                      )}`"
                    >
                      {{ notification.IsRead ? "read" : "unread" }}
                    </span>
                  </div>
                </div>

                <p class="mb-3">{{ notification.Message }}</p>

                <div
                  class="notification-meta d-flex justify-content-between align-items-center"
                >
                  <div class="text-muted">
                    <small>
                      <i class="bi bi-clock me-1"></i>
                      {{ formatTimeAgo(notification.CreatedAt) }}
                    </small>
                  </div>

                  <div class="notification-actions">
                    <button
                      v-if="!notification.IsRead"
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="markAsRead(notification)"
                    >
                      <i class="bi bi-check me-1"></i>
                      Mark Read
                    </button>

                    <button
                      v-if="notification.ActionRequired"
                      class="btn btn-sm btn-primary me-2"
                      @click="performAction(notification)"
                    >
                      <i class="bi bi-cursor me-1"></i>
                      {{ notification.ActionText || "View" }}
                    </button>

                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="deleteNotification(notification)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredNotifications.length === 0" class="text-center py-5">
          <i class="bi bi-bell-slash text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No notifications found</h5>
          <p class="text-muted mb-3">
            {{
              search || filterType !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria."
                : "You have no notifications at this time."
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Notification Categories -->
    <div class="row g-4 mt-4">
      <!-- Appointment Reminders -->
      <div class="col-md-6">
        <div class="card animate-fade-in-up animation-delay-600">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-calendar-check me-2"></i>
              Appointment Reminders
            </h6>
          </div>
          <div class="card-body">
            <div class="reminder-item d-flex align-items-start p-2 mb-2">
              <div class="reminder-icon me-3">
                <i class="bi bi-calendar-event text-primary"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Tomorrow 10:30 AM</div>
                <small class="text-muted"
                  >Regular check-up with Dr. Sarah Johnson</small
                >
              </div>
              <div class="text-end">
                <button class="btn btn-sm btn-outline-primary">View</button>
              </div>
            </div>

            <div class="reminder-item d-flex align-items-start p-2 mb-2">
              <div class="reminder-icon me-3">
                <i class="bi bi-calendar-event text-info"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">October 18, 2:00 PM</div>
                <small class="text-muted">Follow-up consultation</small>
              </div>
              <div class="text-end">
                <button class="btn btn-sm btn-outline-primary">View</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Health Reminders -->
      <div class="col-md-6">
        <div class="card animate-fade-in-up animation-delay-700">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-clipboard-pulse me-2"></i>
              Health Reminders
            </h6>
          </div>
          <div class="card-body">
            <div class="health-reminder-item d-flex align-items-start p-2 mb-2">
              <div class="health-icon me-3">
                <i class="bi bi-capsule text-warning"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Medication Reminder</div>
                <small class="text-muted"
                  >Take Lisinopril at 8:00 AM daily</small
                >
              </div>
            </div>

            <div class="health-reminder-item d-flex align-items-start p-2 mb-2">
              <div class="health-icon me-3">
                <i class="bi bi-thermometer text-info"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Blood Pressure Monitoring</div>
                <small class="text-muted"
                  >Check BP twice daily and record readings</small
                >
              </div>
            </div>

            <div class="health-reminder-item d-flex align-items-start p-2">
              <div class="health-icon me-3">
                <i class="bi bi-shield-check text-success"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Vaccination Due</div>
                <small class="text-muted">Annual flu vaccination is due</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

.notification-icon {
  width: 50px;
  height: 50px;
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

.notifications-list {
  max-height: 600px;
  overflow-y: auto;
}

.notification-item {
  transition: all 0.2s ease;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.notification-item.unread {
  border-left: 4px solid var(--primary-gradient-start);
  background-color: rgba(67, 97, 238, 0.05);
}

.notification-content {
  min-width: 0;
}

.notification-meta {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.notification-actions .btn {
  font-size: 0.8rem;
}

.reminder-item,
.health-reminder-item {
  transition: background-color 0.2s ease;
}

.reminder-item:hover,
.health-reminder-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.reminder-icon,
.health-icon {
  width: 32px;
  height: 32px;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .notification-meta {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .notification-actions {
    justify-content: center;
  }
}
</style>
