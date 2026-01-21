import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./assets/css/styles.css";

// Vue and Pinia
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

// Chart.js plugins
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Supabase
import { supabase } from "./services/supabaseService.js";

// Pinia stores
import { useAuthStore } from "./stores/auth";

// Apply animation CSS on app initialization
import { generateAnimationCSS } from "./utils/animationUtils";

// Create the app instance
const app = createApp(App);

// Create Pinia instance
const pinia = createPinia();

// Apply animation CSS
try {
  const animationCSS = generateAnimationCSS();
  const style = document.createElement("style");
  style.textContent = animationCSS;
  document.head.appendChild(style);
} catch (error) {
  console.error("Error applying animation CSS:", error);
}

// Register the notification system globally
app.config.globalProperties.$notify = (message, options = {}) => {
  try {
    // This function will be properly defined when the NotifyManager component is mounted
    return { close: () => {} };
  } catch (error) {
    console.error("Error in notification system:", error);
    return { close: () => {} };
  }
};

// Initialize notification system
let notifyFunction = null;

app.config.globalProperties.$notify = (message, options = {}) => {
  if (notifyFunction) {
    return notifyFunction(message, options);
  } else {
    console.warn(
      "Notification system not ready, queuing notification:",
      message
    );
    // Queue notification for when system is ready
    setTimeout(() => {
      if (notifyFunction) {
        notifyFunction(message, options);
      } else {
        console.error("Notification system failed to initialize");
      }
    }, 100);
    return { close: () => {} };
  }
};

// Function to set the notify function from NotifyManager
window.setNotifyFunction = (fn) => {
  notifyFunction = fn;
};

// Store app instance globally for notifications to work
window.__VUE_APP_INSTANCE = app;

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// Use plugins
app.use(pinia);
app.use(router);

// Execute after app is mounted
try {
  // Initialize auth store BEFORE mounting the app to ensure session persistence works correctly
  const authStore = useAuthStore();

  // Use an async IIFE to handle top-level await for build compatibility
  (async () => {
    try {
      await authStore.initializeAuth();

      // Mount the app after auth initialization
      app.mount("#app");
    } catch (error) {
      console.error("Error during app initialization:", error);
      // Mount app anyway to show error state
      app.mount("#app");
    }
  })();
} catch (error) {
  console.error("Error mounting app:", error);
  // Fallback: try to show error message
  const appElement = document.getElementById("app");
  if (appElement) {
    appElement.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #d9534f;">
        <h2>Application Error</h2>
        <p>There was an error loading the application. Please refresh the page.</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
  }
}
