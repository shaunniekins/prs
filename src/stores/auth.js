import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "../services/supabaseService.js";
import router from "../router";

export const useAuthStore = defineStore("auth", () => {
  // State
  const isAuthenticated = ref(false);
  const user = ref(null);
  const userRole = ref("guest");
  const loading = ref(false);
  const error = ref(null);
  const supabaseUser = ref(null);
  const isInitialized = ref(false);
  // Session refresh timer disabled for persistent sessions
  // const sessionRefreshTimer = ref(null);

  // Getters
  const isAdmin = computed(() => userRole.value === "admin");
  const isNurse = computed(() => userRole.value === "nurse");
  const isPatient = computed(() => userRole.value === "patient");

  const fullName = computed(() => {
    if (!user.value) return "";
    return `${user.value.firstName || ""} ${user.value.surname || ""}`.trim();
  });

  // Helper function to validate email format
  const isEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  // Helper function to get email from username
  const getEmailFromUsername = async (username) => {
    try {
      // First try to find by username
      const { data, error } = await supabase
        .from("Users")
        .select("Email")
        .eq("Username", username)
        .single();

      if (error && error.code === "PGRST116") {
        // Username not found, check if input is actually an email
        if (isEmail(username)) {
          return { success: true, email: username };
        }
        return { success: false, error: "Username not found" };
      }

      if (error) {
        console.error("❌ Database error during username lookup:", error);
        throw error;
      }

      if (data && data.Email) {
        return { success: true, email: data.Email };
      }

      return { success: false, error: "Username not found" };
    } catch (error) {
      console.error("❌ Error looking up username:", error);
      return { success: false, error: "Error looking up username" };
    }
  };

  // Actions
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;

    // Security: Input sanitization
    const sanitizedEmail = sanitizeInput(credentials.email);
    const sanitizedPassword = credentials.password; // Don't sanitize password, just validate

    // Enhanced input validation with security checks
    if (!sanitizedEmail || !sanitizedPassword) {
      loading.value = false;
      error.value = "Please enter both email/username and password";
      return { success: false, error: error.value };
    }

    // Security: Rate limiting check
    if (isRateLimited(sanitizedEmail)) {
      loading.value = false;
      error.value =
        "Too many login attempts. Please wait 15 minutes before trying again.";
      return { success: false, error: error.value };
    }

    // Enhanced input validation
    if (sanitizedEmail.length < 3) {
      loading.value = false;
      error.value = "Email/username must be at least 3 characters";
      return { success: false, error: error.value };
    }

    if (sanitizedPassword.length < 6) {
      loading.value = false;
      error.value = "Password must be at least 6 characters";
      return { success: false, error: error.value };
    }

    // Security: Check for suspicious patterns
    if (sanitizedEmail.length > 254 || /[<>'"\\]/.test(sanitizedEmail)) {
      loading.value = false;
      error.value = "Invalid email format";
      recordLoginAttempt(sanitizedEmail);
      return { success: false, error: error.value };
    }

    try {
      let email = sanitizedEmail;
      let foundUserId = null;

      // Check if input is email or username with better error handling
      if (!isEmail(email)) {
        try {
          const { data: userRecord, error: lookupError } = await supabase
            .from("Users")
            .select("Email, UserID")
            .eq("Username", email)
            .single();

          if (lookupError) {
            console.error("❌ Username lookup error details:", {
              code: lookupError.code,
              message: lookupError.message,
              details: lookupError.details,
              hint: lookupError.hint,
            });
            if (lookupError.code === "PGRST116") {
              throw new Error(
                `Username "${email}" not found. Please check your spelling or try using your email address instead.`
              );
            } else {
              console.error("❌ Username lookup error:", lookupError);
              throw new Error(
                "Unable to verify username. Please try again or contact support if the issue persists."
              );
            }
          }

          if (!userRecord?.Email) {
            console.error(
              "❌ User record found but missing email:",
              userRecord
            );
            throw new Error(
              "User account found but email is missing. Please contact support."
            );
          }

          email = userRecord.Email;
          foundUserId = userRecord.UserID;
        } catch (usernameError) {
          console.error("❌ Username lookup process failed:", usernameError);
          // Re-throw with more context if it's already a user-friendly error
          if (
            usernameError.message.includes("not found") ||
            usernameError.message.includes("contact support")
          ) {
            throw usernameError;
          }
          // Otherwise, provide a generic error
          throw new Error("Username lookup failed. Please try again.");
        }
      }

      // Enhanced authentication with timeout and better error handling

      const authPromise = supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password,
      });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Authentication timeout. Please check your connection and try again."
              )
            ),
          15000
        )
      );

      const { data, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise,
      ]);

      if (authError) {
        console.error("❌ Supabase auth error:", authError);

        // Provide user-friendly error messages
        if (authError.message?.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email/username or password. Please check your credentials and try again."
          );
        } else if (authError.message?.includes("Email not confirmed")) {
          throw new Error(
            "Please verify your email address before logging in."
          );
        } else if (authError.message?.includes("Too many requests")) {
          throw new Error(
            "Too many login attempts. Please wait a few minutes before trying again."
          );
        } else {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      }

      if (!data?.user) {
        throw new Error(
          "Authentication succeeded but user data is missing. Please contact support."
        );
      }

      supabaseUser.value = data.user;

      // Enhanced role detection with multiple fallback attempts
      let userRoleResult;
      const maxRoleAttempts = 3;

      for (let attempt = 1; attempt <= maxRoleAttempts; attempt++) {
        try {
          userRoleResult = await getUserRole(foundUserId || data.user.id);
          break; // Success, exit retry loop
        } catch (roleError) {
          console.error(
            `❌ Role detection attempt ${attempt} failed:`,
            roleError
          );

          if (attempt === maxRoleAttempts) {
            // Final attempt failed
            if (roleError.message?.includes("not found")) {
              throw new Error(
                "User account found but role is not configured. Please contact your administrator."
              );
            } else {
              throw new Error(
                "Unable to determine your access level. Please contact support if this issue persists."
              );
            }
          }

          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 500)
          );
        }
      }

      // Validate role result
      if (
        !userRoleResult ||
        !["admin", "nurse", "patient"].includes(userRoleResult)
      ) {
        throw new Error(
          "Invalid user role detected. Please contact your administrator."
        );
      }

      // Get user data from Users table
      const { data: userData, error: userError } = await supabase
        .from("Users")
        .select("*")
        .eq("Email", data.user.email)
        .single();

      if (userError) {
        throw new Error(`User not found in Users table: ${userError.message}`);
      }

      user.value = {
        id: userData.UserID,
        authId: data.user.id, // Keep Supabase Auth UUID for reference
        email: data.user.email,
        firstName: userData.FirstName || "",
        surname: userData.Surname || "",
        fullName:
          `${userData.FirstName || ""} ${userData.Surname || ""}`.trim() ||
          userData.fullName ||
          data.user.email?.split("@")[0] ||
          "User",
      };

      userRole.value = userData.RoleName;
      isAuthenticated.value = true;
      isInitialized.value = true; // Mark as initialized to prevent router from calling initializeAuth again

      // Authentication data is now managed by Supabase sessions

      return {
        success: true,
        user: user.value,
        role: userRoleResult,
        message: `Welcome back, ${user.value.fullName}!`,
      };
    } catch (err) {
      console.error("❌ Login process failed:", err);

      // Security: Record failed login attempt for rate limiting
      recordLoginAttempt(sanitizedEmail);

      // Enhanced error categorization
      let userFriendlyError = err.message;

      if (err.message?.includes("network") || err.message?.includes("fetch")) {
        userFriendlyError =
          "Network error. Please check your connection and try again.";
      } else if (err.message?.includes("timeout")) {
        userFriendlyError = "Request timed out. Please try again.";
      } else if (!userFriendlyError || userFriendlyError === "Login failed") {
        userFriendlyError =
          "Login failed. Please check your credentials and try again.";
      }

      error.value = userFriendlyError;
      return {
        success: false,
        error: userFriendlyError,
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      };
    } finally {
      loading.value = false;
    }
  };

  // Helper function to get user role from Supabase
  const getUserRole = async (userId) => {
    try {
      // Find the user by auth user id or email
      let queryUserId = userId;

      // If userId is a UUID, find the corresponding UserID in Users table
      if (typeof userId === "string" && userId.includes("-")) {
        // This is a UUID, find the user by email using session data
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error(
            `Failed to get auth session: ${
              sessionError?.message || "Auth session missing!"
            }`
          );
        }
        const email = sessionData.session.user.email;

        const { data: userData, error: userError } = await supabase
          .from("Users")
          .select("UserID")
          .eq("Email", email)
          .single();

        if (userError) {
          throw new Error(`Failed to find user by email: ${userError.message}`);
        }

        queryUserId = userData.UserID;
      }

      const { data, error } = await supabase
        .from("Users")
        .select("RoleName")
        .eq("UserID", queryUserId)
        .single();

      if (error) {
        // Don't default to patient - let the calling code handle the error
        console.error("❌ Error fetching user role:", error);
        throw new Error(`Failed to fetch user role: ${error.message}`);
      }

      const roleName = data?.RoleName;
      if (!roleName) {
        console.error("❌ No role found for user:", userId);
        throw new Error("User role not found in database");
      }

      return roleName;
    } catch (error) {
      console.error("❌ Role detection failed:", error);
      throw error; // Re-throw to let calling code handle it
    }
  };

  const logout = async () => {
    try {
      // Call server-side logout for proper token cleanup
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": session.access_token,
            },
          });
        }
      } catch (serverLogoutError) {
        console.warn(
          "⚠️ Server-side logout failed, continuing with client cleanup:",
          serverLogoutError
        );
      }

      // Sign out from Supabase for comprehensive cleanup
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error("❌ Supabase sign out error:", signOutError);
        // Continue with local cleanup even if Supabase sign out fails
      }

      // Reset local state IMMEDIATELY to prevent race conditions
      isAuthenticated.value = false;
      user.value = null;
      userRole.value = "guest";
      supabaseUser.value = null;
      error.value = null;
      isInitialized.value = false;

      // Clear any cached data
      cache.clear();

      // Session cleanup handled by Supabase

      // Use Vue Router for proper navigation to login page
      // Add error handling for navigation with forced replacement
      try {
        // Use replace instead of push to avoid route duplication issues
        await router.replace("/login");
      } catch (navError) {
        console.error("❌ Navigation error:", navError);
        // Try direct window navigation as fallback
        if (
          navError.name === "NavigationDuplicated" ||
          navError.name === "Error"
        ) {
          window.location.href = "/login";
        } else {
          throw navError;
        }
      }
    } catch (error) {
      console.error("❌ Logout process error:", error);

      // Force navigation even if logout partially fails
      try {
        window.location.href = "/login";
      } catch (navError) {
        console.error("❌ Critical navigation error:", navError);
      }

      throw error; // Re-throw to let calling code handle it
    }
  };

  const initializeAuth = async (force = false) => {
    // Prevent multiple initialization attempts unless forced
    if (isInitialized.value && !force) {
      return { success: true, user: user.value };
    }

    loading.value = true;
    error.value = null;

    // Enhanced initialization states
    const initSteps = {
      checkingSession: "Checking existing session...",
      validatingSession: "Validating session...",
      refreshingSession: "Refreshing session...",
      gettingUserRole: "Loading user profile...",
      restoringFromStorage: "Restoring from local storage...",
      complete: "Authentication ready",
    };

    let currentStep = initSteps.checkingSession;

    try {
      // Step 1: Check for existing Supabase session
      currentStep = initSteps.checkingSession;

      let session, sessionError;

      try {
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session;
        sessionError = sessionResult.error;
      } catch (getSessionError) {
        console.error("❌ Error getting session:", getSessionError);

        // Handle network errors specifically
        const isNetworkError =
          getSessionError.message?.includes("Failed to fetch") ||
          getSessionError.message?.includes("NetworkError") ||
          getSessionError.message?.includes("ERR_NETWORK_CHANGED") ||
          (getSessionError.name === "TypeError" &&
            getSessionError.message?.includes("fetch"));

        if (isNetworkError) {
          // Don't clear session for network errors, just return success without session
          return { success: true };
        }

        // Handle invalid refresh token for persistent sessions
        if (
          getSessionError.message?.includes("Invalid Refresh Token") ||
          getSessionError.message?.includes("Refresh Token Not Found") ||
          getSessionError.message?.includes("invalid_grant")
        ) {
          console.warn(
            "Invalid refresh token detected during initialization, clearing session"
          );
          try {
            await supabase.auth.signOut();
            // Clear local storage to prevent further issues
            localStorage.removeItem(
              "sb-" + supabase.supabaseKey + "-auth-token"
            );
            // Also clear any other potential auth-related localStorage keys
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith("sb-") && key.includes("auth-token")) {
                localStorage.removeItem(key);
              }
            });
          } catch (signOutError) {
            console.warn(
              "⚠️ Sign out failed during invalid token cleanup:",
              signOutError
            );
          }
          return { success: true }; // Return success but no session
        }

        // For other session errors, continue without throwing
        sessionError = getSessionError;
      }

      if (sessionError) {
      }

      if (session?.user) {
        currentStep = initSteps.validatingSession;

        // Enhanced session validation for persistent sessions
        if (
          session.expires_at &&
          new Date(session.expires_at * 1000) <= new Date() &&
          !session.user?.user_metadata?.persistent
        ) {
          currentStep = initSteps.refreshingSession;

          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;

            if (refreshData.session) {
              session = refreshData.session;
              supabaseUser.value = refreshData.session.user;
            }
          } catch (refreshErr) {
            // Check if it's a network error that should be retried
            const isNetworkError =
              refreshErr.message?.includes("Failed to fetch") ||
              refreshErr.message?.includes("NetworkError") ||
              refreshErr.message?.includes("ERR_NETWORK_CHANGED") ||
              (refreshErr.name === "TypeError" &&
                refreshErr.message?.includes("fetch"));

            if (isNetworkError) {
              // For network errors, don't clear the session, just continue with existing session
              // The session will be retried later when network is restored
              return { success: true };
            }
            await supabase.auth.signOut();
            return await restoreFromLocalStorage();
          }
        } else if (
          session.expires_at &&
          new Date(session.expires_at * 1000) <= new Date()
        ) {
        }

        supabaseUser.value = session.user;
        currentStep = initSteps.gettingUserRole;

        // Enhanced role detection with better error handling
        // Also fetch UserID to ensure consistency with login flow
        let role;
        let databaseUserId;
        let userData;
        try {
          // Get user data by querying the Users table directly with the email from session
          // Use select("*") for consistency with login flow
          const { data: userDataResult, error: userError } = await supabase
            .from("Users")
            .select("*")
            .eq("Email", session.user.email)
            .single();

          if (userError) {
            console.error("❌ Error fetching user data:", userError);
            throw new Error(`Failed to fetch user data: ${userError.message}`);
          }

          userData = userDataResult;
          const roleName = userData?.RoleName;
          if (!roleName) {
            console.error("❌ No role found for user:", session.user.email);
            throw new Error("User role not found in database");
          }

          role = roleName;
          databaseUserId = userData?.UserID;

          if (!databaseUserId) {
            console.error("❌ No UserID found for user:", session.user.email);
            throw new Error("User ID not found in database");
          }

          // Enhanced user data with validation - use database UserID for consistency
          user.value = {
            id: databaseUserId, // Use database UserID, not Supabase Auth UUID
            authId: session.user.id, // Keep Supabase Auth UUID for reference
            email: session.user.email,
            firstName: userData.FirstName || "",
            surname: userData.Surname || "",
            fullName:
              `${userData.FirstName || ""} ${userData.Surname || ""}`.trim() ||
              userData.fullName ||
              session.user.email?.split("@")[0] ||
              "User",
          };
        } catch (roleError) {
          console.error(
            "❌ Role detection failed during initialization:",
            roleError
          );

          // Don't sign out immediately - this might be a temporary error
          // Only sign out if it's a clear permissions/access issue
          if (
            roleError.message?.includes("permission") ||
            roleError.message?.includes("denied") ||
            roleError.message?.includes("unauthorized")
          ) {
            await supabase.auth.signOut();
            throw new Error(
              "Access denied. Please contact support if you believe this is an error."
            );
          }

          // For other errors, log but don't sign out - the session might still be valid
          // Throw the error so the outer catch can handle it appropriately
          throw roleError;
        }

        userRole.value = role;
        isAuthenticated.value = true;

        // Authentication data is managed by Supabase sessions

        isInitialized.value = true;
        currentStep = initSteps.complete;

        return {
          success: true,
          user: user.value,
          role: role,
          step: currentStep,
        };
      } else {
        return { success: true };
      }
    } catch (err) {
      console.error("❌ Initialize auth error:", err);

      // Enhanced error handling with context
      let userFriendlyError = "Authentication initialization failed";

      if (
        err.message?.includes("network") ||
        err.message?.includes("fetch") ||
        err.message?.includes("ERR_NETWORK_CHANGED") ||
        err.name === "TypeError"
      ) {
        userFriendlyError =
          "Network error during authentication. Your session will be restored when connection is restored.";
        // For network errors, don't set error state - allow retry later
        return {
          success: true, // Return success to prevent logout
          networkError: true,
          step: currentStep,
        };
      } else if (err.message?.includes("timeout")) {
        userFriendlyError =
          "Authentication is taking longer than expected. Please try refreshing the page.";
      } else if (err.message?.includes("role")) {
        userFriendlyError = err.message; // Use specific role error messages
      } else if (err.message?.includes("session")) {
        userFriendlyError = "Session validation failed. Please log in again.";
      }

      error.value = userFriendlyError;

      return {
        success: false,
        error: userFriendlyError,
        step: currentStep,
      };
    } finally {
      loading.value = false;
    }
  };

  const scheduleSessionRefresh = (expiresAt) => {
    // Session refresh timer disabled for persistent sessions

    // Log persistent session activity for security monitoring
    const persistentSessionData = {
      action: "refresh_schedule_bypassed",
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      expiresAt: expiresAt?.toString(),
    };

    // Persistent session activity logging removed for security
  };

  // Security: Rate limiting for login attempts
  const loginAttempts = ref(new Map());
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  const isRateLimited = (identifier) => {
    const attempts = loginAttempts.value.get(identifier) || [];
    const now = Date.now();

    // Clean old attempts (older than lockout duration)
    const recentAttempts = attempts.filter(
      (time) => now - time < LOCKOUT_DURATION
    );

    if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
      return true;
    }

    loginAttempts.value.set(identifier, recentAttempts);
    return false;
  };

  const recordLoginAttempt = (identifier) => {
    const attempts = loginAttempts.value.get(identifier) || [];
    attempts.push(Date.now());
    loginAttempts.value.set(identifier, attempts);
  };

  // Security: Input sanitization
  const sanitizeInput = (input) => {
    if (typeof input !== "string") return "";
    return input.trim().replace(/[<>]/g, ""); // Remove potential XSS characters
  };

  // Security: Session validation (modified for persistent sessions)
  const validateSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) {
        return false;
      }

      // For persistent sessions, we don't enforce expiration but still validate session exists
      if (
        session.expires_at &&
        new Date(session.expires_at * 1000) <= new Date() &&
        !session.user?.user_metadata?.persistent
      ) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  };

  // Performance: Debounced authentication check
  let authCheckTimeout = null;
  const debouncedAuthCheck = (callback, delay = 300) => {
    if (authCheckTimeout) clearTimeout(authCheckTimeout);
    authCheckTimeout = setTimeout(callback, delay);
  };

  // Performance: Caching for expensive operations
  const cache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCached = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    cache.delete(key); // Remove expired cache
    return null;
  };

  const setCached = (key, data) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  // Performance: Lazy loading for user data
  const lazyLoadUserData = async (userId) => {
    const cacheKey = `userData_${userId}`;
    const cached = getCached(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await fetchUserData(userId);
      if (result.success) {
        setCached(cacheKey, result.user);
      }
      return result;
    } catch (error) {
      console.error("❌ Lazy load user data failed:", error);
      throw error;
    }
  };

  // Performance: Preload critical resources
  const preloadCriticalResources = () => {
    // Preload common routes and components
    const criticalRoutes = ["/admin", "/nurse", "/patient"];

    criticalRoutes.forEach((route) => {
      // Use requestIdleCallback for non-blocking preload
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          // Preload route components
        });
      }
    });
  };

  // Performance: Memory cleanup
  const cleanup = () => {
    // Clear expired cache entries
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        cache.delete(key);
      }
    }

    // Clear any lingering timers
    if (authCheckTimeout) {
      clearTimeout(authCheckTimeout);
      authCheckTimeout = null;
    }
  };

  // Performance: Optimize role checking
  const optimizedRoleCheck = (userRole, allowedRoles) => {
    // Use Set for O(1) lookup instead of array.includes()
    const allowedSet = new Set(allowedRoles);
    return allowedSet.has(userRole);
  };

  const fetchUserData = async (userId) => {
    loading.value = true;
    error.value = null;
    try {
      // Replace with actual API call to fetch user data
      // For now, simulating API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock API response - replace with actual API call
      const userData = {
        id: userId,
        firstName: "John",
        surname: "Doe",
        email: "john.doe@example.com",
        role: userRole.value,
        // Add other user profile fields as needed
      };

      user.value = { ...user.value, ...userData };

      return { success: true, user: user.value };
    } catch (err) {
      error.value = err.message || "Failed to fetch user data";
      console.error("Fetch user data error:", err);
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async (profileData) => {
    loading.value = true;
    error.value = null;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update user data
      user.value = { ...user.value, ...profileData };

      return { success: true };
    } catch (err) {
      error.value = err.message || "Failed to update profile";
      console.error("Profile update error:", err);
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    isAuthenticated,
    user,
    userRole,
    supabaseUser,
    loading,
    error,
    isInitialized,
    // sessionRefreshTimer, // Disabled for persistent sessions

    // Getters
    isAdmin,
    isNurse,
    isPatient,
    fullName,

    // Helper functions
    isEmail,
    getEmailFromUsername,

    // Actions
    login,
    logout,
    initializeAuth,
    updateProfile,
    fetchUserData,
    clearError,
    getUserRole,
    scheduleSessionRefresh,

    // Security functions
    isRateLimited,
    recordLoginAttempt,
    sanitizeInput,
    validateSession,

    // Performance functions
    debouncedAuthCheck,
    lazyLoadUserData,
    preloadCriticalResources,
    cleanup,
    optimizedRoleCheck,
  };
});
