<template>
  <div v-if="show" class="logout-confirm-overlay" @click="cancel">
    <div class="logout-confirm-dialog" @click.stop>
      <div class="dialog-header">
        <i
          class="fas fa-sign-out-alt text-danger me-2"
          :class="{ 'fa-spin': isLoggingOut }"
        ></i>
        <h5 class="mb-0">
          {{ isLoggingOut ? "Logging Out..." : "Confirm Logout" }}
        </h5>
        <button
          type="button"
          class="btn-close"
          @click="cancel"
          :disabled="isLoggingOut"
          :aria-label="isLoggingOut ? 'Close (logout in progress)' : 'Close'"
        ></button>
      </div>

      <div class="dialog-body">
        <p class="mb-3">
          {{
            isLoggingOut
              ? "Please wait while we securely log you out..."
              : "Are you sure you want to log out?"
          }}
        </p>

        <!-- Error message display -->
        <div v-if="error" class="alert alert-danger py-2" role="alert">
          <small>
            <i class="fas fa-exclamation-triangle me-1"></i>
            {{ error }}
          </small>
        </div>

        <!-- Warning message (only show when not logging out and no error) -->
        <div v-else-if="!isLoggingOut" class="alert alert-warning py-2">
          <small>
            <i class="fas fa-info-circle me-1"></i>
            You will be redirected to the login page and all session data will
            be cleared for security.
          </small>
        </div>

        <!-- Retry information -->
        <div v-if="retryCount > 0" class="alert alert-info py-2">
          <small>
            <i class="fas fa-redo me-1"></i>
            Attempt {{ retryCount + 1 }} of {{ maxRetries + 1 }}
            {{
              isLoggingOut ? "(Retrying...)" : "(Click 'Try Again' to retry)"
            }}
          </small>
        </div>

        <!-- Loading progress indicator -->
        <div v-if="isLoggingOut" class="progress mt-3" style="height: 4px">
          <div
            class="progress-bar progress-bar-striped progress-bar-animated bg-danger"
            role="progressbar"
            style="width: 100%"
            aria-label="Logging out..."
          ></div>
        </div>
      </div>

      <div class="dialog-footer">
        <button
          type="button"
          class="btn btn-secondary me-2"
          @click="cancel"
          :disabled="isLoggingOut"
          :aria-label="
            isLoggingOut ? 'Cancel (logout in progress)' : 'Cancel logout'
          "
        >
          <i class="fas fa-times me-1"></i>
          Cancel
        </button>

        <button
          v-if="error && retryCount < maxRetries"
          type="button"
          class="btn btn-warning me-2"
          @click="retry"
          :disabled="isLoggingOut"
          aria-label="Try logout again"
        >
          <i class="fas fa-redo me-1"></i>
          Try Again
        </button>

        <button
          type="button"
          class="btn btn-danger"
          @click="confirm"
          :disabled="isLoggingOut"
          :aria-label="isLoggingOut ? 'Logging out...' : 'Confirm logout'"
        >
          <i v-if="isLoggingOut" class="fas fa-spinner fa-spin me-1"></i>
          <i v-else class="fas fa-sign-out-alt me-1"></i>
          {{ getButtonText() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from "vue";

export default {
  name: "LogoutConfirmDialog",
  emits: ["confirm", "cancel", "retry"],
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  setup(props, { emit }) {
    // Local state mirrors props for internal management
    const isLoggingOut = ref(props.loading);

    // Watch for prop changes
    watch(
      () => props.loading,
      (newVal) => {
        isLoggingOut.value = newVal;
      }
    );

    const open = () => {
      // Focus management for accessibility
      setTimeout(() => {
        const dialog = document.querySelector(".logout-confirm-dialog");
        if (dialog) {
          const firstButton = dialog.querySelector("button:not([disabled])");
          if (firstButton) firstButton.focus();
        }
      }, 100);
    };

    const close = () => {
      isLoggingOut.value = false;
    };

    const cancel = () => {
      if (isLoggingOut.value) return; // Prevent cancel during logout
      close();
      emit("cancel");
    };

    const confirm = async () => {
      if (isLoggingOut.value) return;

      isLoggingOut.value = true;
      emit("confirm");
    };

    const retry = () => {
      if (isLoggingOut.value) return;
      emit("retry");
    };

    const getButtonText = () => {
      if (isLoggingOut.value) return "Logging out...";
      return "Log Out";
    };

    // Handle escape key
    const handleKeydown = (event) => {
      if (event.key === "Escape" && props.show && !isLoggingOut.value) {
        cancel();
      }
    };

    // Add/remove event listener
    const addEventListeners = () => {
      document.addEventListener("keydown", handleKeydown);
    };

    const removeEventListeners = () => {
      document.removeEventListener("keydown", handleKeydown);
    };

    // Watch for show changes to manage event listeners
    watch(
      () => props.show,
      (newVal) => {
        if (newVal) {
          addEventListeners();
          open();
          // Prevent body scroll when dialog is open
          document.body.style.overflow = "hidden";
        } else {
          removeEventListeners();
          close();
          // Restore body scroll
          document.body.style.overflow = "";
        }
      }
    );

    // Watch for loading state changes to handle auto-close after successful logout
    watch(
      () => props.loading,
      (newVal, oldVal) => {
        // If loading just finished (oldVal was true, newVal is false)
        // and there's no error, it means logout was successful
        if (oldVal === true && newVal === false && !props.error) {
          // Emit cancel to close the dialog
          // The parent component should handle the actual closing
          setTimeout(() => {
            if (!props.error) {
              emit("cancel");
            }
          }, 100);
        }
      }
    );

    return {
      isLoggingOut,
      cancel,
      confirm,
      retry,
      getButtonText,
      addEventListeners,
      removeEventListeners,
    };
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.addEventListeners();
        // Prevent body scroll when dialog is open
        document.body.style.overflow = "hidden";
      } else {
        this.removeEventListeners();
        // Restore body scroll
        document.body.style.overflow = "";
      }
    },
  },
  beforeUnmount() {
    this.removeEventListeners();
    document.body.style.overflow = "";
  },
};
</script>

