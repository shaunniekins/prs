<script setup>
import { computed, ref, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog.vue";

const props = defineProps({
  isSidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-sidebar", "close-sidebar"]);

const authStore = useAuthStore();
const router = useRouter();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);

// Get unread notification count - simplified for now
const unreadNotificationCount = computed(() => {
  return 0; // TODO: Implement notification system with Pinia
});

const userRole = computed(() => user.value?.role || null);

// Enhanced logout with confirmation dialog and loading state
const isLoggingOut = ref(false);
const showLogoutDialog = ref(false);

const logout = () => {
  if (isLoggingOut.value) return; // Prevent multiple clicks
  showLogoutDialog.value = true;
};

const handleLogoutConfirm = async () => {
  if (isLoggingOut.value) return;

  isLoggingOut.value = true;
  showLogoutDialog.value = false;

  try {
    // Use the auth store logout which now uses the secure logout service
    await authStore.logout();
    // The logout service will handle the redirect automatically
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback redirect in case logout service fails
    router.push("/login");
  } finally {
    isLoggingOut.value = false;
  }
};

const handleLogoutCancel = () => {
  showLogoutDialog.value = false;
};

const toggleSidebar = () => {
  emit("toggle-sidebar");
};

const closeSidebar = () => {
  emit("close-sidebar");
};
</script>

<template>
  <div
    :class="['sidebar', { collapsed: isSidebarCollapsed, visible: isVisible }]"
  >
    <div class="sidebar-header">
      <h3 class="text-white mb-0">
        <router-link
          to="/dashboard"
          class="text-white text-decoration-none"
          @click="closeSidebar"
        >
          <i class="bi bi-hospital me-2"></i>
          <span v-if="!isSidebarCollapsed">Patient Record System</span>
        </router-link>
      </h3>
      <button @click="closeSidebar" class="btn btn-link text-white">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="sidebar-content">
      <!-- Main navigation links -->
      <ul class="nav flex-column main-nav">
        <template v-if="isAuthenticated">
          <!-- Admin menu -->
          <template v-if="userRole === 'admin'">
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/dashboard"
                @click="closeSidebar"
              >
                <i class="bi bi-person-badge me-2"></i>
                <span v-if="!isSidebarCollapsed">Admin Dashboard</span>
                <i
                  v-if="!isSidebarCollapsed"
                  class="bi bi-grid-fill ms-auto"
                ></i>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/records"
                @click="closeSidebar"
              >
                <i class="bi bi-clipboard2-pulse me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical Records</span>
              </router-link>
            </li>
          </template>
          <!-- Nurse/Clinic Staff menu -->
          <template v-else-if="userRole === 'nurse'">
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/dashboard"
                @click="closeSidebar"
              >
                <i class="bi bi-briefcase-medical me-2"></i>
                <span v-if="!isSidebarCollapsed">Dashboard</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/patients"
                @click="closeSidebar"
              >
                <i class="bi bi-people me-2"></i>
                <span v-if="!isSidebarCollapsed">Patient List</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/records"
                @click="closeSidebar"
              >
                <i class="bi bi-clipboard2-pulse me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical Records</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/visits"
                @click="closeSidebar"
              >
                <i class="bi bi-calendar-check me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical Visits</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/history"
                @click="closeSidebar"
              >
                <i class="bi bi-clock-history me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical History</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white notification-link"
                to="/notifications"
                @click="closeSidebar"
              >
                <i class="bi bi-bell me-2"></i>
                <span v-if="!isSidebarCollapsed">Notifications</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/calendar"
                @click="closeSidebar"
              >
                <i class="bi bi-calendar me-2"></i>
                <span v-if="!isSidebarCollapsed">Calendar</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/settings"
                @click="closeSidebar"
              >
                <i class="bi bi-gear me-2"></i>
                <span v-if="!isSidebarCollapsed">Settings</span>
              </router-link>
            </li>
          </template>
          <!-- Removed legacy employee menu as it's no longer needed -->
          <!-- Patient menu -->
          <template v-else-if="userRole === 'patient'">
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/records"
                @click="closeSidebar"
              >
                <i class="bi bi-clipboard2-pulse me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical Records</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/visits"
                @click="closeSidebar"
              >
                <i class="bi bi-calendar-check me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical Appointment</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/history"
                @click="closeSidebar"
              >
                <i class="bi bi-clock-history me-2"></i>
                <span v-if="!isSidebarCollapsed">Medical History</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white notification-link"
                to="/notifications"
                @click="closeSidebar"
              >
                <i class="bi bi-bell me-2"></i>
                <span v-if="!isSidebarCollapsed">
                  Notifications
                  <span
                    v-if="unreadNotificationCount > 0"
                    class="badge bg-danger notification-badge"
                  >
                    {{
                      unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount
                    }}
                  </span>
                </span>

                <span
                  v-else-if="unreadNotificationCount > 0"
                  class="badge bg-danger notification-badge-collapsed"
                >
                  {{
                    unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount
                  }}
                </span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/calendar"
                @click="closeSidebar"
              >
                <i class="bi bi-calendar me-2"></i>
                <span v-if="!isSidebarCollapsed">Calendar</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link text-white"
                to="/settings"
                @click="closeSidebar"
              >
                <i class="bi bi-gear me-2"></i>
                <span v-if="!isSidebarCollapsed">Settings</span>
              </router-link>
            </li>
          </template>
        </template>

        <!-- Spacer to push profile to bottom (if needed) -->
        <li class="grow"></li>
      </ul>

      <!-- Bottom user profile and logout section -->
      <div class="user-nav-container" v-if="isAuthenticated">
        <ul class="nav flex-column user-nav">
          <li class="nav-item">
            <div class="nav-link text-white user-info">
              <!-- Show profile picture if exists, otherwise show default icon -->
              <div v-if="user?.profilePicture" class="sidebar-profile-img">
                <img
                  :src="user.profilePicture"
                  alt="Profile"
                  class="img-fluid rounded-circle"
                />
              </div>
              <i v-else class="bi bi-person-circle me-2"></i>
              <span v-if="!isSidebarCollapsed">{{
                user?.fullName || user?.username
              }}</span>
            </div>
          </li>
          <li class="nav-item">
            <button
              @click="logout"
              :disabled="isLoggingOut"
              :class="[
                'logout-btn',
                'nav-link w-100 text-start border-0',
                { 'logging-out': isLoggingOut },
              ]"
              :aria-label="isLoggingOut ? 'Logging out...' : 'Logout'"
              tabindex="0"
              @keydown.enter="logout"
              @keydown.space.prevent="logout"
            >
              <i
                :class="[
                  'me-2',
                  isLoggingOut ? 'bi bi-hourglass-split' : 'bi bi-door-open',
                ]"
              ></i>
              <span v-if="!isSidebarCollapsed">
                {{ isLoggingOut ? "Logging out..." : "Logout" }}
              </span>
              <span
                v-if="isLoggingOut && isSidebarCollapsed"
                class="visually-hidden"
              >
                Logging out...
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Logout Confirmation Dialog -->
    <LogoutConfirmDialog
      v-model:show="showLogoutDialog"
      @confirm="handleLogoutConfirm"
      @cancel="handleLogoutCancel"
    />
  </div>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  height: 100vh; /* Ensure full height */
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: visible; /* Allow scrolling */
  transform: translateX(-100%); /* Hide by default */
}

