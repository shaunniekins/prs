import { createRouter, createWebHistory } from "vue-router";
import { adminRoutes } from "./admin";
import { nurseRoutes } from "./nurse";
import { patientRoutes } from "./patient";
import Login from "../views/Login.vue";
import { useAuthStore } from "../stores/auth.js";
import { useAuth } from "../composables/useAuth.js";

// Combine all routes
const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { requiresAuth: false },
  },
  // Spread all role-based routes
  ...adminRoutes,
  ...nurseRoutes,
  ...patientRoutes,
  // Catch-all route for 404
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
    meta: { requiresAuth: false },
  },
];

// Role-based route guards
const getDefaultRouteForRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "nurse":
      return "/nurse";
    case "patient":
      return "/patient";
    default:
      return "/login";
  }
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guards - Simplified and fixed
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  try {
    // Initialize auth if not already done
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    const isAuthenticated = authStore.isAuthenticated;
    const userRole = authStore.userRole;

    // Handle admin routes with specific guard
    if (to.path.startsWith("/admin")) {
      const { adminRouteGuard } = useAuth();
      return adminRouteGuard(to, from, next);
    }

    // Redirect unauthenticated users to login (except for public routes)
    if (to.meta.requiresAuth && !isAuthenticated) {
      next("/login");
      return;
    }

    // Redirect authenticated users away from login page, but allow during logout
    if (to.path === "/login" && isAuthenticated) {
      // Check if this is a logout navigation by checking if we're being forced to login
      const isLogoutNavigation =
        !authStore.user || !userRole || userRole === "guest";
      if (!isLogoutNavigation) {
        // Redirect to default route for role
        const defaultRoute = getDefaultRouteForRole(userRole);
        next(defaultRoute);
        return;
      }
      // Allow navigation to login if user is logging out
    }

    // Check role-based access for protected routes
    if (to.meta.requiresAuth && to.meta.role && to.meta.role !== userRole) {
      if (userRole && ["admin", "nurse", "patient"].includes(userRole)) {
        next(getDefaultRouteForRole(userRole));
        return;
      } else {
        next("/login");
        return;
      }
    }

    // No need to store last visited path

    next();
  } catch (error) {
    console.error("Router guard error:", error);
    next("/login");
  }
});

// Helper function to validate if a path is accessible for a role
const isValidRolePath = (path, role) => {
  const validPaths = {
    admin: ["/admin"],
    nurse: ["/nurse"],
    patient: ["/patient"],
  };

  const rolePaths = validPaths[role] || [];
  return rolePaths.some((validPath) => path.startsWith(validPath));
};

// Simplified role-based route validation
const validateRoleAccess = (userRole, requiredRole) => {
  if (!requiredRole) return true;
  return userRole === requiredRole;
};

// After navigation guard - no additional context management needed

// Simplified page refresh handling
const handlePageRefresh = () => {
  try {
    const authStore = useAuthStore();

    // Only handle refresh if we're on a protected route and auth is not initialized
    if (window.location.pathname !== "/login" && !authStore.isInitialized) {
      authStore
        .initializeAuth()
        .then(() => {
          if (authStore.isAuthenticated) {
            const userRole = authStore.userRole;
            const currentPath = window.location.pathname;

            // No intended destination handling needed

            // If current path is valid for user role, stay there
            if (currentPath.startsWith(`/${userRole}`)) {
              return;
            }

            // Otherwise redirect to appropriate role path
            const defaultPath = getDefaultRouteForRole(userRole);
            router.push(defaultPath);
          }
        })
        .catch((error) => {
          console.error("❌ Auth initialization failed on refresh:", error);
          router.push("/login");
        });
    }
  } catch (error) {
    // Simple deferral - just wait for next tick
    setTimeout(handlePageRefresh, 100);
  }
};

// Initialize page refresh handling
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handlePageRefresh);
} else {
  handlePageRefresh();
}

export default router;
