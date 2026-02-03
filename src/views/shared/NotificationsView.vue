<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNotify } from "@/composables/useNotify.js";
import { useSupabase } from "@/composables/useSupabase.js";
import { useAuthStore } from "@/stores/auth.js";
import { useAuthGuard } from "@/composables/useAuthGuard.js";
import { supabase } from "@/config/supabaseConfig.js";

// Define props for role-based customization
const props = defineProps({
  title: {
    type: String,
    default: "Notifications",
  },
  subtitle: {
    type: String,
    default: "View and manage notifications",
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
const {
  notifications: notificationOps,
  patients: patientOps,
  appointments: appointmentOps,
} = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const error = ref(null);
const search = ref("");
const filterType = ref("all");
const filterStatus = ref("all");

const notifications = ref([]);
const patientsList = ref([]);
const upcomingAppointments = ref([]);

// Modal states
const showComposeModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedNotification = ref(null);

// Real-time subscription
let notificationSubscription = null;

// Form data
const notificationForm = ref({
  recipientId: "",
  type: "info",
  title: "",
  message: "",
});

// Computed properties
const isPatient = computed(() => props.mode === "patient");
const isNurse = computed(() => props.mode === "nurse");
const isAdmin = computed(() => props.mode === "admin");
const isStaff = computed(() => isNurse.value || isAdmin.value);
const canCompose = computed(() => isAdmin.value); // Only admin can create notifications
const canEdit = computed(() => isAdmin.value); // Only admin can edit/delete notifications

const filteredNotifications = computed(() => {
  return notifications.value.filter((notification) => {
    const title = (
      notification.Title ||
      notification.title ||
      ""
    ).toLowerCase();
    const message = (
      notification.Message ||
      notification.message ||
      ""
    ).toLowerCase();
    const recipientName = (notification.recipientName || "").toLowerCase();
    const searchLower = search.value.toLowerCase();

    const matchesSearch =
      title.includes(searchLower) ||
      message.includes(searchLower) ||
      recipientName.includes(searchLower);

    const type = notification.Type || notification.type || "";
    const matchesType = filterType.value === "all" || type === filterType.value;

    const isRead = notification.IsRead || notification.isRead || false;
    let matchesStatus = true;
    if (filterStatus.value === "read") {
      matchesStatus = isRead;
    } else if (filterStatus.value === "unread") {
      matchesStatus = !isRead;
    } else if (filterStatus.value !== "all") {
      matchesStatus =
        (notification.Status || "").toLowerCase() === filterStatus.value;
    }

    return matchesSearch && matchesType && matchesStatus;
  });
});

const unreadCount = computed(() => {
  return notifications.value.filter((n) => !(n.IsRead || n.isRead)).length;
});

const readCount = computed(() => {
  return notifications.value.filter((n) => n.IsRead || n.isRead).length;
});

const appointmentCount = computed(() => {
  return notifications.value.filter((n) => (n.Type || n.type) === "appointment")
    .length;
});

// Stats based on role
const stats = computed(() => {
  return [
    {
      icon: "bi-bell",
      color: "primary",
      value: notifications.value.length,
      label: "Total",
    },
    {
      icon: "bi-envelope-exclamation",
      color: "warning",
      value: unreadCount.value,
      label: "Unread",
    },
    {
      icon: "bi-check-circle",
      color: "success",
      value: readCount.value,
      label: "Read",
    },
    {
      icon: "bi-calendar-check",
      color: "info",
      value: appointmentCount.value,
      label: "Appointments",
    },
  ];
});

// Initialize auth guard
const { waitForAuthenticated } = useAuthGuard();

// Methods
const fetchNotifications = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Use the auth guard to wait for authentication with proper timing handling
    const { success, error: authErr } = await waitForAuthenticated();

    if (!success) {
      throw new Error(authErr || "Please log in to view notifications");
    }

    let data;

    if (isPatient.value) {
      // Get user's own notifications
      data = await notificationOps.getMyNotifications();

      // Fetch upcoming appointments for patient
      try {
        const appointmentsData = await appointmentOps.getMyAppointments();
        // Filter to only upcoming appointments (today or future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        upcomingAppointments.value = (appointmentsData || [])
          .filter((apt) => {
            const aptDate = new Date(apt.AppointmentDate);
            return aptDate >= today && apt.Status !== "cancelled";
          })
          .slice(0, 5); // Show max 5 upcoming
      } catch (e) {
        console.warn("Could not fetch appointments:", e);
        upcomingAppointments.value = [];
      }
    } else {
      // Get all notifications for staff
      data = await notificationOps.getAllNotifications();

      // Also fetch patients for the compose form (recipients are only patients)
      try {
        const patientsData = await patientOps.getAllPatients();
        patientsList.value = (patientsData || []).map((p) => ({
          ...p,
          UserID: p.UserID,
          fullName: p.Users?.fullName || `${p.FirstName} ${p.LastName}`,
        }));
      } catch (e) {
        console.warn("Could not fetch patients:", e);
        patientsList.value = [];
      }
    }

    // Normalize notifications data
    notifications.value = (data || []).map((n) => ({
      ...n,
      id: n.NotificationID || n.id,
      recipientName: n.Users?.fullName || n.recipientName || "Unknown",
      read: n.IsRead || false,
      status: n.Status || "sent",
      priority: n.Priority || "normal",
      type: n.Type || "system_alert",
      createdAt: n.CreatedAt || n.created_at,
      sentAt: n.SentAt,
      scheduledFor: n.ScheduledFor,
    }));
  } catch (err) {
    error.value = err.message || "Failed to fetch notifications";
    showError(error.value);
    console.error("Error fetching notifications:", err);
  } finally {
    loading.value = false;
  }
};

const setupRealtimeSubscription = () => {
  notificationSubscription = supabase
    .channel("notifications-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Notification" },
      () => {
        fetchNotifications();
      },
    )
    .subscribe();
};

