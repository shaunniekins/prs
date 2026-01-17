<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuth } from "../../composables/useAuth.js";
import { useAuthStore } from "../../stores/auth.js";

// Initialize composables
const { notifications: notificationOps, users: userOps } = useSupabase();
const { requireAdminAccess } = useAuth();
const authStore = useAuthStore();

// Reactive data
const notifications = ref([]);
const users = ref([]);
const loading = ref(false);
const error = ref(null);
const search = ref("");
const showComposeModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedNotification = ref(null);
const filterType = ref("all");
const filterStatus = ref("all");

// Form data
const notificationForm = ref({
  recipientId: "",
  recipientName: "",
  type: "appointment_reminder",
  title: "",
  message: "",
  priority: "normal",
  scheduledFor: null,
});

// Load data on mount
onMounted(async () => {
  try {
    // Initialize auth if needed
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    await requireAdminAccess();
    await loadNotifications();
    await loadUsers();
  } catch (err) {
    error.value = err.message;
  }
});

// Load notifications
const loadNotifications = async () => {
  loading.value = true;
  try {
    const data = await notificationOps.getAllNotifications();
    notifications.value = data.map((notification) => ({
      ...notification,
      recipientName: notification.Users?.fullName || "Unknown",
      read: notification.IsRead || false,
      status: notification.Status || "sent",
      priority: notification.Priority || "normal",
      type: notification.Type || "system_alert",
      createdAt: notification.CreatedAt,
      sentAt: notification.SentAt,
      scheduledFor: notification.ScheduledFor,
    }));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Load users for recipient selection
const loadUsers = async () => {
  try {
    const data = await userOps.getAllUsers();
    users.value = data;
  } catch (err) {
    console.error("Failed to load users:", err);
  }
};

// Computed properties
const filteredNotifications = computed(() => {
  return notifications.value.filter((notification) => {
    const matchesSearch =
      notification.recipientName
        .toLowerCase()
        .includes(search.value.toLowerCase()) ||
      notification.title.toLowerCase().includes(search.value.toLowerCase()) ||
      notification.message.toLowerCase().includes(search.value.toLowerCase());

    const matchesType =
      filterType.value === "all" || notification.type === filterType.value;
    const matchesStatus =
      filterStatus.value === "all" ||
      notification.status === filterStatus.value;

    return matchesSearch && matchesType && matchesStatus;
  });
});

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.read).length;
});

const pendingCount = computed(() => {
  return notifications.value.filter((n) => n.status === "pending").length;
});

// Mock methods
const resetForm = () => {
  notificationForm.value = {
    recipientId: "",
    recipientName: "",
    type: "appointment_reminder",
    title: "",
    message: "",
    priority: "normal",
    scheduledFor: null,
  };
};

const openComposeModal = () => {
  resetForm();
  selectedNotification.value = null;
  showComposeModal.value = true;
};

const openEditModal = (notification) => {
  selectedNotification.value = notification;
  notificationForm.value = {
    recipientId: notification.userId,
    recipientName: notification.recipientName,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    scheduledFor: notification.scheduledFor,
  };
  showEditModal.value = true;
};

const openDeleteModal = (notification) => {
  selectedNotification.value = notification;
  showDeleteModal.value = true;
};

const closeModals = () => {
  showComposeModal.value = false;
  showEditModal.value = false;
  showDeleteModal.value = false;
  selectedNotification.value = null;
  resetForm();
};

const composeNotification = async () => {
  try {
    const notificationData = {
      UserID: notificationForm.value.recipientId,
      Type: notificationForm.value.type,
      Title: notificationForm.value.title,
      Message: notificationForm.value.message,
      Priority: notificationForm.value.priority,
      Status: notificationForm.value.scheduledFor ? "pending" : "sent",
      ScheduledFor: notificationForm.value.scheduledFor,
      SentAt: notificationForm.value.scheduledFor
        ? null
        : new Date().toISOString(),
      IsRead: false,
    };

    await notificationOps.createNotification(notificationData);
    await loadNotifications();
    closeModals();
    alert("Notification created successfully");
  } catch (err) {
    error.value = err.message;
    alert("Failed to create notification: " + err.message);
  }
};

