import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Supabase configuration - new key format only
const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Validate Supabase configuration
const validateSupabaseConfig = () => {
  if (!supabaseUrl) {
    console.error("❌ SUPABASE_URL environment variable is not set");
    throw new Error("Supabase URL not configured");
  }

  if (!supabasePublishableKey) {
    console.error(
      "❌ VITE_SUPABASE_PUBLISHABLE_KEY environment variable is not set",
    );
    throw new Error("Supabase publishable key not configured");
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    console.error(
      "❌ Invalid VITE_SUPABASE_PUBLISHABLE_KEY format. Should start with 'sb_publishable_'",
    );
    throw new Error("Invalid publishable key format");
  }

  if (!supabaseSecretKey) {
    console.error("❌ SUPABASE_SECRET_KEY environment variable is not set");
    throw new Error("Supabase secret key not configured");
  }

  if (!supabaseSecretKey.startsWith("sb_secret_")) {
    console.error(
      "❌ Invalid SUPABASE_SECRET_KEY format. Should start with 'sb_secret_'",
    );
    throw new Error("Invalid secret key format");
  }

  if (!supabaseUrl.includes("supabase.co")) {
    console.warn("⚠️ Supabase URL doesn't appear to be a valid Supabase URL");
  }

  // console.log("✅ Supabase server configuration validated");
  // console.log("   Publishable key: ✓");
  // console.log("   Secret key: ✓");
};

// Validate configuration on load
validateSupabaseConfig();

