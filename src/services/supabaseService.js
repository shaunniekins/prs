// Supabase service for direct database operations and real-time updates
// Re-exports the centralized supabase client and adds CRUD service functions

import {
  supabase,
  checkConnection,
  getCurrentUserWithProfile,
  TABLES,
  VIEWS,
  ROLES,
  APPOINTMENT_STATUS,
  RECORD_STATUS,
  NOTIFICATION_TYPES,
} from "../config/supabaseConfig.js";

// Re-export supabase client and utilities
export {
  supabase,
  checkConnection,
  getCurrentUserWithProfile,
  TABLES,
  VIEWS,
  ROLES,
  APPOINTMENT_STATUS,
  RECORD_STATUS,
  NOTIFICATION_TYPES,
};

// Auth helpers
export const authService = {
  // Sign up new user
  signUp: async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  // Sign in user
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign out user
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  getCurrentUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get current session
  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },
};

// Patient services
export const patientService = {
  // Get all patients (staff only)
  // Using left join (no !inner) so patients are returned even without Users record
  getAllPatients: async () => {
    const { data, error } = await supabase
      .from("Patients")
      .select(
        `
        *,
        Users(email)
      `
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get patient by ID
  getPatientById: async (id) => {
    const { data, error } = await supabase
      .from("Patients")
      .select(
        `
        *,
        Users(email)
      `
      )
      .eq("PatientID", id)
      .single();

    return { data, error };
  },

  // Get patients for current user (patients only)
  getMyPatients: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Patients")
      .select("*")
      .eq("UserID", user.id)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Create new patient
  createPatient: async (patientData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Patients")
      .insert([
        {
          ...patientData,
          UserID: user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update patient
  updatePatient: async (id, patientData) => {
    const { data, error } = await supabase
      .from("Patients")
      .update({
        ...patientData,
      })
      .eq("PatientID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete patient
  deletePatient: async (id) => {
    const { error } = await supabase
      .from("Patients")
      .delete()
      .eq("PatientID", id);

    return { error };
  },
};

// Medical Record services
export const medicalRecordService = {
  // Get all medical records (staff only)
  getAllMedicalRecords: async () => {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Patients!PatientID(
          *,
          Users!inner(fullName)
        ),
        Staff!EnteredBy(
          *,
          Users!inner(fullName)
        ),
        Diagnosis(*),
        Treatment(*)
      `
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get medical record by ID
  getMedicalRecordById: async (id) => {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Patients!PatientID(
          *,
          Users!inner(fullName)
        ),
        Staff!EnteredBy(
          *,
          Users!inner(fullName)
        ),
        Diagnosis(*),
        Treatment(*)
      `
      )
      .eq("MedicalRecordID", id)
      .single();

    return { data, error };
  },

  // Get medical records for current patient
  getMyMedicalRecords: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Patients!PatientID(
          *,
          Users!inner(fullName)
        ),
        Staff!EnteredBy(
          *,
          Users!inner(fullName)
        ),
        Diagnosis(*),
        Treatment(*)
      `
      )
      .eq("Patients.UserID", user.id)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get medical records by appointment ID
  getMedicalRecordsByAppointment: async (appointmentId) => {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Diagnosis(diagnosisName),
        Treatment(treatmentName),
        Notes(notes)
      `
      )
      .eq("AppointmentID", appointmentId)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Create new medical record
  createMedicalRecord: async (medicalRecordData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("MedicalRecord")
      .insert([
        {
          ...medicalRecordData,
          EnteredBy: user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update medical record
  updateMedicalRecord: async (id, medicalRecordData) => {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .update({
        ...medicalRecordData,
      })
      .eq("MedicalRecordID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete medical record
  deleteMedicalRecord: async (id) => {
    const { error } = await supabase
      .from("MedicalRecord")
      .delete()
      .eq("MedicalRecordID", id);

    return { error };
  },
};

// Appointment services
export const appointmentService = {
  // Get all appointments (staff only)
  getAllAppointments: async () => {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(email)
        ),
        Staff!inner(
          *,
          Users!inner(email)
        )
      `
      )
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointment by ID
  getAppointmentById: async (id) => {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(email)
        ),
        Staff!inner(
          *,
          Users!inner(email)
        )
      `
      )
      .eq("AppointmentID", id)
      .single();

    return { data, error };
  },

  // Get appointments for current patient
  getMyAppointments: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(*),
        Staff!inner(
          *,
          Users!inner(email)
        )
      `
      )
      .eq("Patients.UserID", user.id)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointments for current staff
  getMyStaffAppointments: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(email)
        ),
        Staff!inner(*)
      `
      )
      .eq("Staff.UserID", user.id)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Create new appointment
  createAppointment: async (appointmentData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Appointment")
      .insert([
        {
          ...appointmentData,
          ScheduledBy: user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update appointment
  updateAppointment: async (id, appointmentData) => {
    const { data, error } = await supabase
      .from("Appointment")
      .update({
        ...appointmentData,
      })
      .eq("AppointmentID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete appointment
  deleteAppointment: async (id) => {
    const { error } = await supabase
      .from("Appointment")
      .delete()
      .eq("AppointmentID", id);

    return { error };
  },
};

// Staff services
export const staffService = {
  // Get all staff (admin only) - uses server API to get auth info including last_sign_in_at
  getAllStaff: async () => {
    try {
      console.log("📡 [staffService] Calling API /staff...");
      // Import api dynamically to avoid circular dependency
      const { default: api } = await import("./api.js");
      const response = await api.get("/staff");
      console.log(
        "✅ [staffService] API response:",
        response.data?.length,
        "records"
      );
      return { data: response.data, error: null };
    } catch (error) {
      console.error(
        "⚠️ [staffService] API failed, using fallback:",
        error.message
      );
      // Fallback to direct Supabase query if API fails
      console.log("📡 [staffService] Querying Supabase directly...");
      const { data, error: dbError } = await supabase
        .from("Staff")
        .select(
          `
          *,
          Users (Email),
          Role (RoleName)
        `
        )
        .order("StaffID", { ascending: false });
      console.log(
        "📊 [staffService] Supabase result:",
        data?.length,
        "records, error:",
        dbError
      );
      return { data, error: dbError };
    }
  },

  // Get staff by ID
  getStaffById: async (id) => {
    const { data, error } = await supabase
      .from("Staff")
      .select("*")
      .eq("StaffID", id)
      .single();

    return { data, error };
  },

  // Create new staff member
  createStaff: async (staffData) => {
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

    return { data, error };
  },

  // Update staff member
  updateStaff: async (id, staffData) => {
    const { data, error } = await supabase
      .from("Staff")
      .update({
        ...staffData,
      })
      .eq("StaffID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete staff member
  deleteStaff: async (id) => {
    const { error } = await supabase.from("Staff").delete().eq("StaffID", id);

    return { error };
  },
};

// Notification services
export const notificationService = {
  // Get all notifications (staff only)
  getAllNotifications: async () => {
    const { data, error } = await supabase
      .from("Notification")
      .select(
        `
        *,
        Users!inner(fullName)
      `
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get notifications for current user
  getMyNotifications: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Notification")
      .select("*")
      .eq("UserID", user.id)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Get unread notifications count for current user
  getUnreadCount: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: "Not authenticated" };

    const { count, error } = await supabase
      .from("Notification")
      .select("*", { count: "exact", head: true })
      .eq("UserID", user.id)
      .eq("IsRead", false);

    return { count: count || 0, error };
  },

  // Get notification by ID
  getNotificationById: async (id) => {
    const { data, error } = await supabase
      .from("Notification")
      .select("*")
      .eq("NotificationID", id)
      .single();

    return { data, error };
  },

  // Create new notification
  createNotification: async (notificationData) => {
    const { data, error } = await supabase
      .from("Notification")
      .insert([
        {
          UserID: notificationData.UserID,
          Title: notificationData.Title || null,
          Message: notificationData.Message,
          Type: notificationData.Type || "info",
          IsRead: false,
          RelatedEntityType: notificationData.RelatedEntityType || null,
          RelatedEntityID: notificationData.RelatedEntityID || null,
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update notification
  updateNotification: async (id, notificationData) => {
    const { data, error } = await supabase
      .from("Notification")
      .update({
        ...notificationData,
      })
      .eq("NotificationID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete notification
  deleteNotification: async (id) => {
    const { error } = await supabase
      .from("Notification")
      .delete()
      .eq("NotificationID", id);

    return { error };
  },

  // Mark notification as read
  markAsRead: async (id) => {
    const { data, error } = await supabase
      .from("Notification")
      .update({
        IsRead: true,
        ReadAt: new Date().toISOString(),
      })
      .eq("NotificationID", id)
      .select()
      .single();

    return { data, error };
  },

  // Mark all notifications as read for current user
  markAllAsRead: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Notification")
      .update({
        IsRead: true,
        ReadAt: new Date().toISOString(),
      })
      .eq("UserID", user.id)
      .eq("IsRead", false)
      .select();

    return { data, error };
  },
};

// Real-time subscriptions
export const realtimeService = {
  // Subscribe to patient changes
  subscribeToPatients: (callback) => {
    return supabase
      .channel("patients_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Patients" },
        callback
      )
      .subscribe();
  },

  // Subscribe to medical record changes
  subscribeToMedicalRecords: (callback) => {
    return supabase
      .channel("medical_records_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "MedicalRecord" },
        callback
      )
      .subscribe();
  },

  // Subscribe to appointment changes
  subscribeToAppointments: (callback) => {
    return supabase
      .channel("appointments_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Appointment" },
        callback
      )
      .subscribe();
  },

  // Subscribe to staff changes
  subscribeToStaff: (callback) => {
    return supabase
      .channel("staff_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Staff" },
        callback
      )
      .subscribe();
  },

  // Subscribe to notifications for current user
  subscribeToMyNotifications: (callback) => {
    const channel = supabase
      .channel("my_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        async (payload) => {
          // Only show notifications for current user
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && payload.new.UserID === user.id) {
            callback(payload);
          }
        }
      )
      .subscribe();

    return channel;
  },

  // Unsubscribe from a channel
  unsubscribe: (channel) => {
    supabase.removeChannel(channel);
  },
};

// User services
export const userService = {
  // Get all users (admin only)
  getAllUsers: async () => {
    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get user by ID
  getUserById: async (id) => {
    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .eq("UserID", id)
      .single();

    return { data, error };
  },

  // Get user by email
  getUserByEmail: async (email) => {
    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .eq("Email", email)
      .single();

    return { data, error };
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .eq("UserID", user.id)
      .single();

    return { data, error };
  },

  // Update user profile
  updateUserProfile: async (id, userData) => {
    const { data, error } = await supabase
      .from("Users")
      .update({
        ...userData,
      })
      .eq("UserID", id)
      .select()
      .single();

    return { data, error };
  },

  // Update user role (admin only)
  updateUserRole: async (id, roleName) => {
    const { data, error } = await supabase
      .from("Users")
      .update({ RoleName: roleName })
      .eq("UserID", id)
      .select()
      .single();

    return { data, error };
  },
};

// Diagnosis services
export const diagnosisService = {
  // Get all diagnoses
  getAllDiagnoses: async () => {
    const { data, error } = await supabase
      .from("Diagnosis")
      .select("*")
      .order("DiagnosisName", { ascending: true });

    return { data, error };
  },

  // Get diagnosis by ID
  getDiagnosisById: async (id) => {
    const { data, error } = await supabase
      .from("Diagnosis")
      .select("*")
      .eq("DiagnosisID", id)
      .single();

    return { data, error };
  },

  // Create diagnosis
  createDiagnosis: async (diagnosisData) => {
    const { data, error } = await supabase
      .from("Diagnosis")
      .insert([diagnosisData])
      .select()
      .single();

    return { data, error };
  },

  // Update diagnosis
  updateDiagnosis: async (id, diagnosisData) => {
    const { data, error } = await supabase
      .from("Diagnosis")
      .update(diagnosisData)
      .eq("DiagnosisID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete diagnosis
  deleteDiagnosis: async (id) => {
    const { error } = await supabase
      .from("Diagnosis")
      .delete()
      .eq("DiagnosisID", id);

    return { error };
  },
};

// Treatment services
export const treatmentService = {
  // Get all treatments
  getAllTreatments: async () => {
    const { data, error } = await supabase
      .from("Treatment")
      .select("*")
      .order("TreatmentName", { ascending: true });

    return { data, error };
  },

  // Get treatment by ID
  getTreatmentById: async (id) => {
    const { data, error } = await supabase
      .from("Treatment")
      .select("*")
      .eq("TreatmentID", id)
      .single();

    return { data, error };
  },

  // Create treatment
  createTreatment: async (treatmentData) => {
    const { data, error } = await supabase
      .from("Treatment")
      .insert([treatmentData])
      .select()
      .single();

    return { data, error };
  },

  // Update treatment
  updateTreatment: async (id, treatmentData) => {
    const { data, error } = await supabase
      .from("Treatment")
      .update(treatmentData)
      .eq("TreatmentID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete treatment
  deleteTreatment: async (id) => {
    const { error } = await supabase
      .from("Treatment")
      .delete()
      .eq("TreatmentID", id);

    return { error };
  },
};

// Notes services
export const notesService = {
  // Get all notes for a patient
  getNotesByPatient: async (patientId) => {
    const { data, error } = await supabase
      .from("Notes")
      .select(
        `
        *,
        Staff!EnteredBy(FirstName, Surname)
      `
      )
      .eq("PatientID", patientId)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Get note by ID
  getNoteById: async (id) => {
    const { data, error } = await supabase
      .from("Notes")
      .select(
        `
        *,
        Patients!PatientID(FirstName, Surname),
        Staff!EnteredBy(FirstName, Surname)
      `
      )
      .eq("NoteID", id)
      .single();

    return { data, error };
  },

  // Create note
  createNote: async (noteData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    // Get staff ID for the current user
    const { data: staffData } = await supabase
      .from("Staff")
      .select("StaffID")
      .eq("UserID", user.id)
      .single();

    const { data, error } = await supabase
      .from("Notes")
      .insert([
        {
          ...noteData,
          EnteredBy: staffData?.StaffID || null,
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update note
  updateNote: async (id, noteData) => {
    const { data, error } = await supabase
      .from("Notes")
      .update(noteData)
      .eq("NoteID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete note
  deleteNote: async (id) => {
    const { error } = await supabase.from("Notes").delete().eq("NoteID", id);

    return { error };
  },
};

export default supabase;