const updateNotification = async () => {
  try {
    const notificationData = {
      Type: notificationForm.value.type,
      Title: notificationForm.value.title,
      Message: notificationForm.value.message,
      Priority: notificationForm.value.priority,
      ScheduledFor: notificationForm.value.scheduledFor,
      Status: notificationForm.value.scheduledFor ? "pending" : "sent",
      SentAt: notificationForm.value.scheduledFor
        ? null
        : new Date().toISOString(),
    };

    await notificationOps.updateNotification(
      selectedNotification.value.id,
      notificationData
    );
    await loadNotifications();
    closeModals();
    alert("Notification updated successfully");
  } catch (err) {
    error.value = err.message;
    alert("Failed to update notification: " + err.message);
  }
};

const deleteNotification = async () => {
  try {
    await notificationOps.deleteNotification(selectedNotification.value.id);
    await loadNotifications();
    closeModals();
    alert("Notification deleted successfully");
  } catch (err) {
    error.value = err.message;
    alert("Failed to delete notification: " + err.message);
  }
};

const markAsRead = async (notification) => {
  try {
    await notificationOps.markAsRead(notification.id);
    await loadNotifications();
    alert("Notification marked as read");
  } catch (err) {
    error.value = err.message;
    alert("Failed to mark as read: " + err.message);
  }
};

const markAllAsRead = async () => {
  try {
    await notificationOps.markAllAsRead();
    await loadNotifications();
    alert("All notifications marked as read");
  } catch (err) {
    error.value = err.message;
    alert("Failed to mark all as read: " + err.message);
  }
};

const sendNow = async (notification) => {
  try {
    await notificationOps.sendNow(notification.id);
    await loadNotifications();
    alert("Notification sent successfully");
  } catch (err) {
    error.value = err.message;
    alert("Failed to send notification: " + err.message);
  }
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    sent: "success",
    pending: "warning",
    failed: "danger",
  };
  return variants[status] || "secondary";
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

