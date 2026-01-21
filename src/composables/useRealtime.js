import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../services/supabaseService.js";
import { useAuthStore } from "../stores/auth.js";

export const useRealtime = () => {
  const subscriptions = ref(new Map());
  const { user, isAuthenticated } = useAuthStore();

  // Subscribe to table changes
  const subscribeToTable = (table, callback, filter = null) => {
    if (!isAuthenticated.value) return null;

    const subscriptionKey = `${table}_${filter || "all"}`;

    // Remove existing subscription if any
    if (subscriptions.value.has(subscriptionKey)) {
      subscriptions.value.get(subscriptionKey).unsubscribe();
    }

    let subscription = supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload) => {
          console.log(`Real-time update for ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    subscriptions.value.set(subscriptionKey, subscription);
    return subscriptionKey;
  };

  // Subscribe to appointments for a specific user
  const subscribeToUserAppointments = (userId, callback) => {
    return subscribeToTable(
      "Appointment",
      callback,
      `ScheduledBy=eq.${userId}`
    );
  };

  // Subscribe to notifications for a specific user
  const subscribeToUserNotifications = (userId, callback) => {
    return subscribeToTable("Notification", callback, `UserID=eq.${userId}`);
  };

  // Subscribe to medical records for a specific patient
  const subscribeToPatientRecords = (patientId, callback) => {
    return subscribeToTable(
      "MedicalRecord",
      callback,
      `PatientID=eq.${patientId}`
    );
  };

  // Unsubscribe from a specific subscription
  const unsubscribe = (subscriptionKey) => {
    if (subscriptions.value.has(subscriptionKey)) {
      subscriptions.value.get(subscriptionKey).unsubscribe();
      subscriptions.value.delete(subscriptionKey);
    }
  };

  // Unsubscribe from all subscriptions
  const unsubscribeAll = () => {
    subscriptions.value.forEach((subscription) => {
      subscription.unsubscribe();
    });
    subscriptions.value.clear();
  };

  // Cleanup on component unmount
  onUnmounted(() => {
    unsubscribeAll();
  });

  return {
    subscribeToTable,
    subscribeToUserAppointments,
    subscribeToUserNotifications,
    subscribeToPatientRecords,
    unsubscribe,
    unsubscribeAll,
  };
};

export default useRealtime;
