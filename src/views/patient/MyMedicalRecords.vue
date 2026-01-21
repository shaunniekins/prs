<script setup>
/**
 * Patient's My Medical Records View
 * Uses the shared MedicalRecordsView component with patient-specific configuration
 */
import MedicalRecordsView from "@/views/shared/MedicalRecordsView.vue";
</script>

<template>
  <MedicalRecordsView
    title="My Medical Records"
    subtitle="View and download your medical records and health information"
    mode="patient"
  />
</template>
