import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSupabase } from "../composables/useSupabase";

export const useAppointmentRequestsStore = defineStore(
  "appointmentRequests",
  () => {
    // State
    const appointmentRequests = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const realtimeSubscription = ref(null);

    // Getters
    const pendingRequests = computed(() =>
      appointmentRequests.value.filter(
        (request) => request.Status === "Pending"
      )
    );

    const approvedRequests = computed(() =>
      appointmentRequests.value.filter(
        (request) => request.Status === "Approved"
      )
    );

    const deniedRequests = computed(() =>
      appointmentRequests.value.filter((request) => request.Status === "Denied")
    );

    const todayRequests = computed(() => {
      const today = new Date().toDateString();
      return appointmentRequests.value.filter(
        (request) => new Date(request.DateTime).toDateString() === today
      );
    });

    const upcomingRequests = computed(() => {
      const now = new Date();
      return appointmentRequests.value.filter(
        (request) => new Date(request.DateTime) > now
      );
    });

    // Actions
    const fetchAppointmentRequests = async () => {
      loading.value = true;
      error.value = null;

      try {
        const { users } = useSupabase();
        const data = await users.getAllAppointmentRequests();

        // Transform data to match expected format
        appointmentRequests.value = data.map((appointment) => ({
          id: appointment.AppointmentID,
          patientId: appointment.PatientID,
          nurseId: appointment.ScheduledBy,
          requestedDate: appointment.DateTime,
          status: appointment.Status,
          notes: appointment.Notes,
          type: appointment.Type,
          duration: appointment.Duration,
          priority: appointment.Priority,
          reason: appointment.Reason,
          symptoms: appointment.Symptoms,
          patientName:
            appointment.Patients?.Users?.fullName || "Unknown Patient",
          patientContact: appointment.Patients?.ContactNumber || "",
          requestedBy: appointment.Staff?.Users?.fullName || "System",
          requestedAt: appointment.created_at,
          createdAt: appointment.created_at,
          updatedAt: appointment.updated_at,
        }));
      } catch (err) {
        error.value = err.message || "Failed to fetch appointment requests";
        console.error("Error fetching appointment requests:", err);
      } finally {
        loading.value = false;
      }
    };

    const createAppointmentRequest = async (requestData) => {
      loading.value = true;
      error.value = null;

      try {
        const { users } = useSupabase();

        // Transform data to match database schema
        const appointmentData = {
          PatientID: requestData.patientId,
          DateTime: requestData.requestedDate,
          Type: requestData.type,
          Duration: requestData.duration,
          Priority: requestData.priority,
          Reason: requestData.reason,
          Symptoms: requestData.symptoms,
          Notes: requestData.notes,
        };

        const newAppointment = await users.createAppointmentRequest(
          appointmentData
        );

        // Transform and add to local state
        const transformedAppointment = {
          id: newAppointment.AppointmentID,
          patientId: newAppointment.PatientID,
          nurseId: newAppointment.ScheduledBy,
          requestedDate: newAppointment.DateTime,
          status: newAppointment.Status,
          notes: newAppointment.Notes,
          type: newAppointment.Type,
          duration: newAppointment.Duration,
          priority: newAppointment.Priority,
          reason: newAppointment.Reason,
          symptoms: newAppointment.Symptoms,
          patientName: requestData.patientName,
          patientContact: requestData.patientContact,
          requestedBy: "Current User", // Will be updated when data is refreshed
          requestedAt: newAppointment.created_at,
          createdAt: newAppointment.created_at,
          updatedAt: newAppointment.updated_at,
        };

        appointmentRequests.value.push(transformedAppointment);
        return transformedAppointment;
      } catch (err) {
        error.value = err.message || "Failed to create appointment request";
        console.error("Error creating appointment request:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const approveRequest = async (requestId) => {
      loading.value = true;
      error.value = null;

      try {
        const { users } = useSupabase();
        await users.approveAppointmentRequest(requestId);

        // Update local state optimistically
        const request = appointmentRequests.value.find(
          (r) => r.id === requestId
        );
        if (request) {
          request.status = "Approved";
          request.updatedAt = new Date().toISOString();
        }
      } catch (err) {
        error.value = err.message || "Failed to approve appointment request";
        console.error("Error approving appointment request:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const denyRequest = async (requestId, reason) => {
      loading.value = true;
      error.value = null;

      try {
        const { users } = useSupabase();
        await users.denyAppointmentRequest(requestId, reason);

        // Update local state optimistically
        const request = appointmentRequests.value.find(
          (r) => r.id === requestId
        );
        if (request) {
          request.status = "Denied";
          request.notes = reason;
          request.updatedAt = new Date().toISOString();
        }
      } catch (err) {
        error.value = err.message || "Failed to deny appointment request";
        console.error("Error denying appointment request:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const updateRequest = async (requestId, updateData) => {
      loading.value = true;
      error.value = null;

      try {
        const { users } = useSupabase();

        // Transform data to match database schema
        const appointmentData = {};
        if (updateData.requestedDate)
          appointmentData.DateTime = updateData.requestedDate;
        if (updateData.type) appointmentData.Type = updateData.type;
        if (updateData.duration) appointmentData.Duration = updateData.duration;
        if (updateData.priority) appointmentData.Priority = updateData.priority;
        if (updateData.reason) appointmentData.Reason = updateData.reason;
        if (updateData.symptoms) appointmentData.Symptoms = updateData.symptoms;
        if (updateData.notes) appointmentData.Notes = updateData.notes;

        await users.updateAppointmentRequest(requestId, appointmentData);

        // Update local state optimistically
        const request = appointmentRequests.value.find(
          (r) => r.id === requestId
        );
        if (request) {
          Object.assign(request, updateData);
          request.updatedAt = new Date().toISOString();
        }
      } catch (err) {
        error.value = err.message || "Failed to update appointment request";
        console.error("Error updating appointment request:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const setupRealtimeSubscription = async () => {
      if (realtimeSubscription.value) {
        return; // Already subscribed
      }

      try {
        const { users } = useSupabase();

        const subscription = await users.subscribeToAppointmentRequests(
          (payload) => {
            console.log("Realtime appointment update:", payload);

            if (payload.eventType === "INSERT") {
              // Add new appointment request
              const newRequest = {
                id: payload.new.AppointmentID,
                patientId: payload.new.PatientID,
                nurseId: payload.new.ScheduledBy,
                requestedDate: payload.new.DateTime,
                status: payload.new.Status,
                notes: payload.new.Notes,
                type: payload.new.Type,
                duration: payload.new.Duration,
                priority: payload.new.Priority,
                reason: payload.new.Reason,
                symptoms: payload.new.Symptoms,
                patientName: "Loading...", // Will be updated when full data is fetched
                patientContact: "",
                requestedBy: "System",
                requestedAt: payload.new.created_at,
                createdAt: payload.new.created_at,
                updatedAt: payload.new.updated_at,
              };
              appointmentRequests.value.push(newRequest);
            } else if (payload.eventType === "UPDATE") {
              // Update existing appointment request
              const existingRequest = appointmentRequests.value.find(
                (r) => r.id === payload.new.AppointmentID
              );
              if (existingRequest) {
                Object.assign(existingRequest, {
                  status: payload.new.Status,
                  notes: payload.new.Notes,
                  requestedDate: payload.new.DateTime,
                  type: payload.new.Type,
                  duration: payload.new.Duration,
                  priority: payload.new.Priority,
                  reason: payload.new.Reason,
                  symptoms: payload.new.Symptoms,
                  updatedAt: payload.new.updated_at,
                });
              }
            } else if (payload.eventType === "DELETE") {
              // Remove appointment request
              appointmentRequests.value = appointmentRequests.value.filter(
                (r) => r.id !== payload.old.AppointmentID
              );
            }
          }
        );

        realtimeSubscription.value = subscription;
      } catch (err) {
        console.error("Error setting up realtime subscription:", err);
      }
    };

    const clearError = () => {
      error.value = null;
    };

    const reset = () => {
      appointmentRequests.value = [];
      loading.value = false;
      error.value = null;
      if (realtimeSubscription.value) {
        realtimeSubscription.value.unsubscribe();
        realtimeSubscription.value = null;
      }
    };

    return {
      // State
      appointmentRequests,
      loading,
      error,

      // Getters
      pendingRequests,
      approvedRequests,
      deniedRequests,
      todayRequests,
      upcomingRequests,

      // Actions
      fetchAppointmentRequests,
      createAppointmentRequest,
      approveRequest,
      denyRequest,
      updateRequest,
      setupRealtimeSubscription,
      clearError,
      reset,
    };
  }
);
