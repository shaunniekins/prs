import DatabaseService from "../services/databaseService.js";
import { testConnection, initializeTables } from "../config/database.js";

export const initializeDatabase = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error("Failed to connect to Supabase");
    }

    // Check if tables exist and provide guidance if not
    const tablesReady = await initializeTables();
    if (!tablesReady) {
      return false;
    }

    // Seed default roles if they don't exist
    const existingRoles = await DatabaseService.getRoles();
    if (existingRoles.length === 0) {
      await DatabaseService.createRole({ RoleName: "admin" });
      await DatabaseService.createRole({ RoleName: "nurse" });
      await DatabaseService.createRole({ RoleName: "patient" });
      console.log("✅ Default roles seeded successfully");
    } else {
      console.log("✅ Default roles already exist");
    }

    // User creation removed - users should be created through proper registration process
    try {
      const existingUsers = await DatabaseService.getUsers();
      if (existingUsers.length === 0) {
        console.log(
          "ℹ️ No users found - users should be created through proper registration process"
        );
      } else {
        console.log("✅ Users already exist");
      }
    } catch (error) {
      console.error("Error during user check:", error);
      // Continue with initialization even if user check fails
    }

    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
};

export default initializeDatabase;
