/**
 * Roles Seeder
 * Seeds the Role table with default roles
 * Run with: node src/supabase/seeders/seedRoles.js
 */

import { supabase } from "./config.js";

const roles = [
  { RoleName: "admin" },
  { RoleName: "nurse" },
  { RoleName: "patient" },
];

export async function seedRoles() {
  console.log("\n🛠  Seeding Roles...");

  try {
    const { error } = await supabase
      .from("Role")
      .upsert(roles, { onConflict: "RoleName" });

    if (error) {
      console.error("❌ Failed to insert roles:", error.message);
      return { success: false, error };
    }

    console.log(
      "✅ Roles seeded successfully:",
      roles.map((r) => r.RoleName).join(", "),
    );
    return { success: true, data: roles };
  } catch (error) {
    console.error("❌ Error seeding roles:", error.message);
    return { success: false, error };
  }
}

// Run standalone if called directly
const isMainModule = process.argv[1]?.endsWith("seedRoles.js");
if (isMainModule) {
  seedRoles()
    .then((result) => {
      if (result.success) {
        console.log("✨ Roles seeding completed!");
      } else {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
