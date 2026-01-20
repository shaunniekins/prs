/**
 * Main Seeder Script
 * Run with: node src/supabase/seeders/seed.js
 *
 * This script orchestrates all seeders to populate the database with test data.
 * Individual seeders can also be run separately.
 */

import { SUPABASE_URL, DEFAULT_PASSWORD } from "./config.js";
import { seedRoles } from "./seedRoles.js";
import { seedAllUsers, usersToSeed } from "./seedUsers.js";
import { seedAppointments } from "./seedAppointments.js";

async function main() {
  console.log("🌱 Starting Database Seeder...");
  console.log("=".repeat(50));
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Default password: ${DEFAULT_PASSWORD}`);
  console.log("=".repeat(50));

  // Step 1: Seed Roles
  const rolesResult = await seedRoles();
  if (!rolesResult.success) {
    console.error("❌ Failed to seed roles, aborting...");
    process.exit(1);
  }

  // Step 2: Seed Users (including Staff and Patients)
  const userResults = await seedAllUsers();

  // Step 3: Seed Appointments
  const patientIds = userResults
    .filter((r) => r.success && r.patientId)
    .map((r) => r.patientId);

  await seedAppointments(patientIds);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Seeding Summary:");
  console.log("=".repeat(50));

  const successful = userResults.filter((r) => r.success);
  const failed = userResults.filter((r) => !r.success);

  console.log(`   ✅ Users Created/Updated: ${successful.length}`);
  console.log(`   ❌ Users Failed: ${failed.length}`);

  console.log("\n📋 Test Credentials:");
  console.log("-".repeat(50));
  for (const user of usersToSeed) {
    console.log(
      `   ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | ${DEFAULT_PASSWORD}`,
    );
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed users:");
    for (const f of failed) {
      console.log(`   - ${f.email}: ${f.error}`);
    }
  }

  console.log("\n✨ Done!");
}

main().catch(console.error);