const resetForm = () => {
  notificationForm.value = {
    recipientId: "",
    type: "info",
    title: "",
    message: "",
  };
};

const openComposeModal = () => {
  if (!canCompose.value) {
    showError("You don't have permission to compose notifications");
    return;
  }
  resetForm();
  selectedNotification.value = null;
  showComposeModal.value = true;
};

const openEditModal = (notification) => {
  if (!canEdit.value) {
    showError("You don't have permission to edit notifications");
    return;
  }
  selectedNotification.value = notification;
  notificationForm.value = {
    recipientId: notification.UserID || notification.userId || "",
    type: notification.Type || notification.type || "info",
    title: notification.Title || notification.title || "",
    message: notification.Message || notification.message || "",
  };
  showEditModal.value = true;
};

const openDeleteModal = (notification) => {
  if (!canEdit.value) {
    showError("You don't have permission to delete notifications");
    return;
  }
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
  if (!notificationForm.value.recipientId) {
    showError("Please select a recipient");
    return;
  }
  if (!notificationForm.value.title) {
    showError("Please enter a title");
    return;
  }
  if (!notificationForm.value.message) {
    showError("Please enter a message");
    return;
  }

  loading.value = true;
  try {
    const notificationData = {
      UserID: notificationForm.value.recipientId,
      Type: notificationForm.value.type,
      Title: notificationForm.value.title,
      Message: notificationForm.value.message,
      IsRead: false,
    };

    await notificationOps.createNotification(notificationData);
    await fetchNotifications();
    closeModals();
    showSuccess("Notification sent successfully!");
  } catch (err) {
    showError(err.message || "Failed to create notification");
    console.error("Error creating notification:", err);
  } finally {
    loading.value = false;
  }
};

const updateNotification = async () => {
  if (!selectedNotification.value) {
    showError("No notification selected");
    return;
  }

  loading.value = true;
  try {
    const notificationData = {
      Type: notificationForm.value.type,
      Title: notificationForm.value.title,
      Message: notificationForm.value.message,
    };

    await notificationOps.updateNotification(
      selectedNotification.value.NotificationID ||
        selectedNotification.value.id,
      notificationData,
    );
    await fetchNotifications();
    closeModals();
    showSuccess("Notification updated successfully!");
  } catch (err) {
    showError(err.message || "Failed to update notification");
    console.error("Error updating notification:", err);
  } finally {
    loading.value = false;
  }
};

const deleteNotification = async () => {
  if (!selectedNotification.value) {
    showError("No notification selected");
    return;
  }

  loading.value = true;
  try {
    await notificationOps.deleteNotification(
      selectedNotification.value.NotificationID ||
        selectedNotification.value.id,
    );
    await fetchNotifications();
    closeModals();
    showSuccess("Notification deleted successfully!");
  } catch (err) {
    showError(err.message || "Failed to delete notification");
    console.error("Error deleting notification:", err);
  } finally {
    loading.value = false;
  }
};

const markAsRead = async (notification) => {
  try {
    await notificationOps.markAsRead(
      notification.NotificationID || notification.id,
    );
    notification.IsRead = true;
    notification.read = true;
    showSuccess("Notification marked as read");
  } catch (err) {
    showError(err.message || "Failed to mark notification as read");
    console.error("Error marking notification as read:", err);
  }
};

const markAllAsRead = async () => {
  try {
    await notificationOps.markAllAsRead();
    notifications.value.forEach((n) => {
      n.IsRead = true;
      n.read = true;
    });
    showSuccess("All notifications marked as read");
  } catch (err) {
    showError(err.message || "Failed to mark all notifications as read");
    console.error("Error marking all notifications as read:", err);
  }
};

