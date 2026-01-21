<script setup>
/**
 * Admin Manage Patients View
 * Uses the shared PatientManagement component with admin-specific settings
 */
import PatientManagement from "../shared/PatientManagement.vue";
</script>

<template>
  <PatientManagement
    :show-vitals="false"
    :show-stats="false"
    page-title="Manage Patients"
    page-subtitle="Manage patient records and information"
  />
</template>