// Create Supabase client with publishable key for authentication operations
export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create Supabase client with publishable key for general data operations
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create Supabase admin client with service role key for admin operations (accessing auth.users)
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Patient services
export const patientService = {
  // Get all patients (staff only)
  async getAllPatients() {
    const { data, error } = await supabase.from("Patients").select("*");

    return { data, error };
  },

  // Get patient by ID
  async getPatientById(id) {
    const { data, error } = await supabase
      .from("Patients")
      .select(
        `
        *,
        Users!inner(fullName, Email)
      `,
      )
      .eq("PatientID", id)
      .single();

    return { data, error };
  },

  // Get patients for current user (patients only)
  async getMyPatients(userId) {
    const { data, error } = await supabase
      .from("Patients")
      .select("*")
      .eq("UserID", userId)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Create new patient
  async createPatient(patientData) {
    const { data, error } = await supabase
      .from("Patients")
      .insert([
        {
          ...patientData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update patient
  async updatePatient(id, patientData) {
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
  async deletePatient(id) {
    const { error } = await supabase
      .from("Patients")
      .delete()
      .eq("PatientID", id);

    return { error };
  },
};

// Appointment services
export const appointmentService = {
  // Get all appointments (staff only)
  async getAllAppointments() {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        ),
        Staff!inner(
          *,
          Users!inner(fullName)
        )
      `,
      )
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointment by ID
  async getAppointmentById(id) {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        ),
        Staff!inner(
          *,
          Users!inner(fullName)
        )
      `,
      )
      .eq("AppointmentID", id)
      .single();

    return { data, error };
  },

  // Get appointments for current patient
  async getMyAppointments(userId) {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(*),
        Staff!inner(
          *,
          Users!inner(fullName)
        )
      `,
      )
      .eq("Patients.UserID", userId)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointments for current staff
  async getMyStaffAppointments(userId) {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        ),
        Staff!inner(*)
      `,
      )
      .eq("Staff.UserID", userId)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Create new appointment
  async createAppointment(appointmentData) {
    const { data, error } = await supabase
      .from("Appointment")
      .insert([
        {
          ...appointmentData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update appointment
  async updateAppointment(id, appointmentData) {
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
  async deleteAppointment(id) {
    const { error } = await supabase
      .from("Appointment")
      .delete()
      .eq("AppointmentID", id);

    return { error };
  },

  // Get appointments by patient ID
  async getAppointmentsByPatient(patientId) {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Staff!inner(
          *,
          Users!inner(fullName)
        )
      `,
      )
      .eq("PatientID", patientId)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointments by staff ID
  async getAppointmentsByStaff(staffId) {
    const { data, error } = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        )
      `,
      )
      .eq("ScheduledBy", staffId)
      .order("DateTime", { ascending: true });

    return { data, error };
  },

  // Get appointments by date range (for cron jobs)
  async getAppointmentsByDateRange(startDate, endDate) {
    const { data, error } = await supabaseAdmin
      .from("Appointment")
      .select(
        `
        AppointmentID,
        DateTime,
        EndDateTime,
        Status,
        Reason,
        Notes,
        CreatedAt,
        PatientID,
        ScheduledBy,
        Patients!fk_appointment_patientid(
          PatientID,
          FirstName,
          Surname,
          ContactNumber,
          Users!Patients_UserID_fkey(Email, fullName)
        ),
        Staff!fk_appointment_scheduledby(
          FirstName,
          Surname,
          Specialization
        )
      `,
      )
      .gte("DateTime", startDate)
      .lt("DateTime", endDate)
      .order("DateTime", { ascending: true });

    return { data, error };
  },
};

// Staff services
export const staffService = {
  // Get all staff (admin only)
  // Using supabaseAdmin to bypass RLS since server doesn't have user session context
  // Using left join (no !inner) so staff are returned even without Users record
  async getAllStaff() {
    const { data, error } = await supabaseAdmin
      .from("Staff")
      .select(
        `
        *,
        Users(fullName, Email),
        Role(RoleName)
      `,
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get all staff with auth info (includes last_sign_in_at from auth.users)
  async getAllStaffWithAuthInfo() {
    // First get all staff data
    // Using supabaseAdmin to bypass RLS since server doesn't have user session context
    // Using left join (no !inner) so staff are returned even without Users record
    console.log(
      "📡 [staffService.getAllStaffWithAuthInfo] Querying Staff table...",
    );
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from("Staff")
      .select(
        `
        *,
        Users(fullName, Email, UserID),
        Role(RoleName)
      `,
      )
      .order("created_at", { ascending: false });

    console.log(
      "📊 [staffService.getAllStaffWithAuthInfo] Staff query result:",
      staffData?.length || 0,
      "records",
    );
    console.log(
      "📊 [staffService.getAllStaffWithAuthInfo] Staff query error:",
      staffError,
    );

    if (staffError) {
      console.error(
        "❌ [staffService.getAllStaffWithAuthInfo] Query error:",
        staffError,
      );
      return { data: null, error: staffError };
    }

    // Get auth users data with last_sign_in_at
    try {
      const { data: authUsersData, error: authError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        console.error("Error fetching auth users:", authError);
        // Return staff data without auth info if there's an error
        return { data: staffData, error: null };
      }

      // Create a map of auth users by ID for quick lookup
      const authUsersMap = new Map();
      if (authUsersData?.users) {
        authUsersData.users.forEach((user) => {
          authUsersMap.set(user.id, user);
        });
      }

      // Merge staff data with auth info
      const staffWithAuth = staffData.map((staff) => {
        const authUser = authUsersMap.get(staff.UserID);
        return {
          ...staff,
          Users: {
            ...staff.Users,
            last_sign_in_at: authUser?.last_sign_in_at || null,
          },
        };
      });

      return { data: staffWithAuth, error: null };
    } catch (err) {
      console.error("Error enriching staff with auth info:", err);
      // Return staff data without auth info if there's an error
      return { data: staffData, error: null };
    }
  },

  // Get staff by ID
  async getStaffById(id) {
    const { data, error } = await supabase
      .from("Staff")
      .select(
        `
        *,
        Users!inner(fullName, Email),
        Role(RoleName)
      `,
      )
      .eq("StaffID", id)
      .single();

    return { data, error };
  },

  // Create new staff member
  async createStaff(staffData) {
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
  async updateStaff(id, staffData) {
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
  async deleteStaff(id) {
    const { error } = await supabase.from("Staff").delete().eq("StaffID", id);

    return { error };
  },
};

// Medical Record services
export const medicalRecordService = {
  // Get all medical records (staff only)
  async getAllMedicalRecords() {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        ),
        Staff!inner(
          *,
          Users!inner(fullName)
        ),
        Diagnosis(*),
        Treatment(*)
      `,
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get medical record by ID
  async getMedicalRecordById(id) {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Patients!inner(
          *,
          Users!inner(fullName)
        ),
        Staff!inner(
          *,
          Users!inner(fullName)
        ),
        Diagnosis(*),
        Treatment(*)
      `,
      )
      .eq("MedicalRecordID", id)
      .single();

    return { data, error };
  },

  // Create new medical record
  async createMedicalRecord(medicalRecordData) {
    const { data, error } = await supabase
      .from("MedicalRecord")
      .insert([
        {
          ...medicalRecordData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update medical record
  async updateMedicalRecord(id, medicalRecordData) {
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
  async deleteMedicalRecord(id) {
    const { error } = await supabase
      .from("MedicalRecord")
      .delete()
      .eq("MedicalRecordID", id);

    return { error };
  },
};

// Notification services
export const notificationService = {
  // Get all notifications (staff only)
  async getAllNotifications() {
    const { data, error } = await supabase
      .from("Notification")
      .select(
        `
        *,
        Users!inner(fullName)
      `,
      )
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Get notifications for current user
  async getMyNotifications(userId) {
    const { data, error } = await supabase
      .from("Notification")
      .select("*")
      .eq("UserID", userId)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Create new notification
  async createNotification(notificationData) {
    const { data, error } = await supabase
      .from("Notification")
      .insert([
        {
          ...notificationData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update notification
  async updateNotification(id, notificationData) {
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
  async deleteNotification(id) {
    const { error } = await supabase
      .from("Notification")
      .delete()
      .eq("NotificationID", id);

    return { error };
  },

  // Mark notification as read
  async markAsRead(id) {
    const { data, error } = await supabase
      .from("Notification")
      .update({
        IsRead: true,
      })
      .eq("NotificationID", id)
      .select()
      .single();

    return { data, error };
  },

  // Get notifications by user ID
  async getNotificationsByUser(userId) {
    const { data, error } = await supabase
      .from("Notification")
      .select("*")
      .eq("UserID", userId)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },
};

// Diagnosis services
export const diagnosisService = {
  // Get all diagnoses
  async getAllDiagnoses() {
    const { data, error } = await supabase
      .from("Diagnosis")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get diagnosis by ID
  async getDiagnosisById(id) {
    const { data, error } = await supabase
      .from("Diagnosis")
      .select("*")
      .eq("DiagnosisID", id)
      .single();

    return { data, error };
  },

  // Create new diagnosis
  async createDiagnosis(diagnosisData) {
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

    return { data, error };
  },

  // Update diagnosis
  async updateDiagnosis(id, diagnosisData) {
    const { data, error } = await supabase
      .from("Diagnosis")
      .update({
        ...diagnosisData,
      })
      .eq("DiagnosisID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete diagnosis
  async deleteDiagnosis(id) {
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
  async getAllTreatments() {
    const { data, error } = await supabase
      .from("Treatment")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get treatment by ID
  async getTreatmentById(id) {
    const { data, error } = await supabase
      .from("Treatment")
      .select("*")
      .eq("TreatmentID", id)
      .single();

    return { data, error };
  },

  // Create new treatment
  async createTreatment(treatmentData) {
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

    return { data, error };
  },

  // Update treatment
  async updateTreatment(id, treatmentData) {
    const { data, error } = await supabase
      .from("Treatment")
      .update({
        ...treatmentData,
      })
      .eq("TreatmentID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete treatment
  async deleteTreatment(id) {
    const { error } = await supabase
      .from("Treatment")
      .delete()
      .eq("TreatmentID", id);

    return { error };
  },
};

// Notes services
export const notesService = {
  // Get all notes
  async getAllNotes() {
    const { data, error } = await supabase
      .from("Notes")
      .select("*")
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Get note by ID
  async getNoteById(id) {
    const { data, error } = await supabase
      .from("Notes")
      .select("*")
      .eq("NoteID", id)
      .single();

    return { data, error };
  },

  // Create new note
  async createNote(noteData) {
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

    return { data, error };
  },

  // Update note
  async updateNote(id, noteData) {
    const { data, error } = await supabase
      .from("Notes")
      .update({
        ...noteData,
        UpdatedAt: new Date().toISOString(),
      })
      .eq("NoteID", id)
      .select()
      .single();

    return { data, error };
  },

  // Delete note
  async deleteNote(id) {
    const { error } = await supabase.from("Notes").delete().eq("NoteID", id);

    return { error };
  },

  // Get notes by patient ID
  async getNotesByPatient(patientId) {
    const { data, error } = await supabase
      .from("Notes")
      .select("*")
      .eq("PatientID", patientId)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },

  // Get notes by staff ID
  async getNotesByStaff(staffId) {
    const { data, error } = await supabase
      .from("Notes")
      .select("*")
      .eq("EnteredBy", staffId)
      .order("CreatedAt", { ascending: false });

    return { data, error };
  },
};

export const authService = {
  async signUp(email, password, data) {
    const { data: user, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: data,
      },
    });
    return { user, error };
  },
  async getCurrentUser() {
    const { data, error } = await supabaseAuth.auth.getUser();
    return { data, error };
  },
};

// User services (authentication and user management)
export const userService = {
  // Authenticate user with Supabase Auth
  async authenticateUser(email, password) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Get current user
  async getCurrentUser(accessToken) {
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);
    return { data, error };
  },

  // Sign out user
  async signOut() {
    const { error } = await supabaseAuth.auth.signOut();
    return { error };
  },

  // Get user profile from Users table
  async getUserProfile(userId) {
    console.log("🔍 getUserProfile called with userId:", userId);
    const { data, error } = await supabase
      .from("Users")
      .select(
        `
        *,
        Role(RoleName)
      `,
      )
      .eq("UserID", userId)
      .single();

    if (error) {
      console.error("❌ getUserProfile error:", error);
    } else {
      console.log("✅ getUserProfile success:", data);
    }

    return { data, error };
  },

  // Create user profile in Users table (uses admin client to bypass RLS)
  async createUserProfile(userData) {
    const { data, error } = await supabaseAdmin
      .from("Users")
      .insert([
        {
          ...userData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Update user profile
  async updateUserProfile(userId, userData) {
    const { data, error } = await supabase
      .from("Users")
      .update({
        ...userData,
      })
      .eq("UserID", userId)
      .select()
      .single();

    return { data, error };
  },

  // Get all users (admin only)
  async getAllUsers() {
    const { data, error } = await supabase
      .from("Users")
      .select(
        `
        *,
        Role(RoleName)
      `,
      )
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get roles
  async getRoles() {
    console.log("🔍 getRoles called");
    const { data, error } = await supabase
      .from("Role")
      .select("*")
      .order("RoleName", { ascending: true });

    if (error) {
      console.error("❌ getRoles error:", error);
    } else {
      console.log("✅ getRoles success:", data);
    }

    return { data, error };
  },

  // Create user (admin only)
  async createUser(userData) {
    const { data, error } = await supabase
      .from("Users")
      .insert([
        {
          ...userData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Sign up user in Supabase Auth (uses admin client for server-side creation)
  async signUpUser(email, password, userData) {
    // Use admin API for server-side user creation
    // This auto-confirms the email and works properly from the server
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: userData,
    });
    return { data, error };
  },

  // Create patient profile in Patients table (uses admin client to bypass RLS)
  async createPatientProfile(patientData) {
    const { data, error } = await supabaseAdmin
      .from("Patients")
      .insert([
        {
          ...patientData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  },

  // Create staff profile in Staff table (uses admin client to bypass RLS)
  async createStaffProfile(staffData) {
    const { data, error } = await supabaseAdmin
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

  // Delete user profile from Users table
  async deleteUserProfile(userId) {
    const { error } = await supabase
      .from("Users")
      .delete()
      .eq("UserID", userId);

    return { error };
  },

  // Update user
  async updateUser(userId, userData) {
    const { data, error } = await supabase
      .from("Users")
      .update({
        ...userData,
      })
      .eq("UserID", userId)
      .select()
      .single();

    return { data, error };
  },

  // Delete user
  async deleteUser(userId) {
    // Delete from Supabase Auth (uses admin client)
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Error deleting user from Supabase Auth:", authError);
      return { error: authError };
    }

    // Delete from Users table (uses admin client to bypass RLS)
    const { error: dbError } = await supabaseAdmin
      .from("Users")
      .delete()
      .eq("UserID", userId);

    return { error: dbError };
  },
};

export default supabase;
