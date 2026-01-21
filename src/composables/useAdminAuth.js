import { computed, onMounted } from "vue";
import { useAuth } from "./useAuth.js";
import { useRouter } from "vue-router";

export const useAdminAuth = () => {
  const {
    isAuthenticated,
    isAdmin,
    user,
    requireAdminAccess,
    getAdminDashboardPath,
  } = useAuth();
  const router = useRouter();

  // Admin-specific computed properties
  const isAdminUser = computed(() => isAuthenticated.value && isAdmin.value);
  const adminUser = computed(() => (isAdminUser.value ? user.value : null));

  // Check admin access and redirect if necessary
  const ensureAdminAccess = () => {
    try {
      requireAdminAccess();
      return true;
    } catch (error) {
      console.warn("Admin access denied:", error.message);
      router.push("/login");
      return false;
    }
  };

  // Redirect to admin dashboard
  const redirectToAdminDashboard = () => {
    router.push(getAdminDashboardPath());
  };

  // Check if current user can access admin features
  const canAccessAdmin = computed(() => {
    return isAuthenticated.value && isAdmin.value;
  });

  // Initialize admin auth check on component mount
  const initializeAdminAuth = () => {
    onMounted(() => {
      if (isAuthenticated.value && !isAdmin.value) {
        console.warn("Non-admin user attempting to access admin area");
        router.push("/login");
      }
    });
  };

  // Admin logout with redirect
  const adminLogout = async () => {
    try {
      const { logout } = useAuth();
      await logout();
      router.push("/login");
      return true;
    } catch (error) {
      console.error("Admin logout error:", error);
      return false;
    }
  };

  return {
    // State
    isAdminUser,
    adminUser,
    canAccessAdmin,

    // Methods
    ensureAdminAccess,
    redirectToAdminDashboard,
    initializeAdminAuth,
    adminLogout,
  };
};

export default useAdminAuth;
