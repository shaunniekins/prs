<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const closeBackdrop = () => {
  emit("close");
};
</script>

<template>
  <div v-if="show" class="sidebar-backdrop" @click="closeBackdrop"></div>
</template>

<style scoped>
.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.3s ease forwards;
}

/* Hide backdrop on larger screens - sidebar should stay open on desktop */
@media (min-width: 769px) {
  .sidebar-backdrop {
    display: none;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
