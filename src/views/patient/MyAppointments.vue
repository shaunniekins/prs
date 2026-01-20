<script setup>
/**
 * Patient's My Appointments View
 * Uses the shared AppointmentsView component with patient-specific configuration
 */
import AppointmentsView from "@/views/shared/AppointmentsView.vue";
</script>

<template>
  <AppointmentsView
    title="My Appointments"
    subtitle="View and manage your medical appointments"
    mode="patient"
  />
</template>
