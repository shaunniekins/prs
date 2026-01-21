<script setup>
/**
 * Nurse Patient Management View
 * Uses the shared PatientManagement component with nurse-specific settings
 */
import PatientManagement from "../shared/PatientManagement.vue";
</script>

<template>
  <PatientManagement
    :show-vitals="true"
    :show-stats="true"
    page-title="Patient Management"
    page-subtitle="Manage patient information and care"
  />
</template>
