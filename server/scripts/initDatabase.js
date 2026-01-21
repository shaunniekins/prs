import initializeDatabase from "../utils/databaseInit.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("🚀 Starting database initialization...\n");

initializeDatabase()
  .then((success) => {
    if (success) {
      console.log("\n✅ Database initialization completed successfully!");
      console.log("You can now start the server with: npm run dev");
    } else {
      console.log("\n❌ Database initialization failed!");
      console.log("Please check the error messages above and try again.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\n💥 Database initialization error:", error);
    process.exit(1);
  });
