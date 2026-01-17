<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { notificationService } from "../../services/notificationService.js";
import { useRealtime } from "../../composables/useRealtime.js";
import { useNotify } from "../../composables/useNotify.js";
import { useAuthStore } from "../../stores/auth.js";

// Auth store
const authStore = useAuthStore();

// Reactive data
const notifications = ref([]);
const loading = ref(false);
const error = ref(null);
const search = ref("");
const filterType = ref("all");
const filterStatus = ref("all");

// Real-time subscription
const { subscribeToUserNotifications, unsubscribe } = useRealtime();
let notificationSubscription = null;

// Initialize notifications
const fetchNotifications = async () => {
  try {
    loading.value = true;
    error.value = null;
    const data = await notificationService.getMyNotifications();
    notifications.value = data || [];
  } catch (err) {
    error.value = "Failed to load notifications";
    console.error("Error fetching notifications:", err);
  } finally {
    loading.value = false;
  }
};

// Subscribe to real-time updates
const setupRealtimeSubscription = () => {
  notificationSubscription = subscribeToUserNotifications(async (payload) => {
    console.log("Real-time notification update:", payload);
    // Refresh notifications when new ones arrive
    await fetchNotifications();
  });
};

// Lifecycle hooks
onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated && authStore.user) {
    await fetchNotifications();
    setupRealtimeSubscription();
  }
});

onUnmounted(() => {
  if (notificationSubscription) {
    unsubscribe(notificationSubscription);
  }
});

// Computed properties
const filteredNotifications = computed(() => {
  return notifications.value.filter((notification) => {
    const matchesSearch =
      notification.Title.toLowerCase().includes(search.value.toLowerCase()) ||
      notification.Message.toLowerCase().includes(search.value.toLowerCase()) ||
      (notification.relatedPatient &&
        notification.relatedPatient
          .toLowerCase()
          .includes(search.value.toLowerCase()));

    const matchesType =
      filterType.value === "all" || notification.Type === filterType.value;
    const matchesStatus =
      filterStatus.value === "all" ||
      (filterStatus.value === "read"
        ? notification.IsRead
        : !notification.IsRead);

    return matchesSearch && matchesType && matchesStatus;
  });
});

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.IsRead).length;
});

// Methods
const markAsRead = async (notification) => {
  try {
    await notificationService.markAsRead(notification.NotificationID);
    notification.IsRead = true;
    useNotify().success("Notification marked as read");
  } catch (err) {
    console.error("Error marking notification as read:", err);
    useNotify().error("Failed to mark notification as read");
  }
};

const markAllAsRead = async () => {
  try {
    const unreadNotifications = notifications.value.filter((n) => !n.IsRead);
    for (const notification of unreadNotifications) {
      await notificationService.markAsRead(notification.NotificationID);
      notification.IsRead = true;
    }
    useNotify().success("All notifications marked as read");
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    useNotify().error("Failed to mark all notifications as read");
  }
};

const deleteNotification = async (notification) => {
  try {
    await notificationService.deleteNotification(notification.NotificationID);
    const index = notifications.value.findIndex(
      (n) => n.NotificationID === notification.NotificationID
    );
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
    useNotify().success("Notification deleted successfully");
  } catch (err) {
    console.error("Error deleting notification:", err);
    useNotify().error("Failed to delete notification");
  }
};

const getStatusBadgeVariant = (status) => {
  return status === "read" ? "success" : "warning";
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

const viewPatientRecord = (patientName) => {
  console.log("Viewing patient record for:", patientName);
  alert(`View patient record for ${patientName} would be implemented here`);
};

const viewAppointment = (appointmentId) => {
  console.log("Viewing appointment:", appointmentId);
  alert(`View appointment ${appointmentId} would be implemented here`);
};
</script>

<template>
  <div class="nurse-notifications">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Notifications</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          View your personal notifications and alerts
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
          <button class="btn btn-primary">
            <i class="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
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
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-check text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredNotifications.filter(
                  (n) => n.Type === "appointment_reminder"
                ).length
              }}
            </h4>
            <small class="text-muted">Appointment Related</small>
          </div>
        </div>
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
                placeholder="Search notifications by content or patient..."
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

    <!-- Notifications List -->
    <div class="card animate-fade-in-up animation-delay-400">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-bell-fill me-2"></i>
          Notifications ({{ filteredNotifications.length }})
        </h5>
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
                    <div v-if="notification.relatedPatient" class="mb-1">
                      <span class="badge bg-info me-2"
                        >Patient: {{ notification.relatedPatient }}</span
                      >
                    </div>
                  </div>
                  <div class="text-end">
                    <span
                      class="badge"
                      :class="`bg-${getStatusBadgeVariant(
                        notification.IsRead ? 'read' : 'unread'
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
                      {{ formatDateTime(notification.CreatedAt) }}
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

                    <div
                      v-if="notification.relatedPatient"
                      class="btn-group me-2"
                    >
                      <button
                        class="btn btn-sm btn-outline-info"
                        @click="viewPatientRecord(notification.relatedPatient)"
                      >
                        <i class="bi bi-person me-1"></i>
                        View Patient
                      </button>
                    </div>

                    <div
                      v-if="notification.relatedAppointment"
                      class="btn-group me-2"
                    >
                      <button
                        class="btn btn-sm btn-outline-success"
                        @click="
                          viewAppointment(notification.relatedAppointment)
                        "
                      >
                        <i class="bi bi-calendar me-1"></i>
                        View Appointment
                      </button>
                    </div>

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
.alert-item {
  transition: background-color 0.2s ease;
}

.reminder-item:hover,
.alert-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.reminder-icon,
.alert-icon-small {
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
