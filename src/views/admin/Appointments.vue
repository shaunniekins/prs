<script setup>
/**
 * Admin's Appointments View
 * Uses the shared AppointmentsView component with admin-specific configuration
 */
import AppointmentsView from "@/views/shared/AppointmentsView.vue";
</script>

<template>
  <AppointmentsView
    title="Appointments Management"
    subtitle="Manage all patient appointments and scheduling"
    mode="admin"
  />
</template>
