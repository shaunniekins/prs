import axios from "axios";
import { supabase } from "./supabaseService.js";

// Create an axios instance with default config
// In production (Vercel), use relative URL. In development, use localhost:3000

// Debug: Log environment info
// console.log("🔍 API Config Debug:", {
//   VITE_API_URL: import.meta.env.VITE_API_URL,
//   PROD: import.meta.env.PROD,
//   MODE: import.meta.env.MODE,
// });

const apiBaseUrl =
  import.meta.env.VITE_API_URL &&
  import.meta.env.VITE_API_URL !== "http://localhost:3000/api"
    ? import.meta.env.VITE_API_URL
    : import.meta.env.MODE === "production" // Use MODE instead of PROD (PROD can be false in some build configs)
      ? "/api"
      : "http://localhost:3000/api";

// console.log("✅ API Base URL set to:", apiBaseUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach auth token to requests
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers["x-auth-token"] = session.access_token;
    }

    if (session?.user) {
      config.headers["x-user-role"] =
        session.user.user_metadata?.role || "patient";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Auth services - now using Supabase
export const authService = {
  login: async (credentials) => {
    // Login handled by Supabase
    return { success: true };
  },

  logout: async () => {
    // Logout handled by Supabase
    return { success: true };
  },

  refreshToken: async () => {
    // Refresh handled by Supabase
    return { success: true };
  },

  verifyToken: async () => {
    // Verification handled by Supabase
    return { success: true };
  },

  getCurrentUser: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user || null;
  },
};

// Patient services
export const patientService = {
  getAllPatients: async () => {
    try {
      const response = await api.get("/patients");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch patients" };
    }
  },

  getPatientById: async (id) => {
    try {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch patient" };
    }
  },

  createPatient: async (patientData) => {
    try {
      const response = await api.post("/patients", patientData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to create patient" };
    }
  },

  updatePatient: async (id, patientData) => {
    try {
      const response = await api.put(`/patients/${id}`, patientData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to update patient" };
    }
  },

  deletePatient: async (id) => {
    try {
      const response = await api.delete(`/patients/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to delete patient" };
    }
  },
};

// User services
export const userService = {
  getAllUsers: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch users" };
    }
  },
};
export default api;
