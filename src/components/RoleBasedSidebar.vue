<script setup>
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

// Props
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
});

// Router
const router = useRouter();
const route = useRoute();

// Store
const authStore = useAuthStore();

// Reactive data
const isCollapsed = ref(false);

// Emits
const emit = defineEmits(["toggle", "close"]);

// Computed properties
const userRole = computed(() => authStore.userRole);
const user = computed(() => authStore.user);

// Methods
const logout = () => {
  authStore.logout();
};

// Sidebar navigation items based on role
const adminNavItems = [
  {
    title: "Dashboard",
    icon: "bi-speedometer2",
    route: "/admin",
    description: "Overview of system data",
  },
  {
    title: "Manage Staff",
    icon: "bi-people",
    route: "/admin/staff",
    description: "Staff management",
  },
  {
    title: "Manage Patients",
    icon: "bi-person-lines-fill",
    route: "/admin/patients",
    description: "Patient registration and records",
  },
  {
    title: "Appointments",
    icon: "bi-calendar-event",
    route: "/admin/appointments",
    description: "Appointment scheduling and management",
  },
  {
    title: "Medical Records",
    icon: "bi-file-medical",
    route: "/admin/medical-records",
    description: "Patient medical record oversight",
  },
  {
    title: "Notifications",
    icon: "bi-bell",
    route: "/admin/notifications",
    description: "System notifications and alerts",
  },
  {
    title: "Reports & Analytics",
    icon: "bi-bar-chart-line",
    route: "/admin/reports",
    description: "Clinic statistics and reporting",
  },
  {
    title: "Account Creation",
    icon: "bi-person-gear",
    route: "/admin/account-creation",
    description: "Create new user accounts",
  },
  {
    title: "Logout",
    icon: "bi-box-arrow-right",
    method: logout,
    description: "Sign out of your account",
  },
];

const nurseNavItems = [
  {
    title: "Dashboard",
    icon: "bi-speedometer2",
    route: "/nurse",
    description: "Daily overview and schedule",
  },
  {
    title: "Patient Management",
    icon: "bi-person",
    route: "/nurse/patient-management",
    description: "Patient information and care",
  },
  {
    title: "Medical Records",
    icon: "bi-file-medical",
    route: "/nurse/medical-records",
    description: "Create and manage patient records",
  },
  {
    title: "Appointment Requests",
    icon: "bi-calendar-check",
    route: "/nurse/appointment-requests",
    description: "Manage appointment requests",
  },
  {
    title: "Treatment & Diagnosis",
    icon: "bi-capsule",
    route: "/nurse/treatment-diagnosis",
    description: "Treatment protocols and guidelines",
  },
  {
    title: "Consultation Notes",
    icon: "bi-journal-text",
    route: "/nurse/consultation-notes",
    description: "Patient consultation documentation",
  },
  {
    title: "Notifications",
    icon: "bi-bell",
    route: "/nurse/notifications",
    description: "Personal notifications and alerts",
  },
  {
    title: "Logout",
    icon: "bi-box-arrow-right",
    method: logout,
    description: "Sign out of your account",
  },
];

const patientNavItems = [
  {
    title: "Dashboard",
    icon: "bi-speedometer2",
    route: "/patient",
    description: "Personal health overview",
  },
  {
    title: "My Appointments",
    icon: "bi-calendar-event",
    route: "/patient/appointments",
    description: "View and manage appointments",
  },
  {
    title: "My Medical Records",
    icon: "bi-file-medical",
    route: "/patient/medical-records",
    description: "Access personal medical records",
  },
  {
    title: "Notifications",
    icon: "bi-bell",
    route: "/patient/notifications",
    description: "Health reminders and alerts",
  },
  {
    title: "Logout",
    icon: "bi-box-arrow-right",
    method: logout,
    description: "Sign out of your account",
  },
];

// Get navigation items based on role
const navItems = computed(() => {
  switch (userRole.value) {
    case "admin":
      return adminNavItems;
    case "nurse":
      return nurseNavItems;
    case "patient":
      return patientNavItems;
    default:
      return [];
  }
});

// Methods
const navigateTo = (routePath) => {
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    emit("close");
  }
  router.push(routePath);
};

const isActive = (routePath) => {
  return route.path === routePath;
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  emit("toggle", isCollapsed.value);
};

// Enhanced keyboard navigation
const handleKeyDown = (event, item) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (item.method) {
      item.method();
    } else {
      navigateTo(item.route);
    }
  }
};
</script>