// Helper functions
const getTypeBadgeVariant = (type) => {
  const variants = {
    info: "info",
    success: "success",
    warning: "warning",
    error: "danger",
    appointment: "primary",
    record: "secondary",
  };
  return variants[type] || "secondary";
};

const getNotificationIcon = (type) => {
  const icons = {
    info: "bi-info-circle",
    success: "bi-check-circle",
    warning: "bi-exclamation-triangle",
    error: "bi-x-circle",
    appointment: "bi-calendar-event",
    record: "bi-file-medical",
  };
  return icons[type] || "bi-bell";
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return "N/A";
  return new Date(dateTime).toLocaleString();
};

const formatTimeAgo = (dateTime) => {
  if (!dateTime) return "N/A";
  const now = new Date();
  const date = new Date(dateTime);
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }
};

const formatAppointmentDate = (dateTime) => {
  if (!dateTime) return "N/A";
  const date = new Date(dateTime);
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
};

const getAppointmentStatusBadge = (status) => {
  const badges = {
    pending: "bg-warning text-dark",
    approved: "bg-success",
    confirmed: "bg-success",
    completed: "bg-secondary",
    cancelled: "bg-danger",
  };
  return badges[status?.toLowerCase()] || "bg-secondary";
};

// Lifecycle hooks
onMounted(async () => {
  await fetchNotifications();
  setupRealtimeSubscription();
});

onUnmounted(() => {
  if (notificationSubscription) {
    supabase.removeChannel(notificationSubscription);
  }
});
</script>

