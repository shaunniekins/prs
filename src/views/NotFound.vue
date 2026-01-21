<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goHome = () => {
  // Redirect to login as default
  router.push("/login");
};
</script>

<template>
  <div
    class="not-found-page d-flex align-items-center justify-content-center min-vh-100"
  >
    <div class="text-center">
      <div class="error-icon mb-4">
        <i
          class="bi bi-exclamation-triangle text-warning fs-1 animate-pulse"
        ></i>
      </div>
      <h1 class="display-1 fw-bold text-primary mb-3">404</h1>
      <h2 class="mb-4">Page Not Found</h2>
      <p class="text-muted mb-4">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button class="btn btn-primary btn-lg" @click="goHome">
        <i class="bi bi-house me-2"></i>
        Go to Dashboard
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  color: white;
}

.error-icon {
  opacity: 0.8;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.animate-pulse {
  animation: pulse 2s infinite;
}
</style>
