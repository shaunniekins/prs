<script setup>
import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = useRouter();
const authStore = useAuthStore();

// Login form data
const loginForm = reactive({
  email: "",
  password: "",
});

// UI state
const errorMessage = ref("");
const successMessage = ref("");
const showLoginFormPassword = ref(false);
const isLoading = ref(false);
const isInteracting = ref(true);

// Computed properties for form binding
const currentEmail = computed({
  get: () => loginForm.email,
  set: (value) => {
    loginForm.email = value;
  },
});

const currentPassword = computed({
  get: () => loginForm.password,
  set: (value) => {
    loginForm.password = value;
  },
});

// Login function using Supabase authentication
const login = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  isLoading.value = true;

  if (!loginForm.email || !loginForm.password) {
    errorMessage.value = "Please enter both email/username and password";
    isLoading.value = false;
    return;
  }

  try {
    const result = await authStore.login(loginForm);

    if (result.success) {
      successMessage.value = result.message;

      // Redirect based on user role
      setTimeout(() => {
        if (result.role === "admin") {
          router.push("/admin");
        } else if (result.role === "nurse") {
          router.push("/nurse");
        } else if (result.role === "patient") {
          router.push("/patient");
        } else {
          errorMessage.value = "Unknown user role detected";
        }
      }, 500);
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    errorMessage.value = error.message || "Login failed";
  } finally {
    isLoading.value = false;
  }
};

// Toggle password visibility
const toggleLoginFormPassword = () => {
  showLoginFormPassword.value = !showLoginFormPassword.value;
};

// Reset forms
const resetForms = () => {
  loginForm.email = "";
  loginForm.password = "";
  errorMessage.value = "";
  successMessage.value = "";
};

