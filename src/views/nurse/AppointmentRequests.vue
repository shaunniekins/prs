<script setup>
/**
 * Nurse's Appointment Requests View
 * Uses the shared AppointmentsView component with nurse-specific configuration
 */
import AppointmentsView from "@/views/shared/AppointmentsView.vue";
</script>

<template>
  <AppointmentsView
    title="Appointment Requests"
    subtitle="Manage patient appointment requests and scheduling"
    mode="nurse"
  />
</template>
