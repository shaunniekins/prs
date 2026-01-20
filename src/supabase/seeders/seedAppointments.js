/**
 * Appointments Seeder
 * Seeds the Appointment table with sample appointments
 * Run with: node src/supabase/seeders/seedAppointments.js
 */

import { supabase } from "./config.js";

/**
 * Seeds sample appointments
 */
export async function seedAppointments(patientIds = [], staffIds = []) {
  console.log("\n📅 Seeding Sample Appointments...");

  // If no patient IDs provided, fetch from database
  if (patientIds.length === 0) {
    const { data: patients } = await supabase
      .from("Patients")
      .select("PatientID")
      .limit(5);
    patientIds = patients?.map((p) => p.PatientID) || [];
  }

  // If no staff IDs provided, fetch from database
  if (staffIds.length === 0) {
    const { data: staff } = await supabase
      .from("Staff")
      .select("StaffID")
      .limit(2);
    staffIds = staff?.map((s) => s.StaffID) || [];
  }

  if (patientIds.length === 0) {
    console.log("   ⚠️ No patients found, skipping appointment seeding");
    return { success: false, error: "No patients found" };
  }

  // Sample appointments with various statuses and reasons
  const appointments = [
    // Completed appointments (past dates)
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "General consultation for headache and fever",
      Notes: "Patient responded well to treatment",
    },
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "Follow-up visit after medication",
      Notes: "Symptoms have improved",
    },
    {
      PatientID: patientIds[1] || patientIds[0],
      ScheduledBy: staffIds[1] || staffIds[0] || null,
      DateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "Annual physical check-up",
      Notes: "All vitals normal",
    },
    {
      PatientID: patientIds[1] || patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "Vaccination - Flu shot",
      Notes: "No adverse reactions",
    },
    // Confirmed appointments (future dates)
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Confirmed",
      Reason: "Routine checkup and blood test",
      Notes: "Patient requested lab work",
    },
    {
      PatientID: patientIds[1] || patientIds[0],
      ScheduledBy: staffIds[1] || staffIds[0] || null,
      DateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Confirmed",
      Reason: "Consultation for persistent cough",
      Notes: "",
    },
    // Pending appointments
    {
      PatientID: patientIds[0],
      ScheduledBy: null,
      DateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Pending",
      Reason: "Follow-up review for medication adjustment",
      Notes: "Patient requested appointment",
    },
    {
      PatientID: patientIds[1] || patientIds[0],
      ScheduledBy: null,
      DateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Pending",
      Reason: "Emergency dental pain consultation",
      Notes: "Urgent request",
    },
    // Cancelled appointment
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Cancelled",
      Reason: "Consultation visit",
      Notes: "Patient cancelled due to scheduling conflict",
    },
    // More appointments spread over the last few months
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "General check-up",
      Notes: "",
    },
    {
      PatientID: patientIds[1] || patientIds[0],
      ScheduledBy: staffIds[0] || null,
      DateTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "Blood test and lab work",
      Notes: "",
    },
    {
      PatientID: patientIds[0],
      ScheduledBy: staffIds[1] || staffIds[0] || null,
      DateTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      Status: "Completed",
      Reason: "Vaccination - COVID booster",
      Notes: "",
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const appointment of appointments) {
    const { error } = await supabase.from("Appointment").insert(appointment);

    if (error) {
      console.log(`   ❌ Failed to create appointment: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`   ✅ Created ${successCount} appointments`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed ${errorCount} appointments`);
  }

  return {
    success: errorCount === 0,
    created: successCount,
    failed: errorCount,
  };
}

// Run standalone if called directly
const isMainModule = process.argv[1]?.endsWith("seedAppointments.js");
if (isMainModule) {
  seedAppointments()
    .then((result) => {
      console.log("\n✨ Appointments seeding completed!");
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
