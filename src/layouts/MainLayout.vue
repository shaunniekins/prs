<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import RoleBasedSidebar from "../components/RoleBasedSidebar.vue";
import SidebarBackdrop from "../components/SidebarBackdrop.vue";

const route = useRoute();
const authStore = useAuthStore();
const isSidebarVisible = ref(true); // Default to visible for authenticated users
const isSidebarCollapsed = ref(false); // Default to not collapsed

// User authentication and profile data
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);

// Check if current route is login page or other auth pages
const hideSidebar = computed(() => {
  const authPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  return authPaths.includes(route.path);
});

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const handleSidebarToggle = (collapsed) => {
  isSidebarCollapsed.value = collapsed;
};

const toggleSidebarVisibility = () => {
  isSidebarVisible.value = !isSidebarVisible.value;
};

const closeSidebar = () => {
  isSidebarVisible.value = false;
};

// Focus management for better accessibility
const focusMainContent = () => {
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.focus();
  }
};

onMounted(() => {
  // Focus management for main content
  nextTick(() => {
    focusMainContent();
  });
});

// Watch for authentication state changes (simplified)
watch(isAuthenticated, (newVal) => {
  if (!newVal) {
    // User is no longer authenticated
    // Additional cleanup can be added here if needed
  }
});
</script>

<template>
  <div class="app-container">
    <!-- Sidebar backdrop - Only shown when sidebar is visible on mobile -->
    <SidebarBackdrop
      :show="isSidebarVisible && !hideSidebar"
      @close="closeSidebar"
    />

    <!-- Role-Based Sidebar Component - Hidden for login and register pages -->
    <RoleBasedSidebar
      v-if="!hideSidebar"
      :isCollapsed="isSidebarCollapsed"
      :isVisible="isSidebarVisible"
      @toggle="handleSidebarToggle"
      @close="closeSidebar"
    />

    <!-- Main content -->
    <div
      class="main-content"
      :class="{
        'sidebar-visible': isSidebarVisible && !hideSidebar,
        'has-collapsed-sidebar':
          isSidebarCollapsed && isSidebarVisible && !hideSidebar,
      }"
    >
      <!-- Top navbar with animation -->
      <nav class="navbar navbar-expand-lg navbar-light animate-fade-in-down">
        <div
          class="container-fluid d-flex justify-content-between align-items-center"
        >
          <!-- Left side: Menu button with hover animation -->
          <div>
            <!-- Only show menu button if not on login/register pages -->
            <button
              v-if="!hideSidebar"
              @click="toggleSidebarVisibility"
              class="btn btn-link border-0 menu-toggle-btn"
              title="Toggle menu"
              style="min-height: 48px; min-width: 48px; padding: 12px"
            >
              <i class="bi bi-list fs-4"></i>
            </button>
          </div>

          <!-- Center: App name with hover animation -->
          <div class="flex-center">
            <div class="system-title animate-fade-in">
              <i class="bi bi-hospital me-2 animate-pulse"></i>
              <span class="title-text">Patient Record System</span>
            </div>
          </div>
        </div>
      </nav>

      <main
        id="main-content"
        class="container-fluid px-4 py-3"
        role="main"
        tabindex="-1"
        @focus="focusMainContent"
      >
        <!-- Router view with animation -->
        <router-view v-slot="{ Component }">
          <transition name="page" appear>
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.main-content {
  min-height: calc(100vh - 56px); /* Subtract footer height */
  background: var(--background-color);
  transition: all 0.3s ease;
  flex: 1;
  margin-left: 0; /* No margin by default when sidebar is hidden */
}

.main-content.sidebar-visible {
  margin-left: 280px; /* Space for visible sidebar */
  transition: margin-left 0.3s ease; /* Smooth transition */
}

.main-content.sidebar-visible.has-collapsed-sidebar {
  margin-left: 80px; /* Space for collapsed sidebar */
}

