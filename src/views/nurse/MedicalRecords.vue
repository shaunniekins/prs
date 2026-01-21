<script setup>
/**
 * Nurse's Medical Records View
 * Uses the shared MedicalRecordsView component with nurse-specific configuration
 */
import MedicalRecordsView from "@/views/shared/MedicalRecordsView.vue";
</script>

<template>
  <MedicalRecordsView
    title="Medical Records"
    subtitle="Create and manage patient medical records"
    mode="nurse"
  />
</template>
