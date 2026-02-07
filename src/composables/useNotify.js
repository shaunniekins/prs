/**
 * Composable to use the notification system
 * Provides helper functions for showing different types of notifications
 */
export function useNotify() {
  // Show a success notification
  const showSuccess = (message) => {
    // console.log("✅ Success:", message);
    // You could also use a toast library here like vue-toastification
    alert(message); // Simple fallback
  };

  // Show an error notification
  const showError = (message) => {
    console.error("❌ Error:", message);
    alert(message); // Simple fallback
  };

  // Show an info notification
  const showInfo = (message) => {
    console.info("ℹ️ Info:", message);
  };

  // Show a warning notification
  const showWarning = (message) => {
    console.warn("⚠️ Warning:", message);
  };

  // Generic notify function (for backwards compatibility)
  const notify = (message, options = {}) => {
    const type = options.type || "info";
    switch (type) {
      case "success":
        showSuccess(message);
        break;
      case "error":
        showError(message);
        break;
      case "warning":
        showWarning(message);
        break;
      default:
        showInfo(message);
    }
    return { close: () => {} };
  };

  return {
    notify,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}
