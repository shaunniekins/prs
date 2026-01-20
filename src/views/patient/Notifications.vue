<script setup>
/**
 * Patient's Notifications View
 * Uses the shared NotificationsView component with patient-specific configuration
 */
import NotificationsView from "@/views/shared/NotificationsView.vue";
</script>

<template>
  <NotificationsView
    title="My Notifications"
    subtitle="Stay updated with your health reminders and appointments"
    mode="patient"
  />
</template>
