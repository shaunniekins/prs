<script setup>
/**
 * Admin's Notifications View
 * Uses the shared NotificationsView component with admin-specific configuration
 */
import NotificationsView from "@/views/shared/NotificationsView.vue";
</script>

<template>
  <NotificationsView
    title="Notifications Management"
    subtitle="Manage system notifications and alerts"
    mode="admin"
  />
</template>