<style scoped>
.logout-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  backdrop-filter: blur(2px);
}

.logout-confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
  animation: fadeInScale 0.2s ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 1rem;
}

.dialog-header h5 {
  color: #dc3545;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.btn-close:hover {
  color: #495057;
  background-color: #f8f9fa;
}

.dialog-body {
  padding: 0 1.5rem;
}

.dialog-body p {
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1rem;
  line-height: 1.5;
}

.alert {
  border: none;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  background-color: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.btn {
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: none;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  transform: translateY(-1px);
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
  transform: translateY(-1px);
}

/* Responsive design */
@media (max-width: 480px) {
  .logout-confirm-dialog {
    width: 95%;
    margin: 1rem;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: 1rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .btn {
    width: 100%;
  }

  .dialog-footer .btn:first-child {
    margin-top: 0.5rem;
  }
}

/* Enhanced alert styles */
.alert-danger {
  border: none;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 8px;
  border-left: 4px solid #dc3545;
}

.alert-info {
  border: none;
  background-color: #d1ecf1;
  color: #0c5460;
  border-radius: 8px;
  border-left: 4px solid #17a2b8;
}

/* Progress bar styling */
.progress {
  border-radius: 2px;
  background-color: #e9ecef;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  background: linear-gradient(90deg, #dc3545, #c82333);
  transition: width 0.3s ease;
}

/* Enhanced button styles for retry */
.btn-warning {
  background-color: #ffc107;
  color: #212529;
  border: none;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 193, 7, 0.3);
}

.btn-warning:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.25);
}

/* Enhanced focus styles for accessibility */
.btn:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.btn-close:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* Disabled state enhancements */
.dialog-header .btn-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animation for error states */
.alert-danger {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Enhanced responsive design for new elements */
@media (max-width: 480px) {
  .alert {
    font-size: 0.875rem;
    padding: 0.5rem;
  }

  .progress {
    margin-top: 0.75rem;
  }

  .dialog-footer .btn {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}
</style>
