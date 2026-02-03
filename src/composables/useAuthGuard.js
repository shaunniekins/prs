/**
 * useAuthGuard composable
 *
 * Provides robust authentication initialization and guarding for views.
 * Handles the timing issues that can occur when Supabase is restoring
 * the session from localStorage, especially in deployed environments.
 */
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";

export function useAuthGuard() {
  const authStore = useAuthStore();
  const isReady = ref(false);
  const authError = ref(null);

  /**
   * Wait for authentication to be fully initialized.
   * This handles the race condition where the Supabase session
   * may not be fully restored from localStorage when the page loads.
   *
   * @param {Object} options - Configuration options
   * @param {number} options.maxAttempts - Maximum number of retry attempts (default: 10)
   * @param {number} options.delayMs - Initial delay in milliseconds (default: 100)
   * @param {boolean} options.requireAuth - Whether to require authentication (default: true)
   * @param {string[]} options.allowedRoles - Array of allowed roles (optional)
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  const waitForAuth = async (options = {}) => {
    const {
      maxAttempts = 10,
      delayMs = 100,
      requireAuth = true,
      allowedRoles = null,
    } = options;

    isReady.value = false;
    authError.value = null;

    try {
      // Small initial delay to allow session restoration to begin
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      let attempts = 0;

      while (attempts < maxAttempts) {
        // Initialize auth if not already done
        if (!authStore.isInitialized) {
          await authStore.initializeAuth(true);
        }

        // Check if we have a valid session
        if (authStore.isAuthenticated && authStore.user) {
          // If roles are specified, check if user has one of the allowed roles
          if (allowedRoles && allowedRoles.length > 0) {
            const userRole = authStore.userRole?.toLowerCase();
            const hasAllowedRole = allowedRoles.some(
              (role) => role.toLowerCase() === userRole,
            );
            if (!hasAllowedRole) {
              authError.value = `Access denied. Required role: ${allowedRoles.join(" or ")}`;
              return { success: false, error: authError.value };
            }
          }

          // Authentication successful
          isReady.value = true;
          return { success: true, error: null };
        }

        // If auth is not required and we've checked, we can proceed
        if (!requireAuth && authStore.isInitialized) {
          isReady.value = true;
          return { success: true, error: null };
        }

        // Wait before next attempt with exponential backoff (capped at 500ms)
        attempts++;
        if (attempts < maxAttempts) {
          const waitTime = Math.min(delayMs * attempts, 500);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      // If we've exhausted all attempts and auth is required
      if (requireAuth && !authStore.isAuthenticated) {
        authError.value = "Authentication required. Please log in again.";
        return { success: false, error: authError.value };
      }

      // If we get here, we've tried our best
      isReady.value = !requireAuth || authStore.isAuthenticated;
      return { success: isReady.value, error: authError.value };
    } catch (err) {
      console.error("❌ [useAuthGuard] Error during auth initialization:", err);
      authError.value = err.message || "Failed to initialize authentication";
      return { success: false, error: authError.value };
    }
  };

  /**
   * Wait for admin access with proper timing handling
   */
  const waitForAdminAccess = async () => {
    return waitForAuth({ allowedRoles: ["admin"] });
  };

  /**
   * Wait for nurse or admin access with proper timing handling
   */
  const waitForNurseAccess = async () => {
    return waitForAuth({ allowedRoles: ["nurse", "admin"] });
  };

  /**
   * Wait for patient access with proper timing handling
   */
  const waitForPatientAccess = async () => {
    return waitForAuth({ allowedRoles: ["patient"] });
  };

  /**
   * Wait for staff (nurse or admin) access with proper timing handling
   */
  const waitForStaffAccess = async () => {
    return waitForAuth({ allowedRoles: ["nurse", "admin"] });
  };

  /**
   * Wait for any authenticated user with proper timing handling
   */
  const waitForAuthenticated = async () => {
    return waitForAuth({ requireAuth: true });
  };

  return {
    isReady,
    authError,
    waitForAuth,
    waitForAdminAccess,
    waitForNurseAccess,
    waitForPatientAccess,
    waitForStaffAccess,
    waitForAuthenticated,
  };
}

export default useAuthGuard;
