import { ref, computed } from "vue";
import { useAuthStore } from "../stores/auth.js";
import { supabase } from "../services/supabaseService.js";
import router from "../router";

// Helper function to get default route for role (imported from router)
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

export const useAuth = () => {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref(null);

  // State from auth store
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const user = computed(() => authStore.user);
  const userRole = computed(() => authStore.userRole);
  const supabaseUser = computed(() => authStore.supabaseUser);

  // Role helpers
  const isAdmin = computed(() => authStore.isAdmin);
  const isNurse = computed(() => authStore.isNurse);
  const isPatient = computed(() => authStore.isPatient);

  // Error handler
  const handleError = (err) => {
    console.error("Auth operation error:", err);
    error.value = err.message || "Authentication error occurred";
    return null;
  };

  // Loading wrapper
  const withLoading = async (operation) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await operation();
      return result;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Authentication operations
  const login = async (credentials) => {
    return withLoading(async () => {
      const result = await authStore.login(credentials);
      if (!result.success) {
        throw new Error(result.error || "Login failed");
      }
      return result;
    });
  };

  const logout = async () => {
    return withLoading(async () => {
      // Use the auth store's logout method for comprehensive cleanup
      await authStore.logout();
      return true;
    });
  };

  const updateProfile = async (profileData) => {
    return withLoading(async () => {
      const result = await authStore.updateProfile(profileData);
      if (!result.success) {
        throw new Error(result.error || "Profile update failed");
      }
      return result;
    });
  };

  // Session management
  const refreshSession = async () => {
    return withLoading(async () => {
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          return data;
        } catch (error) {
          // Check if it's an invalid refresh token error
          const isInvalidTokenError =
            error.message?.includes("Invalid Refresh Token") ||
            error.message?.includes("Refresh Token Not Found") ||
            error.message?.includes("invalid_grant");

          if (isInvalidTokenError) {
            console.warn(
              "Invalid refresh token detected, attempting silent re-authentication"
            );

            // Clear invalid tokens from localStorage
            try {
              // Clear Supabase auth tokens
              localStorage.removeItem(
                "sb-" + supabase.supabaseKey + "-auth-token"
              );
              // Also clear any other potential auth-related localStorage keys
              Object.keys(localStorage).forEach((key) => {
                if (key.startsWith("sb-") && key.includes("auth-token")) {
                  localStorage.removeItem(key);
                }
              });
            } catch (clearError) {
              console.warn("Error clearing localStorage tokens:", clearError);
            }

            // Instead of logging out, redirect to login for silent re-authentication
            // This allows the user to log back in without losing their current state
            try {
              await router.push("/login");
            } catch (navError) {
              console.warn("Navigation error during token refresh:", navError);
              window.location.href = "/login";
            }

            throw new Error(
              "Session needs refresh. Please log in again to continue."
            );
          }

          // Check if it's a network error that should be retried
          const isNetworkError =
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("NetworkError") ||
            error.message?.includes("ERR_NETWORK_CHANGED") ||
            (error.name === "TypeError" && error.message?.includes("fetch"));

          if (isNetworkError && attempt < maxRetries) {
            console.warn(
              `Network error during session refresh (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * attempt)
            ); // Exponential backoff
            continue;
          }

          // If not a network error or max retries reached, throw the error
          throw error;
        }
      }
    });
  };

  const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
  };

  // Password management
  const resetPassword = async (email) => {
    return withLoading(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return true;
    });
  };

  const updatePassword = async (newPassword) => {
    return withLoading(async () => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return true;
    });
  };

  // Email verification
  const resendVerification = async (email) => {
    return withLoading(async () => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      if (error) throw error;
      return true;
    });
  };

  // Role-based route guards
  const requireAuth = () => {
    if (!isAuthenticated.value) {
      throw new Error("Authentication required");
    }
  };

  const requireRole = (roles) => {
    requireAuth();
    if (!roles.includes(userRole.value)) {
      throw new Error(`Access denied. Required roles: ${roles.join(", ")}`);
    }
  };

  const canAccess = (allowedRoles) => {
    if (!isAuthenticated.value) return false;
    return allowedRoles.includes(userRole.value);
  };

  // Initialize auth on app start
  const initializeAuth = async () => {
    return withLoading(async () => {
      await authStore.initializeAuth();
      return true;
    });
  };

  // Admin-specific authentication methods
  const adminLogin = async (credentials) => {
    return withLoading(async () => {
      // Ensure credentials contain email format
      if (!credentials.email || !credentials.email.includes("@")) {
        throw new Error("Please provide a valid email address for admin login");
      }

      const result = await authStore.login(credentials);
      if (!result.success) {
        throw new Error(result.error || "Admin login failed");
      }

      // Verify admin role
      if (authStore.userRole !== "admin") {
        await authStore.logout();
        throw new Error("Access denied. Admin privileges required.");
      }

      return result;
    });
  };

  // Check if current user has admin access
  const requireAdminAccess = () => {
    if (!isAuthenticated.value) {
      throw new Error("Authentication required");
    }
    if (!isAdmin.value) {
      throw new Error("Admin access required");
    }
  };

  // Get admin dashboard redirect path
  const getAdminDashboardPath = () => {
    return "/admin";
  };

  // Admin route guard for navigation
  const adminRouteGuard = (to, from, next) => {
    try {
      // Check if user is authenticated and is admin
      if (!isAuthenticated.value) {
        next("/login");
        return;
      }

      if (!isAdmin.value) {
        // Redirect non-admin users to their appropriate dashboard
        next(getDefaultRouteForRole(userRole.value));
        return;
      }

      next();
    } catch (error) {
      console.error("Admin route guard error:", error);
      next("/login");
    }
  };

  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    isAuthenticated,
    user,
    userRole,
    supabaseUser,

    // Role checks
    isAdmin,
    isNurse,
    isPatient,

    // Authentication operations
    login,
    logout,
    updateProfile,

    // Session management
    refreshSession,
    getSession,
    initializeAuth,

    // Password management
    resetPassword,
    updatePassword,

    // Email verification
    resendVerification,

    // Access control
    requireAuth,
    requireRole,
    canAccess,

    // Admin-specific methods
    adminLogin,
    requireAdminAccess,
    getAdminDashboardPath,
    adminRouteGuard,
  };
};

export default useAuth;
