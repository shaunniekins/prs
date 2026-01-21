/**
 * Supabase Connection Test Utility
 * Run this to verify your Supabase connection is working
 */

import {
  supabase,
  checkConnection,
  TABLES,
  ROLES,
} from "../config/supabaseConfig.js";

/**
 * Test all aspects of the Supabase connection
 */
export const runConnectionTests = async () => {
  const results = {
    connection: { passed: false, message: "", latency: 0 },
    auth: { passed: false, message: "" },
    tables: { passed: false, message: "", tables: [] },
    roles: { passed: false, message: "", roles: [] },
  };

  console.log("🔍 Running Supabase connection tests...\n");

  // Test 1: Basic Connection
  console.log("1️⃣ Testing basic connection...");
  try {
    const connectionResult = await checkConnection();
    if (connectionResult.connected) {
      results.connection = {
        passed: true,
        message: `Connected successfully (${connectionResult.latency}ms)`,
        latency: connectionResult.latency,
      };
      console.log(`   ✅ ${results.connection.message}`);
    } else {
      results.connection = {
        passed: false,
        message: `Connection failed: ${connectionResult.error}`,
        latency: connectionResult.latency,
      };
      console.log(`   ❌ ${results.connection.message}`);
    }
  } catch (error) {
    results.connection = {
      passed: false,
      message: `Connection error: ${error.message}`,
      latency: 0,
    };
    console.log(`   ❌ ${results.connection.message}`);
  }

  // Test 2: Auth Status
  console.log("\n2️⃣ Testing auth status...");
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      results.auth = {
        passed: false,
        message: `Auth error: ${error.message}`,
      };
      console.log(`   ❌ ${results.auth.message}`);
    } else if (session) {
      results.auth = {
        passed: true,
        message: `Authenticated as: ${session.user.email}`,
      };
      console.log(`   ✅ ${results.auth.message}`);
    } else {
      results.auth = {
        passed: true,
        message: "Not authenticated (anonymous access working)",
      };
      console.log(`   ℹ️  ${results.auth.message}`);
    }
  } catch (error) {
    results.auth = {
      passed: false,
      message: `Auth check failed: ${error.message}`,
    };
    console.log(`   ❌ ${results.auth.message}`);
  }

  // Test 3: Tables Exist
  console.log("\n3️⃣ Testing table access...");
  const tablesToTest = Object.values(TABLES);
  const accessibleTables = [];

  for (const table of tablesToTest) {
    try {
      const { error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (!error || error.code === "PGRST116") {
        // PGRST116 means no rows found, but table exists
        accessibleTables.push(table);
      }
    } catch (e) {
      // Table might not be accessible due to RLS
    }
  }

  if (accessibleTables.length > 0) {
    results.tables = {
      passed: true,
      message: `${accessibleTables.length}/${tablesToTest.length} tables accessible`,
      tables: accessibleTables,
    };
    console.log(`   ✅ ${results.tables.message}`);
    console.log(`      Tables: ${accessibleTables.join(", ")}`);
  } else {
    results.tables = {
      passed: false,
      message: "No tables accessible (check RLS policies)",
      tables: [],
    };
    console.log(`   ❌ ${results.tables.message}`);
  }

  // Test 4: Roles Exist
  console.log("\n4️⃣ Testing roles...");
  try {
    const { data: roles, error } = await supabase
      .from("Role")
      .select("RoleName");

    if (error) {
      results.roles = {
        passed: false,
        message: `Could not fetch roles: ${error.message}`,
        roles: [],
      };
      console.log(`   ❌ ${results.roles.message}`);
    } else if (roles && roles.length > 0) {
      const roleNames = roles.map((r) => r.RoleName);
      const expectedRoles = Object.values(ROLES);
      const hasAllRoles = expectedRoles.every((r) => roleNames.includes(r));

      results.roles = {
        passed: hasAllRoles,
        message: hasAllRoles
          ? `All expected roles found: ${roleNames.join(", ")}`
          : `Missing roles. Found: ${roleNames.join(
              ", "
            )}. Expected: ${expectedRoles.join(", ")}`,
        roles: roleNames,
      };
      console.log(`   ${hasAllRoles ? "✅" : "⚠️"} ${results.roles.message}`);
    } else {
      results.roles = {
        passed: false,
        message: "No roles found in database",
        roles: [],
      };
      console.log(`   ❌ ${results.roles.message}`);
    }
  } catch (error) {
    results.roles = {
      passed: false,
      message: `Error checking roles: ${error.message}`,
      roles: [],
    };
    console.log(`   ❌ ${results.roles.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary:");
  const allPassed = Object.values(results).every((r) => r.passed);

  if (allPassed) {
    console.log("   ✅ All tests passed! Supabase is properly configured.");
  } else {
    console.log("   ⚠️  Some tests failed. Please check the issues above.");

    if (!results.connection.passed) {
      console.log("\n   💡 Connection issues:");
      console.log("      - Check VITE_SUPABASE_URL in your .env file");
      console.log(
        "      - Check VITE_SUPABASE_PUBLISHABLE_KEY in your .env file"
      );
      console.log("      - Verify your Supabase project is running");
    }

    if (!results.tables.passed) {
      console.log("\n   💡 Table issues:");
      console.log("      - Run complete-schema.sql in Supabase SQL Editor");
      console.log("      - Check RLS policies are correctly configured");
    }

    if (!results.roles.passed) {
      console.log("\n   💡 Role issues:");
      console.log("      - Run setup-verification.sql to seed roles");
    }
  }
  console.log("=".repeat(50));

  return results;
};

/**
 * Quick health check
 */
export const healthCheck = async () => {
  const result = await checkConnection();
  return {
    healthy: result.connected,
    latency: result.latency,
    error: result.error,
  };
};

export default { runConnectionTests, healthCheck };