<template>
  <div
    class="role-based-sidebar"
    :class="{ collapsed: isCollapsed, visible: isVisible }"
  >
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="d-flex align-items-center">
        <div class="sidebar-logo me-3">
          <i class="bi bi-hospital text-white fs-4"></i>
        </div>
        <div v-if="!isCollapsed" class="sidebar-title">
          <h6 class="mb-0 text-white">Baan KM-3</h6>
          <small class="text-white-50">Information System</small>
        </div>
      </div>
    </div>

    <!-- User Info -->
    <div class="sidebar-user mb-4">
      <div class="d-flex align-items-center">
        <div class="user-avatar me-3">
          <i class="bi bi-person-circle text-white fs-4"></i>
        </div>
        <div v-if="!isCollapsed" class="user-info">
          <div class="fw-medium text-white">
            {{ user?.fullName || user?.username || "User" }}
          </div>
          <small class="text-white-50 text-capitalize">{{ userRole }}</small>
        </div>
      </div>
    </div>

    <!-- Skip Navigation Link -->
    <a href="#main-content" class="skip-nav" aria-label="Skip to main content">
      Skip to main content
    </a>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
      <div
        v-for="item in navItems"
        :key="item.route || item.title"
        class="nav-item"
      >
        <button
          class="nav-link w-100 text-start"
          :class="{ active: item.route && isActive(item.route) }"
          @click="item.method ? item.method() : navigateTo(item.route)"
          @keydown="handleKeyDown($event, item)"
          :aria-current="item.route && isActive(item.route) ? 'page' : 'false'"
          :aria-label="`${item.title} - ${item.description}`"
          :title="`${item.title} - ${item.description}`"
          tabindex="0"
        >
          <div class="nav-link-content">
            <div class="nav-icon me-3" aria-hidden="true">
              <i
                :class="`${item.icon} ${
                  item.route && isActive(item.route)
                    ? 'text-white'
                    : 'text-white-50'
                }`"
              ></i>
            </div>
            <div v-if="!isCollapsed" class="nav-text">
              <div class="nav-title">{{ item.title }}</div>
              <small class="nav-description text-white-50">{{
                item.description
              }}</small>
            </div>
          </div>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.role-based-sidebar {
  width: 280px;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  color: white;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(0); /* Visible by default */
}

.role-based-sidebar:not(.visible) {
  transform: translateX(-100%); /* Hide sidebar when not visible */
}

.role-based-sidebar.collapsed {
  width: 80px;
}

.role-based-sidebar.collapsed:not(.visible) {
  transform: translateX(-100%); /* Hide when collapsed and not visible */
}

.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-title h6 {
  font-size: 1.1rem;
  font-weight: 600;
}

.sidebar-user {
  padding: 0 1rem;
}

.user-avatar {
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 200px); /* Ensure space for header and footer */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1);
  scroll-behavior: smooth;
  position: relative;
}

/* Scroll fade indicators */
.sidebar-nav::before,
.sidebar-nav::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.3s ease;
}

.sidebar-nav::before {
  top: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 100%
  );
  opacity: 0;
}

.sidebar-nav::after {
  bottom: 0;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 100%
  );
  opacity: 0;
}

/* Show fade indicators when scrolled */
.sidebar-nav.has-content-above::before,
.sidebar-nav.has-content-below::after {
  opacity: 1;
}

/* Enhanced scrollbar styling for webkit browsers */
.sidebar-nav::-webkit-scrollbar {
  width: 8px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin: 0.5rem 0;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.6) 100%
  );
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  min-height: 40px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.8) 100%
  );
  border-color: rgba(255, 255, 255, 0.3);
  transform: scaleX(1.2);
}

.sidebar-nav::-webkit-scrollbar-thumb:active {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 1) 100%
  );
}

/* Firefox scrollbar styling enhancement */
.sidebar-nav {
  scrollbar-width: thin;
}

/* Corner styling */
.sidebar-nav::-webkit-scrollbar-corner {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item {
  margin-bottom: 0.25rem;
}

.nav-link {
  background: none;
  border: none;
  color: white;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
  text-decoration: none;
  position: relative;
}

.nav-link:hover,
.nav-link:focus {
  background-color: rgba(255, 255, 255, 0.1);
  outline: none;
}

.nav-link:focus {
  box-shadow: inset 2px 0 0 0 #ffffff;
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: -2px;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.2);
  border-right: 3px solid white;
}

.nav-link.active:focus {
  box-shadow: inset 2px 0 0 0 #ffffff, inset 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.nav-link-content {
  display: flex;
  align-items: center;
}

.nav-icon {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  flex: 1;
}

.nav-title {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.1rem;
}

.nav-description {
  font-size: 0.75rem;
  opacity: 0.8;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Skip Navigation Link */
.skip-nav {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-gradient-start);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1001;
  transition: top 0.3s ease;
}

.skip-nav:focus {
  top: 6px;
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

/* Enhanced touch targets for mobile - consolidated above */

/* Responsive adjustments */
@media (max-width: 768px) {
  .role-based-sidebar {
    width: 280px; /* Full width on mobile */
    z-index: 1050; /* Higher z-index for mobile overlay */
    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3); /* Enhanced shadow for mobile */
  }

  .role-based-sidebar.visible {
    transform: translateX(0); /* Show on mobile when visible */
  }

  .role-based-sidebar:not(.visible) {
    transform: translateX(-100%); /* Hide when not visible */
  }

  /* Enhanced scrollbar for mobile */
  .sidebar-nav {
    max-height: calc(100vh - 180px); /* Adjust for mobile header/footer */
    padding: var(--space-sm) 0;
  }

  .sidebar-nav::-webkit-scrollbar {
    width: 6px; /* Slightly thinner on mobile */
  }

  .sidebar-nav::-webkit-scrollbar-thumb {
    min-height: 30px; /* Smaller minimum height on mobile */
  }

  /* Mobile-specific header adjustments */
  .sidebar-header {
    padding: var(--space-lg) var(--space-md);
    position: relative;
  }

  .sidebar-user {
    padding: 0 var(--space-md);
    margin-bottom: var(--space-lg);
  }

  /* Mobile navigation improvements */
  .nav-link {
    padding: var(--space-md) var(--space-md);
    min-height: 56px; /* Touch-friendly target */
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .nav-link:hover,
  .nav-link:focus {
    background-color: rgba(255, 255, 255, 0.15);
    transform: translateX(4px);
  }

  .nav-link.active {
    background-color: rgba(255, 255, 255, 0.25);
    border-right: 4px solid white;
    transform: translateX(4px);
  }

  .nav-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-text {
    flex: 1;
    min-width: 0; /* Allow text to shrink */
  }

  .nav-title {
    font-size: var(--font-size-base);
    font-weight: 500;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-description {
    font-size: var(--font-size-sm);
    opacity: 0.9;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@media (max-width: 480px) {
  .role-based-sidebar {
    width: 100vw; /* Full viewport width on very small screens */
    max-width: 320px; /* But not wider than 320px */
  }

  .sidebar-nav {
    max-height: calc(100vh - 160px); /* Further adjustment for small screens */
    padding: var(--space-xs) 0;
  }

  .sidebar-nav::-webkit-scrollbar {
    width: 4px; /* Even thinner on very small screens */
  }

  .sidebar-nav::-webkit-scrollbar-thumb {
    min-height: 20px;
  }

  .nav-link {
    padding: var(--space-md) var(--space-sm);
    min-height: 52px; /* Slightly smaller for very small screens */
  }

  .nav-icon {
    width: 28px;
    height: 28px;
  }

  .nav-title {
    font-size: var(--font-size-sm);
  }

  .nav-description {
    font-size: var(--font-size-xs);
    -webkit-line-clamp: 1; /* Single line on very small screens */
  }

  .sidebar-header {
    padding: var(--space-md) var(--space-sm);
  }

  .sidebar-user {
    padding: 0 var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .user-avatar {
    width: 40px;
    height: 40px;
  }

  .sidebar-title h6 {
    font-size: 1rem;
  }

  .sidebar-title small {
    font-size: 0.75rem;
  }
}

/* Landscape orientation adjustments */
@media (max-height: 600px) and (orientation: landscape) {
  .sidebar-nav {
    max-height: calc(100vh - 140px); /* Reduce height for landscape mode */
  }

  .nav-link {
    padding: var(--space-sm) var(--space-md);
  }

  .nav-title {
    font-size: var(--font-size-sm);
  }

  .nav-description {
    display: none; /* Hide descriptions in landscape mode */
  }
}

/* Tablet-specific adjustments */
@media (min-width: 769px) and (max-width: 1023px) {
  .role-based-sidebar {
    width: 260px;
  }

  .role-based-sidebar.collapsed {
    width: 75px;
  }

  .sidebar-nav {
    max-height: calc(100vh - 200px);
  }

  .nav-link {
    padding: var(--space-md) var(--space-lg);
  }

  .nav-icon {
    width: 28px;
    height: 28px;
  }
}

/* Large desktop adjustments */
@media (min-width: 1400px) {
  .role-based-sidebar {
    width: 320px;
  }

  .role-based-sidebar.collapsed {
    width: 90px;
  }

  .sidebar-nav {
    max-height: calc(100vh - 220px);
  }

  .nav-link {
    padding: var(--space-lg) var(--space-xl);
  }

  .nav-icon {
    width: 32px;
    height: 32px;
  }

  .nav-title {
    font-size: var(--font-size-lg);
  }

  .nav-description {
    font-size: var(--font-size-base);
  }
}
</style>
