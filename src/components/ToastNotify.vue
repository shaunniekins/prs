<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";

const props = defineProps({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "success", // success, error, warning, info
    validator: (value) =>
      ["success", "error", "warning", "info"].includes(value),
  },
  duration: {
    type: Number,
    default: 3000, // ms, 0 means it won't auto-close
  },
  showOkButton: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["closed"]);
const store = useStore();
const visible = ref(true);
let timer = null;

const close = () => {
  visible.value = false;
  emit("closed");
};

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close();
    }, props.duration);
  }
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <div
    v-if="visible"
    :class="['toast-notify', `toast-${type}`]"
    role="alert"
    :aria-live="type === 'error' ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    <div class="toast-message">
      {{ message }}
    </div>
    <button
      v-if="showOkButton"
      class="toast-ok-btn"
      @click="close"
      :aria-label="`Close ${type} notification: ${message}`"
    >
      OK
    </button>
  </div>
</template>

<style scoped>
.toast-notify {
  position: fixed;
  left: 50%;
  bottom: 30px;
  transform: translateX(-50%);
  min-width: 250px;
  max-width: 90%;
  background-color: #333;
  color: white;
  text-align: center;
  border-radius: 8px;
  padding: 16px 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  animation: slide-up 0.3s ease;
}

.toast-success {
  background-color: #2d7d3f;
}

.toast-error {
  background-color: #d9534f;
}

.toast-warning {
  background-color: #f0ad4e;
}

.toast-info {
  background-color: #5bc0de;
}

.toast-message {
  font-size: 1rem;
  font-weight: 500;
}

.toast-ok-btn {
  background-color: rgba(255, 255, 255, 0.85);
  color: #333;
  border: none;
  padding: 8px 30px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 100px;
  min-height: 44px;
  font-size: 16px;
}

.toast-ok-btn:hover,
.toast-ok-btn:focus {
  background-color: white;
  transform: translateY(-2px);
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

/* Enhanced mobile responsiveness */
@media (max-width: 768px) {
  .toast-notify {
    left: var(--space-sm);
    right: var(--space-sm);
    transform: none;
    bottom: var(--space-lg);
    max-width: calc(100vw - var(--space-md));
    padding: var(--space-lg);
    font-size: var(--font-size-sm);
  }

  .toast-message {
    font-size: var(--font-size-sm);
    text-align: left;
    margin-bottom: var(--space-md);
  }

  .toast-ok-btn {
    align-self: stretch;
    padding: var(--space-md) var(--space-xl);
    font-size: var(--font-size-base);
    min-height: var(--touch-target-comfortable);
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .toast-notify {
    left: var(--space-xs);
    right: var(--space-xs);
    bottom: var(--space-md);
    padding: var(--space-md);
  }

  .toast-message {
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-sm);
  }

  .toast-ok-btn {
    padding: var(--space-sm) var(--space-lg);
    min-height: var(--touch-target-min);
  }
}

/* Tablet adjustments */
@media (min-width: 769px) and (max-width: 1023px) {
  .toast-notify {
    max-width: 400px;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Large screens */
@media (min-width: 1200px) {
  .toast-notify {
    max-width: 500px;
    padding: var(--space-xl);
  }

  .toast-message {
    font-size: var(--font-size-lg);
  }

  .toast-ok-btn {
    padding: var(--space-lg) var(--space-xxl);
    font-size: var(--font-size-lg);
  }
}

@keyframes slide-up {
  from {
    transform: translate(-50%, 20px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
