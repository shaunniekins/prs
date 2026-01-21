import supabase, { handleSupabaseResponse } from "../config/database.js";

// Database service class to handle all CRUD operations with Supabase
class DatabaseService {
  // Role operations
  static async getRoles() {
    try {
      const response = await supabase.from("Role").select("*").order("RoleID");
      return handleSupabaseResponse(response);
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  static async createRole(roleData) {
    try {
      const response = await supabase
        .from("Role")
        .insert(roleData)
        .select()
        .single();
      return handleSupabaseResponse(response);
    } catch (error) {
      console.error("Error creating role:", error);
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  // User operations
  static async getUsers() {
    try {
      const response = await supabase
        .from("Users")
        .select("UserID, Username, Email, RoleID, CreatedAt")
        .order("CreatedAt", { ascending: false });

      if (response.error) {
        throw response.error;
      }

      // Get role information for each user
      const usersWithRoles = await Promise.all(
        response.data.map(async (user) => {
          const { data: roleData, error: roleError } = await supabase
            .from("Role")
            .select("RoleName")
            .eq("RoleID", user.RoleID)
            .single();

          if (roleError) {
            console.error("Error fetching role:", roleError);
            user.Role = null;
          } else {
            user.Role = roleData;
          }

          return user;
        })
      );

      return usersWithRoles;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  static async getUserById(userId) {
    try {
      const response = await supabase
        .from("Users")
        .select("UserID, Username, Password, Email, RoleID, CreatedAt")
        .eq("UserID", userId)
        .single();

      if (response.error) {
        throw response.error;
      }

      // Get role information separately
      if (response.data) {
        const { data: roleData, error: roleError } = await supabase
          .from("Role")
          .select("RoleName")
          .eq("RoleID", response.data.RoleID)
          .single();

        if (roleError) {
          console.error("Error fetching role:", roleError);
        } else {
          response.data.Role = roleData;
        }
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  static async getUserByUsername(username) {
    try {
      const response = await supabase
        .from("Users")
        .select("UserID, Username, Password, Email, RoleID, CreatedAt")
        .eq("Username", username)
        .single();

      if (response.error) {
        throw response.error;
      }

      // Get role information separately
      if (response.data) {
        const { data: roleData, error: roleError } = await supabase
          .from("Role")
          .select("RoleName")
          .eq("RoleID", response.data.RoleID)
          .single();

        if (roleError) {
          console.error("Error fetching role:", roleError);
        } else {
          response.data.Role = roleData;
        }
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching user by username:", error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  static async createUser(userData) {
    try {
      const response = await supabase
        .from("Users")
        .insert(userData)
        .select("UserID, Username, Email, RoleID, CreatedAt")
        .single();

      if (response.error) {
        throw response.error;
      }

      // Get role information separately
      if (response.data) {
        const { data: roleData, error: roleError } = await supabase
          .from("Role")
          .select("RoleName")
          .eq("RoleID", response.data.RoleID)
          .single();

        if (roleError) {
          console.error("Error fetching role:", roleError);
        } else {
          response.data.Role = roleData;
        }
      }

      return response.data;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  static async updateUser(userId, userData) {
    try {
      const response = await supabase
        .from("Users")
        .update(userData)
        .eq("UserID", userId)
        .select("UserID, Username, Email, RoleID, CreatedAt")
        .single();

      if (response.error) {
        throw response.error;
      }

      // Get role information separately
      if (response.data) {
        const { data: roleData, error: roleError } = await supabase
          .from("Role")
          .select("RoleName")
          .eq("RoleID", response.data.RoleID)
          .single();

        if (roleError) {
          console.error("Error fetching role:", roleError);
        } else {
          response.data.Role = roleData;
        }
      }

      return response.data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  static async deleteUser(userId) {
    const response = await supabase.from("Users").delete().eq("UserID", userId);
    return handleSupabaseResponse(response);
  }

  // Staff operations
  static async getStaff() {
    const response = await supabase
      .from("Staff")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .order("StaffID", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getStaffById(staffId) {
    const response = await supabase
      .from("Staff")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .eq("StaffID", staffId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async createStaff(staffData) {
    const response = await supabase
      .from("Staff")
      .insert(staffData)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updateStaff(staffId, staffData) {
    const response = await supabase
      .from("Staff")
      .update(staffData)
      .eq("StaffID", staffId)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deleteStaff(staffId) {
    const response = await supabase
      .from("Staff")
      .delete()
      .eq("StaffID", staffId);
    return handleSupabaseResponse(response);
  }

  // Patient operations
  static async getPatients() {
    const response = await supabase
      .from("Patients")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .order("PatientID", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getPatientById(patientId) {
    const response = await supabase
      .from("Patients")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .eq("PatientID", patientId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async createPatient(patientData) {
    const response = await supabase
      .from("Patients")
      .insert(patientData)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updatePatient(patientId, patientData) {
    const response = await supabase
      .from("Patients")
      .update(patientData)
      .eq("PatientID", patientId)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deletePatient(patientId) {
    const response = await supabase
      .from("Patients")
      .delete()
      .eq("PatientID", patientId);
    return handleSupabaseResponse(response);
  }

  // Appointment operations
  static async getAppointments() {
    const response = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Staff:ScheduledBy(*),
        Patients:PatientID(*)
      `
      )
      .order("DateTime");
    return handleSupabaseResponse(response);
  }

  static async getAppointmentById(appointmentId) {
    const response = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Staff:ScheduledBy(*),
        Patients:PatientID(*)
      `
      )
      .eq("AppointmentID", appointmentId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async getAppointmentsByPatient(patientId) {
    const response = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Staff:ScheduledBy(*)
      `
      )
      .eq("PatientID", patientId)
      .order("DateTime");
    return handleSupabaseResponse(response);
  }

  static async getAppointmentsByStaff(staffId) {
    const response = await supabase
      .from("Appointment")
      .select(
        `
        *,
        Patients:PatientID(*)
      `
      )
      .eq("ScheduledBy", staffId)
      .order("DateTime");
    return handleSupabaseResponse(response);
  }

  static async createAppointment(appointmentData) {
    const response = await supabase
      .from("Appointment")
      .insert(appointmentData)
      .select(
        `
        *,
        Staff:ScheduledBy(*),
        Patients:PatientID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updateAppointment(appointmentId, appointmentData) {
    const response = await supabase
      .from("Appointment")
      .update(appointmentData)
      .eq("AppointmentID", appointmentId)
      .select(
        `
        *,
        Staff:ScheduledBy(*),
        Patients:PatientID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deleteAppointment(appointmentId) {
    const response = await supabase
      .from("Appointment")
      .delete()
      .eq("AppointmentID", appointmentId);
    return handleSupabaseResponse(response);
  }

  // Medical Record operations
  static async getMedicalRecords() {
    const response = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Appointment:AppointmentID(*),
        EnteredByStaff:EnteredBy(*),
        Diagnosis:DiagnosisID(*),
        Treatment:TreatmentID(*),
        Notes:NoteID(*)
      `
      )
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getMedicalRecordById(recordId) {
    const response = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        Appointment:AppointmentID(*),
        EnteredByStaff:EnteredBy(*),
        Diagnosis:DiagnosisID(*),
        Treatment:TreatmentID(*),
        Notes:NoteID(*)
      `
      )
      .eq("RecordID", recordId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async getMedicalRecordsByAppointment(appointmentId) {
    const response = await supabase
      .from("MedicalRecord")
      .select(
        `
        *,
        EnteredByStaff:EnteredBy(*),
        Diagnosis:DiagnosisID(*),
        Treatment:TreatmentID(*),
        Notes:NoteID(*)
      `
      )
      .eq("AppointmentID", appointmentId)
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async createMedicalRecord(recordData) {
    const response = await supabase
      .from("MedicalRecord")
      .insert(recordData)
      .select(
        `
        *,
        Appointment:AppointmentID(*),
        EnteredByStaff:EnteredBy(*),
        Diagnosis:DiagnosisID(*),
        Treatment:TreatmentID(*),
        Notes:NoteID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updateMedicalRecord(recordId, recordData) {
    const response = await supabase
      .from("MedicalRecord")
      .update(recordData)
      .eq("RecordID", recordId)
      .select(
        `
        *,
        Appointment:AppointmentID(*),
        EnteredByStaff:EnteredBy(*),
        Diagnosis:DiagnosisID(*),
        Treatment:TreatmentID(*),
        Notes:NoteID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deleteMedicalRecord(recordId) {
    const response = await supabase
      .from("MedicalRecord")
      .delete()
      .eq("RecordID", recordId);
    return handleSupabaseResponse(response);
  }

  // Diagnosis operations
  static async getDiagnoses() {
    const response = await supabase
      .from("Diagnosis")
      .select("*")
      .order("DiagnosisID");
    return handleSupabaseResponse(response);
  }

  static async createDiagnosis(diagnosisData) {
    const response = await supabase
      .from("Diagnosis")
      .insert(diagnosisData)
      .select()
      .single();
    return handleSupabaseResponse(response);
  }

  // Treatment operations
  static async getTreatments() {
    const response = await supabase
      .from("Treatment")
      .select("*")
      .order("TreatmentID");
    return handleSupabaseResponse(response);
  }

  static async createTreatment(treatmentData) {
    const response = await supabase
      .from("Treatment")
      .insert(treatmentData)
      .select()
      .single();
    return handleSupabaseResponse(response);
  }

  // Notes operations
  static async getNotes() {
    const response = await supabase.from("Notes").select("*").order("NoteID");
    return handleSupabaseResponse(response);
  }

  static async createNote(noteData) {
    const response = await supabase
      .from("Notes")
      .insert(noteData)
      .select()
      .single();
    return handleSupabaseResponse(response);
  }

  // Notification operations
  static async getNotifications() {
    const response = await supabase
      .from("Notification")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getNotificationsByUser(userId) {
    const response = await supabase
      .from("Notification")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .eq("UserID", userId)
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getNotificationById(notificationId) {
    const response = await supabase
      .from("Notification")
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .eq("NotificationID", notificationId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async createNotification(notificationData) {
    const response = await supabase
      .from("Notification")
      .insert(notificationData)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updateNotification(notificationId, notificationData) {
    const response = await supabase
      .from("Notification")
      .update(notificationData)
      .eq("NotificationID", notificationId)
      .select(
        `
        *,
        Users:UserID(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deleteNotification(notificationId) {
    const response = await supabase
      .from("Notification")
      .delete()
      .eq("NotificationID", notificationId);
    return handleSupabaseResponse(response);
  }

  // Consultation Notes operations
  static async getConsultationNotes() {
    const response = await supabase
      .from("ConsultationNotes")
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getConsultationNoteById(noteId) {
    const response = await supabase
      .from("ConsultationNotes")
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .eq("NoteID", noteId)
      .single();
    return handleSupabaseResponse(response);
  }

  static async getConsultationNotesByPatient(patientId) {
    const response = await supabase
      .from("ConsultationNotes")
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .eq("PatientID", patientId)
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async getConsultationNotesByStaff(staffId) {
    const response = await supabase
      .from("ConsultationNotes")
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .eq("EnteredBy", staffId)
      .order("CreatedAt", { ascending: false });
    return handleSupabaseResponse(response);
  }

  static async createConsultationNote(noteData) {
    const response = await supabase
      .from("ConsultationNotes")
      .insert(noteData)
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async updateConsultationNote(noteId, noteData) {
    const response = await supabase
      .from("ConsultationNotes")
      .update(noteData)
      .eq("NoteID", noteId)
      .select(
        `
        *,
        Patient:PatientID(*),
        Staff:EnteredBy(*)
      `
      )
      .single();
    return handleSupabaseResponse(response);
  }

  static async deleteConsultationNote(noteId) {
    const response = await supabase
      .from("ConsultationNotes")
      .delete()
      .eq("NoteID", noteId);
    return handleSupabaseResponse(response);
  }
}

export default DatabaseService;