const handleFocus = () => {
  isInteracting.value = true;
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-container" :class="{ 'is-interacting': isInteracting }">
      <!-- Animated background elements -->
      <div class="animated-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
        <div class="circle circle-4"></div>
      </div>

      <div class="auth-content">
        <!-- Login Form -->
        <div class="auth-form login-form">
          <div class="auth-header">
            <div class="logo-container">
              <i class="bi bi-hospital"></i>
            </div>
            <h1>Patient Record System</h1>
            <p class="subtitle">Please sign in to continue</p>
          </div>

          <!-- Enhanced Error Display -->
          <div v-if="errorMessage" class="alert alert-danger animate-slide-in">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <div class="alert-content">
              <strong>Login Failed</strong>
              <p class="mb-0">{{ errorMessage }}</p>
            </div>
            <button
              type="button"
              class="btn-close"
              @click="errorMessage = ''"
              :aria-label="'Dismiss error message'"
            ></button>
          </div>

          <!-- Enhanced Loading State -->
          <div v-if="isLoading" class="alert alert-info animate-pulse">
            <div class="loading-content">
              <div class="loading-spinner">
                <i class="bi bi-arrow-clockwise animate-spin"></i>
              </div>
              <div class="loading-text">
                <span v-if="loginForm.email.includes('@')"
                  >Authenticating...</span
                >
                <span v-else>Looking up username and authenticating...</span>
                <div class="loading-progress">
                  <div class="progress-bar">
                    <div class="progress-fill animate-progress"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Enhanced Success Message -->
          <div
            v-if="successMessage"
            class="alert alert-success animate-fade-in"
          >
            <i class="bi bi-check-circle-fill me-2"></i>
            {{ successMessage }}
          </div>

          <form @submit.prevent="login()" novalidate>
            <!-- Email field -->
            <div class="form-group">
              <label for="email">Username or Email</label>
              <div class="input-container">
                <i class="bi bi-envelope input-icon" aria-hidden="true"></i>
                <input
                  type="text"
                  id="email"
                  v-model="currentEmail"
                  placeholder="Enter your username or email"
                  autocomplete="username email"
                  required
                  aria-describedby="email-help"
                  :aria-invalid="errorMessage ? 'true' : 'false'"
                  @focus="handleFocus"
                />
              </div>
              <small id="email-help" class="form-help">
                Enter your username or registered email address
              </small>
            </div>

            <!-- Role selection removed - role is now automatically determined -->

            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-container">
                <i class="bi bi-lock input-icon" aria-hidden="true"></i>
                <input
                  :type="showLoginFormPassword ? 'text' : 'password'"
                  id="password"
                  v-model="currentPassword"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                  aria-describedby="password-help"
                  :aria-invalid="errorMessage ? 'true' : 'false'"
                  @focus="handleFocus"
                />
                <button
                  type="button"
                  class="toggle-password"
                  :class="showLoginFormPassword ? 'bi-eye-slash' : 'bi-eye'"
                  @click="toggleLoginFormPassword"
                  :aria-label="
                    showLoginFormPassword ? 'Hide password' : 'Show password'
                  "
                  aria-pressed="showLoginFormPassword"
                >
                  <span class="visually-hidden">
                    {{
                      showLoginFormPassword ? "Hide password" : "Show password"
                    }}
                  </span>
                </button>
              </div>
              <small id="password-help" class="form-help">
                Enter your password
              </small>
            </div>

            <!-- Role selection removed - role is now automatically determined -->

            <div class="form-button">
              <button
                type="submit"
                class="primary-button"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="spinner"></span>
                <span>{{ isLoading ? "Signing in..." : "Sign in" }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base styling */
.auth-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  position: relative;
}

.auth-container {
  width: 100%;
  max-width: 800px;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  background-color: #fff;
  transition: all 1.5s ease;
  transform-style: preserve-3d;
}

/* Mobile container adjustments */
@media (max-width: 767px) {
  .auth-container {
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin: 0;
    transition: all 1s ease;
  }
}

.auth-content {
  padding: 40px;
  position: relative;
  z-index: 2;
}

/* Animated background */
.animated-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, #0d6efd, #0dcaf0);
  opacity: 0.1;
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -80px;
  left: -50px;
  background: linear-gradient(45deg, #20c997, #0dcaf0);
  animation-delay: 2s;
}

.circle-3 {
  width: 120px;
  height: 120px;
  top: 40%;
  left: 60%;
  background: linear-gradient(45deg, #0d6efd, #6610f2);
  animation-delay: 4s;
}

.circle-4 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  right: 20%;
  background: linear-gradient(45deg, #20c997, #0d6efd);
  animation-delay: 6s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-15px) rotate(5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(15px) rotate(-5deg);
  }
}

/* Auth header */
.auth-header {
  text-align: center;
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo-container {
  background: linear-gradient(45deg, #0d6efd, #0dcaf0);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  box-shadow: 0 5px 15px rgba(13, 110, 253, 0.3);
  animation: pulse 4s infinite;
}

.logo-container i {
  font-size: 36px;
  color: white;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.4);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(13, 110, 253, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(13, 110, 253, 0);
  }
}

.auth-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
  background: linear-gradient(45deg, #0d6efd, #0dcaf0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #6c757d;
  font-size: 16px;
  margin-bottom: 0;
}

/* Form styling */
.auth-form {
  transition: all 0.5s ease;
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
}

.form-group {
  margin-bottom: 20px;
  width: 100%;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #495057;
}

.input-container {
  position: relative;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 15px;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 18px;
}

.toggle-password {
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 18px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-password:hover,
.toggle-password:focus {
  color: var(--primary-gradient-start);
  background-color: rgba(13, 110, 253, 0.1);
  outline: none;
}

input,
select {
  width: 100%;
  padding: 15px 15px 15px 45px;
  border: 1px solid #ced4da;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #f8f9fa;
}

input:focus,
select:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
  background-color: #fff;
}

.primary-button {
  width: 100%;
  background: linear-gradient(45deg, #0d6efd, #0dcaf0);
  border: none;
  color: white;
  padding: 15px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-button:hover {
  background: linear-gradient(45deg, #0b5ed7, #0bacbe);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(13, 110, 253, 0.3);
}

.primary-button:disabled {
  opacity: 0.7;
  transform: none;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1.5s ease-in-out infinite;
  margin-right: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.form-footer {
  margin-top: 20px;
  text-align: center;
}

.form-footer a {
  color: #0d6efd;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.form-footer a:hover {
  color: #0a58ca;
  text-decoration: underline;
}

/* Enhanced Alerts */
.alert {
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.alert-danger {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #842029;
  border-left: 4px solid #dc3545;
}

.alert-info {
  background: linear-gradient(135deg, #cce7ff 0%, #bee5eb 100%);
  color: #0c5460;
  border-left: 4px solid #17a2b8;
}

.alert-success {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border-left: 4px solid #28a745;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

/* Enhanced Loading State */
.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  flex-shrink: 0;
}

.loading-spinner i {
  font-size: 18px;
  color: #0c5460;
}

.loading-text {
  flex: 1;
}

.loading-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #17a2b8, #0c5460);
  border-radius: 2px;
  animation: progress 3s ease-in-out infinite;
}

/* Enhanced Animations */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes progress {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}

.animate-slide-in {
  animation: slideIn 0.6s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Demo Account Buttons */
.demo-accounts {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.demo-title {
  text-align: center;
  margin-bottom: 15px;
  font-size: 14px;
  color: #6c757d;
  font-weight: 600;
}

.demo-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.demo-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: #fff;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.demo-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.demo-button i {
  font-size: 16px;
}

.admin-demo {
  border-color: #dc3545;
  color: #dc3545;
}

.admin-demo:hover {
  background-color: #dc3545;
  color: white;
}

.nurse-demo {
  border-color: #20c997;
  color: #20c997;
}

.nurse-demo:hover {
  background-color: #20c997;
  color: white;
}

.patient-demo {
  border-color: #0d6efd;
  color: #0d6efd;
}

.patient-demo:hover {
  background-color: #0d6efd;
  color: white;
}

.demo-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
}

/* Form help text */
.form-help {
  display: block;
  margin-top: 4px;
  font-size: 0.875rem;
  color: #6c757d;
  transition: color 0.2s ease;
}

.form-group:has(input[aria-invalid="true"]) .form-help {
  color: var(--danger-color, #dc3545);
}

/* Visually hidden but accessible to screen readers */
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Enhanced focus styles for better accessibility */
input:focus,
select:focus,
button:focus,
.demo-button:focus {
  outline: 2px solid var(--primary-gradient-start);
  outline-offset: 2px;
}

/* Improved error states */
.form-group:has(input[aria-invalid="true"]) .input-container {
  border-color: var(--danger-color, #dc3545);
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

/* Mobile-first responsive design */
@media (max-width: 767px) {
  .auth-page {
    padding: var(--space-sm);
    min-height: 100vh;
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: var(--space-lg);
  }

  .auth-container {
    width: 100%;
    max-width: 100%;
    min-height: auto;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin: 0;
  }

  .auth-content {
    padding: var(--space-lg) var(--space-md);
  }

  .auth-header {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .logo-container {
    width: 64px;
    height: 64px;
    margin: 0 auto var(--space-md);
  }

  .logo-container i {
    font-size: 28px;
  }

  .auth-header h1 {
    font-size: 24px;
    margin-bottom: var(--space-xs);
  }

  .subtitle {
    font-size: 14px;
  }

  .auth-form {
    max-width: 100%;
    width: 100%;
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  .input-container {
    position: relative;
  }

  input,
  select {
    padding: 14px 14px 14px 44px;
    font-size: 16px; /* Prevent zoom on iOS */
    border-radius: 8px;
  }

  .input-icon {
    left: 14px;
    font-size: 16px;
  }

  .toggle-password {
    right: 14px;
    padding: 10px;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .primary-button {
    width: 100%;
    padding: 14px;
    font-size: 16px;
    border-radius: 8px;
    margin-top: var(--space-sm);
  }

  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
  }

  .loading-content {
    gap: 10px;
  }

  .loading-spinner i {
    font-size: 16px;
  }

  .loading-text {
    font-size: 14px;
  }

  .progress-bar {
    height: 2px;
  }

  /* Demo accounts section */
  .demo-accounts {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
  }

  .demo-title {
    font-size: 12px;
    margin-bottom: var(--space-sm);
  }

  .demo-buttons {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }

  .demo-button {
    padding: 10px 12px;
    font-size: 13px;
    border-radius: 6px;
  }

  .demo-button i {
    font-size: 14px;
  }
}

/* Small tablets and large phones */
@media (min-width: 480px) and (max-width: 767px) {
  .auth-container {
    max-width: 400px;
    margin: var(--space-lg) auto;
  }

  .auth-content {
    padding: var(--space-xl) var(--space-lg);
  }

  .logo-container {
    width: 72px;
    height: 72px;
  }

  .logo-container i {
    font-size: 32px;
  }

  .auth-header h1 {
    font-size: 26px;
  }

  .subtitle {
    font-size: 15px;
  }

  .demo-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .primary-button:hover {
    transform: none; /* Disable hover effects on touch devices */
  }

  .demo-button:hover {
    transform: none;
  }

  .toggle-password:hover,
  .toggle-password:focus {
    background-color: rgba(13, 110, 253, 0.1);
  }
}
</style>
