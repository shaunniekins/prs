/**
 * Global error handling utilities for the healthcare management system
 * Provides comprehensive error handling with user-friendly messages and logging
 */

// Import notification utilities
import {
  showToast,
  handleSupabaseError,
  handleAuthError,
  handleNetworkError,
  handleValidationError,
} from "./notificationUtils.js";

/**
 * Global error handler for Vue errors
 * @param {Error} error - The error object
 * @param {Object} instance - Vue instance
 * @param {string} info - Error info
 */
export const handleVueError = (error, instance, info) => {
  console.error("Vue Error:", error);
  console.error("Vue Info:", info);

  // Show user-friendly error message
  showToast("An unexpected error occurred. Please refresh the page.", {
    type: "error",
    duration: 7000,
  });

  // In production, you might want to send this to an error reporting service
  if (import.meta.env.PROD) {
    // Example: Send to error reporting service
    // errorReportingService.captureException(error, { vueInfo: info });
  }
};

/**
 * Global error handler for unhandled promise rejections
 * @param {PromiseRejectionEvent} event - The rejection event
 */
export const handleUnhandledRejection = (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);

  showToast("An unexpected error occurred. Please try again.", {
    type: "error",
    duration: 7000,
  });

  // Prevent the default browser behavior
  event.preventDefault();
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = () => {
  // Vue error handler
  if (window.__VUE_APP_INSTANCE) {
    window.__VUE_APP_INSTANCE.config.errorHandler = handleVueError;
  }

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  // Global JavaScript errors
  window.addEventListener("error", (event) => {
    console.error("Global JavaScript Error:", event.error);

    showToast("An unexpected error occurred. Please refresh the page.", {
      type: "error",
      duration: 7000,
    });
  });
};

/**
 * Enhanced error boundary for async operations
 * @param {Function} asyncOperation - The async operation to wrap
 * @param {Object} options - Error handling options
 * @returns {Promise} - The wrapped promise
 */
export const withErrorHandling = async (asyncOperation, options = {}) => {
  const {
    operation = "operation",
    showNotification = true,
    fallbackMessage = "An error occurred. Please try again.",
    rethrow = false,
  } = options;

  try {
    return await asyncOperation();
  } catch (error) {
    console.error(`${operation} error:`, error);

    // Handle specific error types
    if (error.message?.includes("JWT") || error.message?.includes("auth")) {
      handleAuthError(error);
    } else if (
      error.message?.includes("network") ||
      error.message?.includes("fetch")
    ) {
      handleNetworkError(error);
    } else if (
      error.message?.includes("validation") ||
      error.message?.includes("required")
    ) {
      handleValidationError(error);
    } else {
      handleSupabaseError(error, operation);
    }

    // Show custom fallback message if provided
    if (showNotification && fallbackMessage) {
      showToast(fallbackMessage, { type: "error", duration: 7000 });
    }

    // Re-throw error if requested
    if (rethrow) {
      throw error;
    }

    return null;
  }
};

/**
 * Retry wrapper for operations that might fail due to temporary issues
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - The operation result
 */
export const withRetry = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    operation: operationName = "operation",
    shouldRetry = (error) => true,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or shouldn't retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));

      console.warn(`${operationName} attempt ${attempt} failed, retrying...`);
    }
  }

  // If we get here, all retries failed
  return withErrorHandling(
    () => {
      throw lastError;
    },
    { operation: operationName, rethrow: true }
  );
};

/**
 * Validate form data and handle validation errors
 * @param {Object} formData - The form data to validate
 * @param {Object} validationRules - Validation rules
 * @returns {Object} - Validation result
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((field) => {
    const rules = validationRules[field];
    const value = formData[field];

    // Required validation
    if (rules.required && (!value || value.toString().trim() === "")) {
      errors[field] = `${field} is required`;
      return;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) return;

    // Email validation
    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field] = "Please enter a valid email address";
      }
    }

    // Phone validation
    if (rules.phone && value) {
      const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
      if (!phoneRegex.test(value)) {
        errors[field] = "Please enter a valid phone number";
      }
    }

    // Min length validation
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[
        field
      ] = `${field} must be no more than ${rules.maxLength} characters`;
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === "function") {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors[field] = customResult || `${field} is invalid`;
      }
    }
  });

  if (Object.keys(errors).length > 0) {
    handleValidationError(errors);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: {} };
};

/**
 * Safe async operation wrapper with loading states
 * @param {Function} operation - The async operation
 * @param {Object} callbacks - Success and error callbacks
 * @returns {Promise} - The operation result
 */
export const safeAsyncOperation = async (operation, callbacks = {}) => {
  const {
    onSuccess,
    onError,
    operation: operationName = "operation",
  } = callbacks;

  try {
    const result = await operation();

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    const handledError = withErrorHandling(
      () => {
        throw error;
      },
      { operation: operationName, rethrow: false }
    );

    if (onError) {
      onError(handledError);
    }

    return null;
  }
};

export default {
  handleVueError,
  handleUnhandledRejection,
  setupGlobalErrorHandlers,
  withErrorHandling,
  withRetry,
  validateForm,
  safeAsyncOperation,
};