/* Enhanced responsive design */
@media (max-width: 479px) {
  .main-content.sidebar-visible {
    margin-left: 0; /* No margin on mobile - overlay behavior */
  }

  .main-content.sidebar-visible.has-collapsed-sidebar {
    margin-left: 0; /* No margin on mobile even when collapsed */
  }

  .navbar {
    padding: var(--space-xs) var(--space-sm);
    min-height: 56px;
  }

  .system-title {
    font-size: var(--font-size-sm);
    padding: var(--space-xs) var(--space-sm);
  }

  .profile-section {
    gap: var(--space-xs);
  }

  .profile-picture-nav {
    padding: var(--space-xs) var(--space-sm);
  }

  .logout-btn {
    display: none;
    min-height: var(--touch-target-min, 44px);
    min-width: var(--touch-target-min, 44px);
    padding: var(--space-xs, 0.125rem) var(--space-sm, 0.5rem);
    font-size: var(--font-size-xs, 0.75rem);
    border-radius: 4px;
  }

  .logout-btn span:not(.spinner-border) {
    display: none; /* Hide text on very small screens, keep spinner visible */
  }

  .logout-btn .btn-content {
    gap: 0; /* Remove gap on very small screens */
  }

  .logout-btn:focus {
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.3);
  }

  .menu-toggle-btn {
    min-height: var(--touch-target-min);
    min-width: var(--touch-target-min);
    padding: var(--space-sm);
  }

  /* Mobile-first adjustments */
  .app-container {
    flex-direction: column;
  }

  .main-content {
    min-height: calc(100vh - 56px);
    padding: 0;
  }

  main {
    padding: var(--space-sm) var(--space-sm);
    min-height: calc(100vh - 120px);
  }

  .navbar .container-fluid {
    padding: 0 var(--space-sm);
  }

  .flex-center {
    justify-content: flex-start;
    margin-left: 60px; /* Space for menu button */
  }

  .system-title {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .title-text {
    font-size: var(--font-size-sm);
  }
}

/* Small devices (480px to 767px) */
@media (min-width: 480px) and (max-width: 767px) {
  .main-content.sidebar-visible {
    margin-left: 0; /* No margin on mobile - overlay behavior */
  }

  .main-content.sidebar-visible.has-collapsed-sidebar {
    margin-left: 0; /* No margin on mobile even when collapsed */
  }

  .navbar {
    padding: var(--space-sm) var(--space-md);
    min-height: 60px;
  }

  .system-title {
    font-size: var(--font-size-base);
    padding: var(--space-sm) var(--space-md);
  }

  .profile-section {
    gap: var(--space-sm);
  }

  .logout-btn {
    display: none;
    min-height: var(--touch-target-comfortable, 48px);
    padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
    font-size: var(--font-size-sm, 0.875rem);
    border-radius: 6px;
  }

  .logout-btn .btn-content {
    gap: var(--space-xs, 0.25rem);
  }

  /* Mobile-first adjustments */
  .main-content {
    min-height: calc(100vh - 60px);
  }

  main {
    padding: var(--space-md) var(--space-md);
    min-height: calc(100vh - 140px);
  }

  .navbar .container-fluid {
    padding: 0 var(--space-md);
  }

  .flex-center {
    justify-content: flex-start;
    margin-left: 64px; /* Space for menu button */
  }

  .system-title {
    margin: 0;
    font-size: var(--font-size-base);
  }

  .title-text {
    font-size: var(--font-size-base);
  }
}

main {
  min-height: calc(100vh - 170px); /* Subtract header and footer height */
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  main {
    min-height: calc(100vh - 120px); /* Adjust for mobile navbar */
    padding: var(--space-sm);
  }

  .container-fluid {
    padding-left: var(--space-sm);
    padding-right: var(--space-sm);
  }

  /* Ensure proper spacing for mobile content */
  .main-content {
    padding: 0;
  }

  /* Mobile navbar adjustments */
  .navbar {
    position: sticky;
    top: 0;
    z-index: 1020;
    background: var(--light-color);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  /* Mobile menu button positioning */
  .navbar .d-flex {
    width: 100%;
  }

  /* Center title on mobile */
  .flex-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    margin-left: 0;
  }

  .system-title {
    margin: 0;
  }

  /* Touch-friendly menu button */
  .menu-toggle-btn {
    position: relative;
    z-index: 1021;
  }
}

/* Enhanced focus styles for main content */
main:focus {
  outline: none;
}