<template>
  <div class="notifications-view">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">{{ title }}</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          {{ subtitle }}
        </p>
      </div>
      <div class="animate-fade-in-right">
        <div class="d-flex gap-2">
          <button
            v-if="unreadCount > 0"
            class="btn btn-outline-primary"
            @click="markAllAsRead"
            :disabled="loading"
          >
            <i class="bi bi-check-all me-2"></i>
            Mark All Read
          </button>
          <button
            v-if="canCompose"
            class="btn btn-primary"
            @click="openComposeModal"
            :disabled="loading"
          >
            <i class="bi bi-envelope-plus me-2"></i>
            Compose
          </button>
          <button
            class="btn btn-outline-secondary"
            @click="fetchNotifications"
            :disabled="loading"
          >
            <i
              class="bi bi-arrow-clockwise"
              :class="{ 'animate-spin': loading }"
            ></i>
          </button>
        </div>
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

    <!-- Search and Filters -->
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
                  isStaff
                    ? 'Search by recipient, title, or message...'
                    : 'Search notifications...'
                "
              />
            </div>
          </div>
          <div class="col-md-4">
            <select v-model="filterType" class="form-select">
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="appointment">Appointment</option>
              <option value="record">Record</option>
            </select>
          </div>
          <div class="col-md-4">
            <select v-model="filterStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
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
      <p class="mt-3 text-muted">Loading notifications...</p>
    </div>

    <!-- Notifications List -->
    <div v-else class="card animate-fade-in-up animation-delay-300">
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
        </div>
      </div>
      <div class="card-body p-0">
        <div class="notifications-list">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id || notification.NotificationID"
            class="notification-item p-4 border-bottom animate-fade-in-up"
            :class="{
              unread: !(notification.IsRead || notification.read),
              'bg-light': !(notification.IsRead || notification.read),
            }"
          >
            <div class="d-flex align-items-start">
              <div class="notification-icon me-3">
                <i
                  :class="`${getNotificationIcon(notification.Type || notification.type)} text-${getTypeBadgeVariant(notification.Type || notification.type)} fs-4`"
                ></i>
              </div>

              <div class="notification-content flex-grow-1">
                <div
                  class="d-flex justify-content-between align-items-start mb-2"
                >
                  <div>
                    <h6 class="mb-1">
                      {{ notification.Title || notification.title }}
                    </h6>
                    <p
                      v-if="isStaff && notification.recipientName"
                      class="text-muted mb-0 small"
                    >
                      To: <strong>{{ notification.recipientName }}</strong>
                    </p>
                  </div>
                  <div class="text-end">
                    <span
                      class="badge me-2"
                      :class="`bg-${getTypeBadgeVariant(notification.Type || notification.type)}`"
                    >
                      {{ notification.Type || notification.type }}
                    </span>
                    <span
                      class="badge"
                      :class="`bg-${notification.IsRead || notification.read ? 'success' : 'warning'}`"
                    >
                      {{
                        notification.IsRead || notification.read
                          ? "read"
                          : "unread"
                      }}
                    </span>
                  </div>
                </div>

                <p class="mb-2">
                  {{ notification.Message || notification.message }}
                </p>

                <div
                  class="notification-meta d-flex justify-content-between align-items-center"
                >
                  <div class="text-muted">
                    <small>
                      <i class="bi bi-clock me-1"></i>
                      {{
                        formatTimeAgo(
                          notification.CreatedAt || notification.createdAt,
                        )
                      }}
                    </small>
                  </div>

                  <div class="notification-actions">
                    <button
                      v-if="!(notification.IsRead || notification.read)"
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="markAsRead(notification)"
                    >
                      <i class="bi bi-check me-1"></i>
                      Mark Read
                    </button>
                    <div v-if="canEdit" class="btn-group">
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
                : "You have no notifications at this time."
            }}
          </p>
          <button
            v-if="canCompose && !search"
            class="btn btn-primary"
            @click="openComposeModal"
          >
            <i class="bi bi-envelope-plus me-2"></i>
            Send First Notification
          </button>
        </div>
      </div>
    </div>

    <!-- Patient-only: Reminders Section -->
    <div v-if="isPatient" class="row g-4 mt-4">
      <!-- Appointment Reminders -->
      <div class="col-md-6">
        <div class="card animate-fade-in-up animation-delay-300">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-calendar-check me-2"></i>
              Upcoming Appointments
            </h6>
          </div>
          <div class="card-body">
            <div v-if="upcomingAppointments.length > 0">
              <div
                v-for="apt in upcomingAppointments"
                :key="apt.AppointmentID"
                class="reminder-item d-flex align-items-start p-2 mb-2 rounded"
              >
                <div class="reminder-icon me-3">
                  <i class="bi bi-calendar-event text-primary"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-medium">
                    {{ formatAppointmentDate(apt.AppointmentDate) }}
                  </div>
                  <small class="text-muted">{{
                    apt.Reason || "Scheduled appointment"
                  }}</small>
                </div>
                <span
                  class="badge"
                  :class="getAppointmentStatusBadge(apt.Status)"
                >
                  {{ apt.Status }}
                </span>
              </div>
            </div>
            <div v-else class="text-center text-muted py-3">
              <i class="bi bi-calendar-x fs-4 mb-2 d-block"></i>
              <small>No upcoming appointments</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Health Reminders -->
      <div class="col-md-6">
        <div class="card animate-fade-in-up animation-delay-400">
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
                  >Remember to take your prescriptions as directed</small
                >
              </div>
            </div>

            <div class="health-reminder-item d-flex align-items-start p-2 mb-2">
              <div class="health-icon me-3">
                <i class="bi bi-thermometer text-info"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Regular Check-ups</div>
                <small class="text-muted"
                  >Schedule regular health check-ups</small
                >
              </div>
            </div>

            <div class="health-reminder-item d-flex align-items-start p-2">
              <div class="health-icon me-3">
                <i class="bi bi-shield-check text-success"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-medium">Stay Healthy</div>
                <small class="text-muted">Maintain a healthy lifestyle</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compose Modal (Staff only) -->
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
                  <label class="form-label">Patient Recipient *</label>
                  <select
                    v-model="notificationForm.recipientId"
                    class="form-select"
                    required
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.UserID"
                      :value="patient.UserID"
                    >
                      {{ patient.fullName }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type *</label>
                  <select
                    v-model="notificationForm.type"
                    class="form-select"
                    required
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="appointment">Appointment</option>
                    <option value="record">Record</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Title *</label>
                  <input
                    v-model="notificationForm.title"
                    type="text"
                    class="form-control"
                    placeholder="Notification title"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Message *</label>
                  <textarea
                    v-model="notificationForm.message"
                    class="form-control"
                    rows="4"
                    placeholder="Notification message"
                    required
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
                <i class="bi bi-send me-2"></i>
                Send Notification
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Modal (Staff only) -->
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
                <div class="col-md-12">
                  <label class="form-label">Type *</label>
                  <select
                    v-model="notificationForm.type"
                    class="form-select"
                    required
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="appointment">Appointment</option>
                    <option value="record">Record</option>
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
              Delete Notification
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
              <strong>{{
                selectedNotification.Title || selectedNotification.title
              }}</strong
              ><br />
              <small
                >{{
                  (
                    selectedNotification.Message ||
                    selectedNotification.message ||
                    ""
                  ).substring(0, 100)
                }}...</small
              >
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
              :disabled="loading"
            >
              <i
                class="bi bi-trash me-2"
                :class="{ 'animate-spin': loading }"
              ></i>
              {{ loading ? "Deleting..." : "Delete" }}
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
.notifications-view {
  padding: 1rem;
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
  z-index: 10;
}

.search-box input {
  padding-left: 40px;
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
  border-left: 4px solid #0d6efd;
  background-color: rgba(13, 110, 253, 0.05);
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

@media (max-width: 768px) {
  .notification-meta {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .notification-actions {
    justify-content: flex-start;
  }
}
</style>
