// Authentication debugging utility
export const authDebugger = {
  // Check authentication state
  checkAuthState: (authStore) => {
    console.group("🔍 Authentication State Debug");
    console.log("isAuthenticated:", authStore.isAuthenticated.value);
    console.log("userRole:", authStore.userRole.value);
    console.log("loading:", authStore.loading.value);
    console.log("error:", authStore.error.value);
    console.log("user:", authStore.user.value);
    console.log("supabaseUser:", authStore.supabaseUser.value);
    console.log(
      "localStorage isAuthenticated:",
      localStorage.getItem("isAuthenticated")
    );
    console.log("localStorage userRole:", localStorage.getItem("userRole"));
    console.groupEnd();
  },

  // Check Supabase configuration
  checkSupabaseConfig: () => {
    console.group("🔧 Supabase Configuration Debug");
    console.log(
      "VITE_SUPABASE_URL:",
      import.meta.env.VITE_SUPABASE_URL ? "Set" : "Not set"
    );
    console.log(
      "VITE_SUPABASE_PUBLISHABLE_KEY:",
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        ? `Set (starts with: ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.substring(
            0,
            15
          )}...)`
        : "Not set"
    );

    if (import.meta.env.VITE_SUPABASE_URL) {
      console.log(
        "URL format valid:",
        import.meta.env.VITE_SUPABASE_URL.includes("supabase.co")
      );
    }

    if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      console.log(
        "Key format valid:",
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith(
          "sb_publishable_"
        )
      );
    }
    console.groupEnd();
  },

  // Test database connection
  testDatabaseConnection: async (supabase) => {
    console.group("🗄️ Database Connection Test");
    try {
      const { data, error } = await supabase
        .from("Users")
        .select("count", { count: "exact", head: true });

      if (error) {
        console.error("❌ Database connection failed:", error);
        console.groupEnd();
        return false;
      }

      console.log("✅ Database connection successful");
      console.log("Users table accessible");
      console.groupEnd();
      return true;
    } catch (err) {
      console.error("❌ Database connection error:", err);
      console.groupEnd();
      return false;
    }
  },

  // Test authentication service
  testAuthService: async (supabase) => {
    console.group("🔐 Authentication Service Test");
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Auth service error:", error);
        console.groupEnd();
        return false;
      }

      console.log("✅ Auth service accessible");
      console.log("Session exists:", !!session);
      if (session) {
        console.log("Session user:", session.user.id);
        console.log("Session expires:", new Date(session.expires_at * 1000));
      }
      console.groupEnd();
      return true;
    } catch (err) {
      console.error("❌ Auth service test error:", err);
      console.groupEnd();
      return false;
    }
  },

  // Run all diagnostic tests
  runDiagnostics: async (authStore, supabase) => {
    console.group("🚀 Running Authentication Diagnostics");

    this.checkSupabaseConfig();
    this.checkAuthState(authStore);

    const dbConnection = await this.testDatabaseConnection(supabase);
    const authService = await this.testAuthService(supabase);

    console.log("📊 Diagnostics Summary:");
    console.log("Database Connection:", dbConnection ? "✅ OK" : "❌ FAILED");
    console.log("Auth Service:", authService ? "✅ OK" : "❌ FAILED");
    console.log(
      "Auth Store State:",
      authStore.isAuthenticated.value ? "✅ OK" : "❌ NOT AUTHENTICATED"
    );

    console.groupEnd();

    return {
      databaseConnection: dbConnection,
      authService: authService,
      isAuthenticated: authStore.isAuthenticated.value,
      overall: dbConnection && authService && authStore.isAuthenticated.value,
    };
  },
};

export default authDebugger;
