<script setup>
/**
 * Admin's Medical Records View
 * Uses the shared MedicalRecordsView component with admin-specific configuration
 */
import MedicalRecordsView from "@/views/shared/MedicalRecordsView.vue";
</script>

<template>
  <MedicalRecordsView
    title="Medical Records Management"
    subtitle="Manage and oversee patient medical records"
    mode="admin"
  />
</template>