.sidebar.visible {
  transform: translateX(0); /* Show when visible */
  animation: slideIn 0.3s ease forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0.5;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0; /* Prevent header from shrinking */
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px); /* subtract header height */
  overflow: visible;
  position: relative;
}

.main-nav {
  flex: 1;
  overflow-y: auto; /* Allow scrolling of main navigation */
  padding-bottom: 20px; /* Add some space at the bottom */
  display: flex;
  flex-direction: column;
  max-height: calc(
    100vh - 120px
  ); /* Ensure space for header and user section */
}

.user-nav-container {
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.user-nav {
  width: 100%;
}

.sidebar .nav {
  display: flex;
  flex-direction: column;
}

.sidebar .nav-link {
  padding: 12px 15px;
  white-space: nowrap;
  transition: all 0.3s;
  border-left: 3px solid transparent;
  color: #ffffff; /* Ensure text is white */
  display: flex; /* Use flexbox for alignment */
  align-items: center; /* Vertically align items */
}

.sidebar .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-left: 3px solid var(--accent-color);
}

.sidebar .nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.15);
  border-left: 3px solid var(--accent-color);
}

.user-info {
  background-color: rgba(0, 0, 0, 0.1); /* Darker background for user info */
  display: flex;
  align-items: center;
  padding: 12px 15px;
}

.sidebar-profile-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sidebar-profile-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Notification styling */
.notification-link {
  position: relative;
}

.notification-badge {
  font-size: 0.65rem;
  margin-left: 5px;
  vertical-align: middle;
  background-color: #dc3545; /* Bootstrap danger color */
}

.notification-badge-collapsed {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 0.65rem;
  padding: 0.15rem 0.35rem;
  background-color: #dc3545; /* Bootstrap danger color */
}

@media (max-width: 992px) {
  .sidebar {
    width: 240px; /* Keep the menu width consistent on mobile */
  }

  .sidebar.collapsed {
    width: 70px;
  }
}

/* Add styles for the icons on the right */
.nav-link i:last-child:not(.me-2) {
  margin-left: auto; /* Push the last icon to the right */
}

/* Enhanced logout button styling */
.logout-btn {
  background: linear-gradient(135deg, #dc3545, #c82333) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 8px !important;
  margin: 8px 12px !important;
  padding: 12px 16px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: hidden !important;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2) !important;
}

.logout-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333, #a71e2a) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3) !important;
  color: #ffffff !important;
}

.logout-btn:focus {
  outline: none !important;
  box-shadow:
    0 0 0 3px rgba(220, 53, 69, 0.25),
    0 4px 8px rgba(220, 53, 69, 0.3) !important;
  color: #ffffff !important;
}

.logout-btn:active:not(:disabled) {
  transform: translateY(0) !important;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2) !important;
}

.logout-btn:disabled.logging-out {
  background: linear-gradient(135deg, #6c757d, #5a6268) !important;
  cursor: not-allowed !important;
  opacity: 0.8 !important;
}

.logout-btn:disabled.logging-out:hover {
  transform: none !important;
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2) !important;
}

/* Animation for logout button */
.logout-btn::before {
  content: "" !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  ) !important;
  transition: left 0.5s ease !important;
}

.logout-btn:hover::before {
  left: 100% !important;
}

/* Responsive design for logout button */
@media (max-width: 768px) {
  .logout-btn {
    margin: 6px 8px !important;
    padding: 10px 12px !important;
    font-size: 0.9rem !important;
  }
}

@media (max-width: 576px) {
  .logout-btn {
    margin: 4px 6px !important;
    padding: 8px 10px !important;
    font-size: 0.8rem !important;
  }
}

/* Collapsed sidebar logout button */
.sidebar.collapsed .logout-btn {
  margin: 8px 6px !important;
  padding: 12px 8px !important;
  justify-content: center !important;
  border-radius: 6px !important;
}

.sidebar.collapsed .logout-btn i {
  margin-right: 0 !important;
  font-size: 1.1rem !important;
}

/* Accessibility improvements */
.logout-btn:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 2px !important;
}

/* Screen reader only text for collapsed state */
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
</style>