/* Tablet responsive behavior (768px to 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-content.sidebar-visible {
    margin-left: 80px; /* Collapsed sidebar width on tablet */
  }

  .main-content.sidebar-visible.has-collapsed-sidebar {
    margin-left: 60px; /* Partially collapsed on tablet */
  }

  .navbar {
    padding: var(--space-sm) var(--space-md);
    min-height: 64px;
  }

  .system-title {
    font-size: var(--font-size-lg);
    padding: var(--space-sm) var(--space-md);
  }

  .profile-section {
    gap: var(--space-sm);
  }

  .profile-picture-nav {
    padding: var(--space-sm) var(--space-md);
  }

  .logout-btn {
    display: none;
    font-size: var(--font-size-sm, 0.875rem);
    padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
    border-radius: 6px;
    min-height: var(--touch-target-comfortable);
  }

  .logout-btn .btn-content {
    gap: var(--space-xs, 0.25rem);
  }
}

/* Desktop responsive behavior (1024px and up) */
@media (min-width: 1024px) {
  .main-content.sidebar-visible {
    margin-left: 280px; /* Full sidebar width on desktop */
  }

  .main-content.sidebar-visible.has-collapsed-sidebar {
    margin-left: 80px; /* Collapsed sidebar width on desktop */
  }

  .navbar {
    padding: var(--space-md) var(--space-lg);
    min-height: 72px;
  }

  .system-title {
    font-size: var(--font-size-xl);
    padding: var(--space-md) var(--space-lg);
  }

  .profile-section {
    gap: var(--space-md);
  }

  .profile-picture-nav {
    padding: var(--space-md) var(--space-lg);
  }

  .logout-btn {
    font-size: var(--font-size-base, 1rem);
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
    border-radius: 8px;
    min-height: var(--touch-target-comfortable);
  }

  .logout-btn .btn-content {
    gap: var(--space-sm, 0.5rem);
  }
}

.footer {
  background: linear-gradient(
    135deg,
    var(--secondary-gradient-start),
    var(--secondary-gradient-end)
  );
  color: white;
  width: 100%;
  z-index: 10;
}

/* Menu button styling */
.btn-link {
  color: var(--primary-gradient-start);
  min-height: var(--touch-target-min, 44px);
  min-width: var(--touch-target-min, 44px);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-link:hover {
  color: var(--primary-gradient-end);
}

.menu-toggle-btn {
  min-height: var(--touch-target-comfortable, 48px);
  min-width: var(--touch-target-comfortable, 48px);
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.menu-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}

.menu-toggle-btn:active {
  transform: scale(0.95);
}

.navbar {
  background-color: var(--light-color);
  color: var(--text-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition:
    background-color 0.3s,
    color 0.3s;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.navbar-brand {
  color: var(--text-color);
}

/* System title styling */
.system-title {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: linear-gradient(
    120deg,
    var(--primary-gradient-start) 0%,
    var(--primary-gradient-end) 100%
  );
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.system-title:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.system-title i {
  font-size: 1.25rem;
  color: white;
}

.title-text {
  font-weight: 600;
  font-size: 1.2rem;
  background: linear-gradient(to right, #ffffff, #f0f0f0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

/* Enhanced logout button styling */
.logout-btn {
  font-size: 0.875rem;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: var(--touch-target-comfortable, 48px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs, 0.25rem);
  position: relative;
  border: 2px solid var(--danger-color, #dc3545);
  background-color: transparent;
  color: var(--danger-color, #dc3545);
  font-weight: 500;
  letter-spacing: 0.025em;
}

.logout-btn:hover:not(:disabled):not(.loading) {
  background-color: var(--danger-color, #dc3545);
  border-color: var(--danger-color, #dc3545);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.logout-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
  border-color: var(--danger-color, #dc3545);
}

.logout-btn:active:not(:disabled):not(.loading) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
}

.logout-btn:disabled,
.logout-btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: var(--danger-color, #dc3545);
  color: white;
  border-color: var(--danger-color, #dc3545);
}

/* Loading spinner animation */
.logout-btn .spinning {
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

/* Button content layout */
.logout-btn .btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs, 0.25rem);
}
</style>