const formatDateTime = (dateTime) => {
  if (!dateTime) return "Not scheduled";
  return new Date(dateTime).toLocaleString();
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

// Removed real-time subscription as Supabase is no longer used
</script>

<template>
  <div class="notifications-management">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Notifications</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage system notifications and alerts
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openComposeModal">
          <i class="bi bi-envelope-plus me-2"></i>
          Compose Notification
        </button>
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
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-info fs-2"></i>
            </div>
            <h4 class="mb-1">{{ pendingCount }}</h4>
            <small class="text-muted">Pending</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredNotifications.filter((n) => n.status === "sent").length
              }}
            </h4>
            <small class="text-muted">Sent Today</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Actions -->
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
                placeholder="Search notifications by recipient or content..."
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
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div class="col-md-2">
            <div class="d-grid">
              <button
                v-if="unreadCount > 0"
                class="btn btn-outline-primary btn-sm"
                @click="markAllAsRead"
              >
                <i class="bi bi-check-all me-1"></i>
                Mark All Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications List -->
    <div class="card animate-fade-in-up animation-delay-300">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-bell-fill me-2"></i>
          Notifications ({{ filteredNotifications.length }})
        </h5>
      </div>
      <div class="card-body p-0">
        <div class="notifications-list">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            class="notification-item p-4 border-bottom animate-fade-in-up"
            :class="{
              unread: !notification.read,
              'bg-light': !notification.read,
            }"
          >
            <div class="d-flex align-items-start">
              <div class="notification-icon me-3">
                <i
                  :class="`${getNotificationIcon(
                    notification.type
                  )} text-${getTypeBadgeVariant(notification.type)} fs-4`"
                ></i>
              </div>

              <div class="notification-content flex-grow-1">
                <div
                  class="d-flex justify-content-between align-items-start mb-2"
                >
                  <div>
                    <h6 class="mb-1">{{ notification.title }}</h6>
                    <p class="text-muted mb-1">
                      To: <strong>{{ notification.recipientName }}</strong>
                    </p>
                  </div>
                  <div class="text-end">
                    <span
                      class="badge me-2"
                      :class="`bg-${getStatusBadgeVariant(
                        notification.status
                      )}`"
                    >
                      {{ notification.status }}
                    </span>
                    <span
                      class="badge"
                      :class="`bg-${getPriorityBadgeVariant(
                        notification.priority
                      )}`"
                    >
                      {{ notification.priority }}
                    </span>
                  </div>
                </div>

                <p class="mb-2">{{ notification.message }}</p>

                <div
                  class="notification-meta d-flex justify-content-between align-items-center"
                >
                  <div class="text-muted">
                    <small>
                      <i class="bi bi-clock me-1"></i>
                      Created: {{ formatDateTime(notification.createdAt) }}
                    </small>
                    <small v-if="notification.sentAt" class="ms-3">
                      <i class="bi bi-send me-1"></i>
                      Sent: {{ formatDateTime(notification.sentAt) }}
                    </small>
                    <small v-if="notification.scheduledFor" class="ms-3">
                      <i class="bi bi-calendar-event me-1"></i>
                      Scheduled: {{ formatDateTime(notification.scheduledFor) }}
                    </small>
                  </div>

                  <div class="notification-actions">
                    <button
                      v-if="!notification.read"
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="markAsRead(notification)"
                    >
                      <i class="bi bi-check me-1"></i>
                      Mark Read
                    </button>
                    <button
                      v-if="notification.status === 'pending'"
                      class="btn btn-sm btn-success me-2"
                      @click="sendNow(notification)"
                    >
                      <i class="bi bi-send me-1"></i>
                      Send Now
                    </button>
                    <div class="btn-group">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="openEditModal(notification)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        @click="openDeleteModal(notification)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
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
                : "No notifications have been sent yet."
            }}
          </p>
          <button
            v-if="!search && filterType === 'all' && filterStatus === 'all'"
            class="btn btn-primary"
            @click="openComposeModal"
          >
            <i class="bi bi-envelope-plus me-2"></i>
            Send First Notification
          </button>
        </div>
      </div>
    </div>

    <!-- Compose Notification Modal -->
    <div
      class="modal fade"
      :class="{ show: showComposeModal }"
      :style="{ display: showComposeModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-envelope-plus me-2"></i>
              Compose Notification
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="composeNotification">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Recipient *</label>
                  <input
                    v-model="notificationForm.recipientName"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type *</label>
                  <select
                    v-model="notificationForm.type"
                    class="form-select"
                    required
                  >
                    <option value="appointment_reminder">
                      Appointment Reminder
                    </option>
                    <option value="system_alert">System Alert</option>
                    <option value="medical_record">
                      Medical Record Update
                    </option>
                    <option value="account_update">Account Update</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Title *</label>
                  <input
                    v-model="notificationForm.title"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Message *</label>
                  <textarea
                    v-model="notificationForm.message"
                    class="form-control"
                    rows="4"
                    required
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select
                    v-model="notificationForm.priority"
                    class="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Schedule For (Optional)</label>
                  <input
                    v-model="notificationForm.scheduledFor"
                    type="datetime-local"
                    class="form-control"
                  />
                  <small class="text-muted"
                    >Leave empty to send immediately</small
                  >
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
                <i class="bi bi-send me-2"></i>
                {{
                  notificationForm.scheduledFor
                    ? "Schedule Notification"
                    : "Send Notification"
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Notification Modal -->
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
              Edit Notification
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateNotification">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Recipient *</label>
                  <input
                    v-model="notificationForm.recipientName"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type *</label>
                  <select
                    v-model="notificationForm.type"
                    class="form-select"
                    required
                  >
                    <option value="appointment_reminder">
                      Appointment Reminder
                    </option>
                    <option value="system_alert">System Alert</option>
                    <option value="medical_record">
                      Medical Record Update
                    </option>
                    <option value="account_update">Account Update</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Title *</label>
                  <input
                    v-model="notificationForm.title"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Message *</label>
                  <textarea
                    v-model="notificationForm.message"
                    class="form-control"
                    rows="4"
                    required
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select
                    v-model="notificationForm.priority"
                    class="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Schedule For (Optional)</label>
                  <input
                    v-model="notificationForm.scheduledFor"
                    type="datetime-local"
                    class="form-control"
                  />
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
                <i class="bi bi-check-lg me-2"></i>
                Update Notification
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
            <p>Are you sure you want to delete this notification?</p>
            <div v-if="selectedNotification" class="alert alert-warning">
              <strong>{{ selectedNotification.title }}</strong
              ><br />
              <small>{{ selectedNotification.recipientName }}</small>
            </div>
            <p class="text-muted mb-0">This action cannot be undone.</p>
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
              @click="deleteNotification"
            >
              <i class="bi bi-trash me-2"></i>
              Delete Notification
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showComposeModal || showEditModal || showDeleteModal"
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
