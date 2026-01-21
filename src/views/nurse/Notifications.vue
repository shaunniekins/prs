<script setup>
/**
 * Nurse's Notifications View
 * Uses the shared NotificationsView component with nurse-specific configuration
 */
import NotificationsView from "@/views/shared/NotificationsView.vue";
</script>

<template>
  <NotificationsView
    title="Notifications"
    subtitle="View patient notifications"
    mode="nurse"
  />
</template>
