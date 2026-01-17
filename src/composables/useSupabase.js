import { ref, computed } from "vue";
import { supabase } from "../services/supabaseService.js";
import { useAuthStore } from "../stores/auth.js";

export const useSupabase = () => {
  const loading = ref(false);
  const error = ref(null);
  const { user, userRole, isAuthenticated } = useAuthStore();

  // Generic error handler
  const handleError = (err) => {
    // Provide user-friendly error messages
    let userFriendlyMessage = "An error occurred";

    if (err.message) {
      if (err.message.includes("JWT")) {
        userFriendlyMessage = "Your session has expired. Please log in again.";
      } else if (
        err.message.includes("network") ||
        err.message.includes("fetch")
      ) {
        userFriendlyMessage =
          "Network error. Please check your connection and try again.";
      } else if (
        err.message.includes("permission") ||
        err.message.includes("unauthorized")
      ) {
        userFriendlyMessage =
          "You don't have permission to perform this action.";
      } else if (
        err.message.includes("not found") ||
        err.message.includes("404")
      ) {
        userFriendlyMessage = "The requested data could not be found.";
      } else if (
        err.message.includes("duplicate") ||
        err.message.includes("unique")
      ) {
        userFriendlyMessage =
          "This record already exists or conflicts with existing data.";
      } else if (
        err.message.includes("foreign key") ||
        err.message.includes("constraint")
      ) {
        userFriendlyMessage =
          "This action would break data relationships. Please check related records.";
      } else if (err.message.includes("timeout")) {
        userFriendlyMessage =
          "The request is taking too long. Please try again.";
      } else if (err.message.length < 100) {
        // Use the original message if it's reasonably short and user-friendly
        userFriendlyMessage = err.message;
      } else {
        userFriendlyMessage =
          "An error occurred while processing your request.";
      }
    }

    error.value = userFriendlyMessage;
    return null;
  };

  // Generic loading state wrapper
  const withLoading = async (operation) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await operation();
      return result;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Role-based access control helpers
  const canAccess = (allowedRoles) => {
    if (!isAuthenticated.value) {
      return false;
    }
    const hasAccess = allowedRoles.includes(userRole.value);
    if (!hasAccess) {
    }
    return hasAccess;
  };

  const requireAuth = async () => {
    // Wait for authentication to be initialized if it's still loading
    let attempts = 0;
    const maxAttempts = 10;
    const authStore = useAuthStore();

    while (
      (!authStore.isAuthenticated || !authStore.user) &&
      attempts < maxAttempts
    ) {
      await authStore.initializeAuth();
      await new Promise((resolve) => setTimeout(resolve, 200));
      attempts++;
    }

    if (!authStore.isAuthenticated) {
      throw new Error("Authentication required");
    }

    if (!authStore.user || !authStore.user.id) {
      throw new Error("User data not available. Please try logging in again.");
    }
  };

  const requireRole = async (roles) => {
    // Ensure auth is initialized and user data is available
    const authStore = useAuthStore();

    // Initialize auth if not already done
    if (!authStore.isAuthenticated || !authStore.user) {
      await authStore.initializeAuth();
    }

    // Check if we have a valid session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error("❌ [useSupabase] No valid session");
      throw new Error("Authentication required");
    }

    // Ensure user data is available - use authStore.user directly
    if (!authStore.user || !authStore.user.id) {
      // Try to reinitialize auth one more time
      await authStore.initializeAuth(true);
      if (!authStore.user || !authStore.user.id) {
        throw new Error(
          "User data not available. Please try logging in again."
        );
      }
    }

    // Get user role using auth store
    let role;
    try {
      role = await authStore.getUserRole(session.user.id);
    } catch (roleError) {
      console.error(
        "❌ [useSupabase] Role check failed: Unable to get user role",
        roleError
      );
      throw new Error("Unable to verify user permissions");
    }

    if (!roles.includes(role)) {
      const errorMsg = `Access denied. Required roles: ${roles.join(
        ", "
      )}. Current role: ${role || "none"}`;
      console.error("❌ [useSupabase] Role check failed:", errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Patient operations
  const patientOps = {
    // Get all patients (admin/staff only)
    async getAllPatients() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Patients").select(
          `
            *,
            Users!UserID(Email, fullName)
          `
        );

        if (error) {
          throw error;
        }
        return data || [];
      });
    },

    // Get patient by ID
    async getPatientById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Patients")
          .select(
            `
            *,
            Users!UserID(fullName, Email)
          `
          )
          .eq("PatientID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Get current user's patients (patients only)
    async getMyPatients() {
      await requireRole(["patient"]);
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Patients")
          .select("*")
          .eq("UserID", authStore.user.id);

        if (error) {
          throw error;
        }
        return data;
      });
    },

    // Create new patient
    async createPatient(patientData) {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Patients")
          .insert([
            {
              ...patientData,
              UserID: authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Update patient
    async updatePatient(id, patientData) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Patients")
          .update({
            ...patientData,
          })
          .eq("PatientID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Delete patient
    async deletePatient(id) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Patients")
          .delete()
          .eq("PatientID", id);

        if (error) throw error;
        return true;
      });
    },
  };

  // Appointment operations
  const appointmentOps = {
    // Get all appointments (staff only)
    async getAllAppointments() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .select(
            `
            *,
            Patients(
              *,
              Users!UserID(fullName)
            ),
            Staff!ScheduledBy(
              *,
              Users!UserID(fullName)
            )
          `
          )
          .order("DateTime", { ascending: true });

        if (error) throw error;
        return data || [];
      });
    },

    // Get current user's appointments (patients)
    async getMyAppointments() {
      await requireRole(["patient"]);
      return withLoading(async () => {
        // Get fresh reference to auth store
        const authStore = useAuthStore();

        if (!authStore.isInitialized) {
          await authStore.initializeAuth();
        }

        const currentUser = authStore.user;

        if (!currentUser || !currentUser.id) {
          throw new Error("User not authenticated");
        }

        // First get the patient record for the current user
        const { data: patientData, error: patientError } = await supabase
          .from("Patients")
          .select("PatientID")
          .eq("UserID", currentUser.id)
          .single();

        if (patientError) {
          if (patientError.code === "PGRST116") {
            console.warn(
              "⚠️ No patient record found for user:",
              currentUser.id
            );
            return [];
          }
          throw patientError;
        }

        const { data, error } = await supabase
          .from("Appointment")
          .select(
            `
            *,
            Patients(*),
            Staff!ScheduledBy(
              *,
              Users!UserID(fullName)
            )
          `
          )
          .eq("PatientID", patientData.PatientID)
          .order("DateTime", { ascending: true });

        if (error) {
          throw error;
        }
        return data || [];
      });
    },

    // Get staff appointments (nurses)
    async getMyStaffAppointments() {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        // Get fresh reference to auth store
        const authStore = useAuthStore();

        // Wait for auth to be initialized if it's not yet
        if (!authStore.isInitialized) {
          await authStore.initializeAuth();
        }

        // Get user from auth store
        const currentUser = authStore.user;

        // Ensure user is properly loaded
        if (!currentUser || !currentUser.id) {
          console.error("❌ User not loaded. Auth state:", {
            isAuthenticated: authStore.isAuthenticated,
            isInitialized: authStore.isInitialized,
            user: currentUser,
          });
          throw new Error("User not authenticated or user data not loaded");
        }

        // First, get the Staff record for the current user
        const { data: staffData, error: staffError } = await supabase
          .from("Staff")
          .select("StaffID")
          .eq("UserID", currentUser.id)
          .single();

        if (staffError) {
          console.error("❌ Error fetching staff record:", staffError);
          // If no staff record found, return empty array instead of throwing
          if (staffError.code === "PGRST116") {
            console.warn("⚠️ No staff record found for user:", currentUser.id);
            return [];
          }
          throw staffError;
        }

        // Now fetch appointments scheduled by this staff member
        // The Appointment table uses "ScheduledBy" column which references Staff.StaffID
        const { data, error } = await supabase
          .from("Appointment")
          .select(
            `
            *,
            Patients(
              *,
              Users!UserID(fullName)
            ),
            Staff!ScheduledBy(*)
          `
          )
          .eq("ScheduledBy", staffData.StaffID)
          .order("DateTime", { ascending: true });

        if (error) throw error;
        return data || [];
      });
    },

    // Create appointment
    async createAppointment(appointmentData) {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Appointment")
          .insert([
            {
              ...appointmentData,
              ScheduledBy: authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Update appointment
    async updateAppointment(id, appointmentData) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .update({
            ...appointmentData,
          })
          .eq("AppointmentID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Delete appointment
    async deleteAppointment(id) {
      return withLoading(async () => {
        const { error } = await supabase
          .from("Appointment")
          .delete()
          .eq("AppointmentID", id);

        if (error) throw error;
        return true;
      });
    },
  };

  // Staff operations (admin only)
  const staffOps = {
    async getAllStaff() {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Staff").select(
          `
            *,

            Users!UserID(fullName, Email, RoleName)
          `
        );

        if (error) throw error;
        return data;
      });
    },

    async createStaff(staffData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Staff")
          .insert([
            {
              ...staffData,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateStaff(id, staffData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Staff")
          .update({
            ...staffData,
          })
          .eq("StaffID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteStaff(id) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Staff")
          .delete()
          .eq("StaffID", id);

        if (error) throw error;
        return true;
      });
    },
  };

  // Notification operations
  const notificationOps = {
    async getAllNotifications() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notification")
          .select(
            `
            *,

            Users!inner(fullName, Email)
          `
          )
          .order("CreatedAt", { ascending: false });

        if (error) throw error;
        return data || [];
      });
    },

    async getMyNotifications() {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Notification")
          .select("*")
          .eq("UserID", authStore.user.id)
          .order("CreatedAt", { ascending: false });

        if (error) throw error;
        return data;
      });
    },

    async createNotification(notificationData) {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Notification")
          .insert([
            {
              ...notificationData,
              UserID: notificationData.UserID || authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async markAsRead(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notification")
          .update({
            IsRead: true,
          })
          .eq("NotificationID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async markAllAsRead() {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { error } = await supabase
          .from("Notification")
          .update({
            IsRead: true,
          })
          .eq("UserID", authStore.user.id)
          .eq("IsRead", false);

        if (error) throw error;
        return true;
      });
    },

    async deleteNotification(id) {
      return withLoading(async () => {
        const { error } = await supabase
          .from("Notification")
          .delete()
          .eq("NotificationID", id);

        if (error) throw error;
        return true;
      });
    },

    async updateNotification(id, notificationData) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notification")
          .update({
            ...notificationData,
          })
          .eq("NotificationID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Send appointment reminder
    async sendAppointmentReminder(appointmentId, patientId, message) {
      await requireAuth();
      return withLoading(async () => {
        const notificationData = {
          UserID: patientId,
          Title: "Appointment Reminder",
          Message: message,
          Type: "appointment_reminder",
          Priority: "normal",
          ActionRequired: false,
          RelatedAppointmentID: appointmentId,
        };

        const { data, error } = await supabase
          .from("Notification")
          .insert([notificationData])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Send system alert
    async sendSystemAlert(userId, title, message, priority = "normal") {
      await requireAuth();
      return withLoading(async () => {
        const notificationData = {
          UserID: userId,
          Title: title,
          Message: message,
          Type: "system_alert",
          Priority: priority,
          ActionRequired: true,
        };

        const { data, error } = await supabase
          .from("Notification")
          .insert([notificationData])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
  };

  // Medical Record operations (admin and nurse only)
  const medicalRecordOps = {
    async getAllMedicalRecords() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("MedicalRecord").select(
          `
            *,
            Staff!EnteredBy(
              *,
              Users!UserID(fullName)
            ),
            Diagnosis(*),
            Treatment(TreatmentName)
          `
        );

        if (error) throw error;
        return data;
      });
    },

    async getMedicalRecordById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("MedicalRecord")
          .select(
            `
            *,
            Patients!PatientID(
              *,
              Users!UserID(fullName)
            ),
            Staff!EnteredBy(
              *,
              Users!UserID(fullName)
            ),
            Diagnosis(*),
            Treatment(*)
          `
          )
          .eq("MedicalRecordID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createMedicalRecord(recordData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("MedicalRecord")
          .insert([
            {
              ...recordData,
              EnteredBy: authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateMedicalRecord(id, recordData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("MedicalRecord")
          .update({
            ...recordData,
          })
          .eq("MedicalRecordID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteMedicalRecord(id) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("MedicalRecord")
          .delete()
          .eq("MedicalRecordID", id);

        if (error) throw error;
        return true;
      });
    },

    async getMedicalRecordsByPatient(patientId) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("MedicalRecord")
          .select(
            `
            *,
            Patients!PatientID(
              *,
              Users!UserID(fullName)
            ),
            Staff!EnteredBy(
              *,
              Users!UserID(fullName)
            ),
            Diagnosis(*),
            Treatment(*)
          `
          )
          .eq("PatientID", patientId);

        if (error) {
          throw error;
        }
        return data;
      });
    },

    async getMedicalRecordsByStaff(staffId) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("MedicalRecord")
          .select(
            `
            *,
            Patients!PatientID(
              *,
              Users!UserID(fullName)
            ),
            Diagnosis(*),
            Treatment(*)
          `
          )
          .eq("EnteredBy", staffId);

        if (error) throw error;
        return data;
      });
    },
  };

  // Reports operations (admin only)
  const reportOps = {
    async getAllReports() {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Reports").select(
          `
            *,
            GeneratedByNavigation:GeneratedBy(
              *,
              Users!inner(fullName)
            )
          `
        );

        if (error) throw error;
        return data;
      });
    },

    async getReportById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Reports")
          .select(
            `
            *,
            GeneratedByNavigation:GeneratedBy(
              *,
              Users!inner(fullName)
            )
          `
          )
          .eq("ReportID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createReport(reportData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Reports")
          .insert([
            {
              ...reportData,
              GeneratedBy: authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateReport(id, reportData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Reports")
          .update({
            ...reportData,
          })
          .eq("ReportID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteReport(id) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Reports")
          .delete()
          .eq("ReportID", id);

        if (error) throw error;
        return true;
      });
    },

    async getReportsByType(reportType) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Reports")
          .select(
            `
            *,
            GeneratedByNavigation:GeneratedBy(
              *,
              Users!inner(fullName)
            )
          `
          )
          .eq("ReportType", reportType);

        if (error) throw error;
        return data;
      });
    },

    async getReportsByDateRange(startDate, endDate) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Reports")
          .select(
            `
            *,
            GeneratedByNavigation:GeneratedBy(
              *,
              Users!inner(fullName)
            )
          `
          )
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (error) throw error;
        return data;
      });
    },

    // Analytics data operations
    async getOverviewStats(startDate, endDate) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // Get patient count
        const { count: patientsCount, error: patientsError } = await supabase
          .from("Patients")
          .select("*", { count: "exact", head: true });

        // Get staff count
        const { count: staffCount, error: staffError } = await supabase
          .from("Staff")
          .select("*", { count: "exact", head: true });

        // Get appointments count
        const { count: appointmentsCount, error: appointmentsError } =
          await supabase
            .from("Appointment")
            .select("*", { count: "exact", head: true });

        // Get medical records count
        const { count: recordsCount, error: recordsError } = await supabase
          .from("MedicalRecord")
          .select("*", { count: "exact", head: true });

        if (patientsError || staffError || appointmentsError || recordsError) {
          throw new Error("Failed to fetch overview statistics");
        }

        const result = {
          totalPatients: patientsCount || 0,
          totalStaff: staffCount || 0,
          totalAppointments: appointmentsCount || 0,
          totalRecords: recordsCount || 0,
        };
        return result;
      });
    },

    async getAppointmentAnalytics(startDate, endDate) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // Get appointments by status
        const { data: statusData, error: statusError } = await supabase
          .from("Appointment")
          .select("Status")
          .gte("DateTime", startDate)
          .lte("DateTime", endDate);

        // Get appointments by type (skip if Type column doesn't exist)
        let typeData = [];
        // Type column may not exist in database, skip query to prevent 400 error

        // Get appointment trends (monthly)
        const { data: trendsData, error: trendsError } = await supabase
          .from("Appointment")
          .select("DateTime")
          .gte("DateTime", startDate)
          .lte("DateTime", endDate);

        if (statusError) {
          throw new Error(
            `Failed to fetch appointment status data: ${statusError.message}`
          );
        }
        if (trendsError) {
          throw new Error(
            `Failed to fetch appointment trends data: ${trendsError.message}`
          );
        }

        // Process status data
        const statusCounts = {};
        statusData?.forEach((apt) => {
          statusCounts[apt.Status] = (statusCounts[apt.Status] || 0) + 1;
        });

        // Process type data (only if Type column exists)
        const typeCounts = {};
        if (typeData && typeData.length > 0) {
          typeData.forEach((apt) => {
            if (apt.Type) {
              typeCounts[apt.Type] = (typeCounts[apt.Type] || 0) + 1;
            }
          });
        }

        // Process trends data (monthly)
        const monthlyTrends = {};
        trendsData?.forEach((apt) => {
          const date = new Date(apt.DateTime);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + 1;
        });

        const trends = Object.entries(monthlyTrends)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, appointments]) => ({
            month: new Date(month + "-01").toLocaleDateString("en-US", {
              month: "short",
            }),
            appointments,
          }));

        return {
          byStatus: Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            color: getStatusColor(status),
          })),
          byType: Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count,
            color: getTypeColor(type),
          })),
          trends,
        };
      });
    },

    async getPatientAnalytics(startDate, endDate) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // Get patients by gender (without date filtering since created_at column may not exist)
        const { data: genderData, error: genderError } = await supabase
          .from("Patients")
          .select("Gender");

        if (genderError) {
          throw new Error(
            `Failed to fetch patient analytics: ${genderError.message}`
          );
        }

        // Process gender data
        const genderCounts = {};
        genderData?.forEach((patient) => {
          const gender = patient.Gender || "Not specified";
          genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        });

        return {
          byGender: Object.entries(genderCounts).map(([gender, count]) => ({
            gender,
            count,
            color: getGenderColor(gender),
          })),
          byAgeGroup: [], // Placeholder for age groups if needed later
          registrationTrends: [], // Placeholder for registration trends if needed later
        };
      });
    },

    async getStaffAnalytics(startDate, endDate) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // Get staff workload data (appointments handled by staff)
        const { data: workloadData, error: workloadError } = await supabase
          .from("Appointment")
          .select(
            `
            Staff!inner(*),
            DateTime
          `
          )
          .gte("DateTime", startDate)
          .lte("DateTime", endDate);

        // Get staff performance (completed appointments)
        const { data: performanceData, error: performanceError } =
          await supabase
            .from("Appointment")
            .select(
              `
            Staff!inner(*),
            Status
          `
            )
            .gte("DateTime", startDate)
            .lte("DateTime", endDate)
            .eq("Status", "Completed");

        if (workloadError) {
          throw new Error(
            `Failed to fetch staff workload data: ${workloadError.message}`
          );
        }
        if (performanceError) {
          throw new Error(
            `Failed to fetch staff performance data: ${performanceError.message}`
          );
        }

        // Process workload data
        const workloadCounts = {};
        workloadData?.forEach((apt) => {
          const staffId = apt.Staff.StaffID;
          const staffName = apt.Staff.Users?.fullName || `Staff ${staffId}`;
          workloadCounts[staffName] = (workloadCounts[staffName] || 0) + 1;
        });

        // Process performance data
        const performanceCounts = {};
        performanceData?.forEach((apt) => {
          const staffId = apt.Staff.StaffID;
          const staffName = apt.Staff.Users?.fullName || `Staff ${staffId}`;
          performanceCounts[staffName] =
            (performanceCounts[staffName] || 0) + 1;
        });

        // Get daily workload for the last 7 days
        const dailyWorkload = {};
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        }).reverse();

        workloadData?.forEach((apt) => {
          const date = apt.DateTime.split("T")[0];
          if (last7Days.includes(date)) {
            dailyWorkload[date] = (dailyWorkload[date] || 0) + 1;
          }
        });

        return {
          workload: Object.entries(workloadCounts).map(([name, hours]) => ({
            name,
            hours,
            color: getRandomColor(),
          })),
          performance: Object.entries(performanceCounts).map(
            ([name, completed]) => ({
              name,
              completed,
              color: getRandomColor(),
            })
          ),
          dailyWorkload: last7Days.map((day) => ({
            day: new Date(day).toLocaleDateString("en-US", {
              weekday: "short",
            }),
            hours: dailyWorkload[day] || 0,
          })),
        };
      });
    },
  };

  // Treatment operations (admin and nurse only)
  const treatmentOps = {
    async getAllTreatments() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Treatment").select("*");

        if (error) throw error;
        return data;
      });
    },

    async getTreatmentById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Treatment")
          .select("*")
          .eq("TreatmentID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createTreatment(treatmentData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Treatment")
          .insert([
            {
              ...treatmentData,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateTreatment(id, treatmentData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Treatment")
          .update({
            ...treatmentData,
          })
          .eq("TreatmentID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteTreatment(id) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Treatment")
          .delete()
          .eq("TreatmentID", id);

        if (error) throw error;
        return true;
      });
    },

    async getTreatmentsByCategory(category) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Treatment")
          .select("*")
          .eq("category", category);

        if (error) throw error;
        return data;
      });
    },
  };

  // Diagnosis operations (admin and nurse only)
  const diagnosisOps = {
    async getAllDiagnoses() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Diagnosis").select("*");

        if (error) throw error;
        return data;
      });
    },

    async getDiagnosisById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Diagnosis")
          .select("*")
          .eq("DiagnosisID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createDiagnosis(diagnosisData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Diagnosis")
          .insert([
            {
              ...diagnosisData,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateDiagnosis(id, diagnosisData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Diagnosis")
          .update({
            ...diagnosisData,
          })
          .eq("DiagnosisID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteDiagnosis(id) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Diagnosis")
          .delete()
          .eq("DiagnosisID", id);

        if (error) throw error;
        return true;
      });
    },

    async getDiagnosesByCategory(category) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Diagnosis")
          .select("*")
          .eq("category", category);

        if (error) throw error;
        return data;
      });
    },
  };

  // Consultation Notes operations (admin and nurse only)
  const consultationNotes = {
    async getAllConsultationNotes() {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .select("*")
          .order("CreatedAt", { ascending: false });

        if (error) throw error;
        return data;
      });
    },

    async getConsultationNoteById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .select("*")
          .eq("NoteID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createConsultationNote(noteData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .insert([
            {
              ...noteData,
              CreatedAt: new Date().toISOString(),
              UpdatedAt: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateConsultationNote(id, noteData) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .update({
            ...noteData,
            UpdatedAt: new Date().toISOString(),
          })
          .eq("NoteID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteConsultationNote(id) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { error } = await supabase
          .from("Notes")
          .delete()
          .eq("NoteID", id);

        if (error) throw error;
        return true;
      });
    },

    async getConsultationNotesByPatient(patientId) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .select("*")
          .eq("PatientID", patientId)
          .order("CreatedAt", { ascending: false });

        if (error) throw error;
        return data;
      });
    },

    async getConsultationNotesByStaff(staffId) {
      await requireRole(["admin", "nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Notes")
          .select("*")
          .eq("EnteredBy", staffId)
          .order("CreatedAt", { ascending: false });

        if (error) throw error;
        return data;
      });
    },
  };

  // Authentication operations
  const authOps = {
    async signUp(email, password, userData = {}) {
      return withLoading(async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData,
          },
        });

        if (error) throw error;
        return data;
      });
    },

    async signIn(email, password) {
      return withLoading(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        return data;
      });
    },

    async signOut() {
      return withLoading(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return true;
      });
    },

    async resetPassword(email) {
      return withLoading(async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        return true;
      });
    },

    async updatePassword(newPassword) {
      return withLoading(async () => {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;
        return true;
      });
    },

    async getCurrentUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },

    async getSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },

    async refreshSession() {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data;
    },

    async resendConfirmation(email) {
      return withLoading(async () => {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
        });

        if (error) throw error;
        return true;
      });
    },
  };

  // User management operations (admin only)
  const userOps = {
    async getAllUsers() {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase.from("Users").select(
          `
            *,
            Role(RoleName)
          `
        );

        if (error) throw error;
        return data;
      });
    },

    async getUserById(id) {
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Users")
          .select(
            `
            *,
            Role(RoleName)
          `
          )
          .eq("UserID", id)
          .single();

        if (error) throw error;
        return data;
      });
    },

    async createUser(userData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // First create the auth user
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              firstName: userData.firstName,
              surname: userData.surname,
            },
          });

        if (authError) throw authError;

        // Then create the user record in the Users table
        const { data, error } = await supabase
          .from("Users")
          .insert([
            {
              UserID: authData.user.id,
              fullName: `${userData.firstName} ${userData.surname}`,
              email: userData.email,
              RoleName: userData.roleId,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async updateUser(id, userData) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Users")
          .update({
            ...userData,
          })
          .eq("UserID", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    async deleteUser(id) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        // First delete from Users table
        const { error: userError } = await supabase
          .from("Users")
          .delete()
          .eq("UserID", id);

        if (userError) throw userError;

        // Then delete from Supabase Auth (requires admin privileges)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw authError;

        return true;
      });
    },

    async getUsersByRole(roleId) {
      await requireRole(["admin"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Users")
          .select(
            `
            *,
            Role(RoleName)
          `
          )
          .eq("RoleName", roleId);

        if (error) throw error;
        return data;
      });
    },

    // Approve appointment request
    async approveAppointmentRequest(appointmentId) {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .update({
            Status: "Approved",
          })
          .eq("AppointmentID", appointmentId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Deny appointment request
    async denyAppointmentRequest(appointmentId, reason) {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .update({
            Status: "Denied",
            Notes: reason,
          })
          .eq("AppointmentID", appointmentId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Get pending appointment requests for nurse
    async getPendingAppointmentRequests() {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .select(
            `
            *,
            Patients(
              *,
              Users!UserID(fullName, Email)
            ),
            Staff!ScheduledBy(
              *,
              Users!UserID(fullName)
            )
          `
          )
          .eq("Status", "Pending")
          .order("DateTime", { ascending: true });

        if (error) throw error;
        return data || [];
      });
    },

    // Get all appointment requests for nurse
    async getAllAppointmentRequests() {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .select(
            `
            *,
            Patients(
              *,
              Users!UserID(fullName, Email)
            ),
            Staff!ScheduledBy(
              *,
              Users!UserID(fullName)
            )
          `
          )
          .order("DateTime", { ascending: true });

        if (error) throw error;
        return data || [];
      });
    },

    // Create new appointment request
    async createAppointmentRequest(requestData) {
      await requireAuth();
      return withLoading(async () => {
        const authStore = useAuthStore();
        const { data, error } = await supabase
          .from("Appointment")
          .insert([
            {
              ...requestData,
              Status: "Pending",
              ScheduledBy: authStore.user.id,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Update appointment request
    async updateAppointmentRequest(appointmentId, requestData) {
      await requireRole(["nurse"]);
      return withLoading(async () => {
        const { data, error } = await supabase
          .from("Appointment")
          .update({
            ...requestData,
          })
          .eq("AppointmentID", appointmentId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },

    // Subscribe to appointment requests changes
    async subscribeToAppointmentRequests(callback) {
      await requireRole(["nurse"]);
      const subscription = supabase
        .channel("appointment_requests_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Appointment",
          },
          callback
        )
        .subscribe();

      return subscription;
    },

    // Subscribe to patient changes
    async subscribeToPatients(callback) {
      await requireRole(["admin", "nurse"]);
      const subscription = supabase
        .channel("patients_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Patients",
          },
          callback
        )
        .subscribe();

      return subscription;
    },
  };

  // Helper functions for colors
  const getStatusColor = (status) => {
    const colors = {
      Completed: "#4CAF50",
      Confirmed: "#2196F3",
      Pending: "#FF9800",
      Cancelled: "#F44336",
      Scheduled: "#9C27B0",
    };
    return colors[status] || "#607D8B";
  };

  const getTypeColor = (type) => {
    const colors = {
      Consultation: "#9C27B0",
      "Follow-up": "#607D8B",
      Vaccination: "#795548",
      Emergency: "#F44336",
      "Check-up": "#2196F3",
    };
    return colors[type] || "#607D8B";
  };

  const getGenderColor = (gender) => {
    const colors = {
      Male: "#2196F3",
      Female: "#E91E63",
      Other: "#9C27B0",
      "Not specified": "#607D8B",
    };
    return colors[gender] || "#607D8B";
  };

  const getRandomColor = () => {
    const colors = [
      "#2196F3",
      "#4CAF50",
      "#FF9800",
      "#F44336",
      "#9C27B0",
      "#795548",
      "#607D8B",
      "#E91E63",
      "#3F51B5",
      "#00BCD4",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return {
    // State
    loading,
    error,

    // Access control
    canAccess,
    requireAuth,
    requireRole,

    // Operations
    patients: patientOps,
    appointments: appointmentOps,
    staff: staffOps,
    notifications: notificationOps,
    medicalRecords: medicalRecordOps,
    reports: reportOps,
    consultationNotes,
    treatments: treatmentOps,
    diagnoses: diagnosisOps,
    auth: authOps,
    users: userOps,

    // Utilities
    supabase,
  };
};

export default useSupabase;
