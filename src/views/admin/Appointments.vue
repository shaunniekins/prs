<script setup>
import { ref, computed, onMounted } from "vue";
import useSupabase from "@/composables/useSupabase";
import { useAuthStore } from "@/stores/auth.js";

// Auth store
const authStore = useAuthStore();

// Initialize Supabase composable
const {
  appointments: appointmentOps,
  patients: patientOps,
  staff: staffOps,
  loading: supabaseLoading,
  error: supabaseError,
  requireRole,
} = useSupabase();

// Reactive data
const activeTab = ref("list");
const search = ref("");
const showScheduleModal = ref(false);
const showEditModal = ref(false);
const showCancelModal = ref(false);
const selectedAppointment = ref(null);
const viewMode = ref("list"); // 'list' or 'calendar'
const appointmentsList = ref([]);
const staffList = ref([]);
const patientsList = ref([]);
const errorMessage = ref("");
const loading = ref(false);

// Calendar-specific reactive data
const currentDate = ref(new Date());
const selectedDate = ref(null);
const showAppointmentDetailsModal = ref(false);

// Form data
const appointmentForm = ref({
  patientId: "",
  patientName: "",
  staffId: "",
  staffName: "",
  dateTime: "",
  reason: "",
  notes: "",
  type: "Consultation",
  duration: 30,
});

// Use Supabase data
const transformedAppointments = computed(() => {
  return appointmentsList.value;
});

const filteredAppointments = computed(() => {
  return transformedAppointments.value.filter(
    (appointment) =>
      appointment.patientName
        .toLowerCase()
        .includes(search.value.toLowerCase()) ||
      appointment.staffName
        .toLowerCase()
        .includes(search.value.toLowerCase()) ||
      (appointment.reason || "")
        .toLowerCase()
        .includes(search.value.toLowerCase()) ||
      (appointment.status || "")
        .toLowerCase()
        .includes(search.value.toLowerCase())
  );
});

const todayAppointments = computed(() => {
  const today = new Date().toDateString();
  return transformedAppointments.value.filter(
    (appointment) => new Date(appointment.dateTime).toDateString() === today
  );
});

const upcomingAppointments = computed(() => {
  const now = new Date();
  return transformedAppointments.value
    .filter(
      (appointment) =>
        new Date(appointment.dateTime) > now &&
        appointment.status !== "Cancelled"
    )
    .slice(0, 5);
});

// Calendar-specific computed properties
const currentMonth = computed(() => currentDate.value.getMonth());
const currentYear = computed(() => currentDate.value.getFullYear());

const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  // Start date (first day of the week for the first day of month)
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  const days = [];

  // Generate 6 weeks for the calendar
  for (let week = 0; week < 6; week++) {
    const weekDays = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + week * 7 + day);

      // Get appointments for this date
      const dayAppointments = transformedAppointments.value.filter(
        (appointment) => {
          const appointmentDate = new Date(appointment.dateTime);
          return appointmentDate.toDateString() === date.toDateString();
        }
      );

      weekDays.push({
        date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString(),
        appointments: dayAppointments,
      });
    }
    days.push(weekDays);
  }

  return days;
});

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentMonthName = computed(() => {
  return `${monthNames[currentMonth.value]} ${currentYear.value}`;
});

// Methods
const fetchAppointments = async () => {
  try {
    errorMessage.value = "";
    loading.value = true;

    // Fetch appointments from Supabase
    const appointments = await appointmentOps.getAllAppointments();
    appointmentsList.value = appointments;

    // Fetch staff and patients lists
    const [staff, patients] = await Promise.all([
      staffOps.getAllStaff(),
      patientOps.getAllPatients(),
    ]);
    staffList.value = staff;
    patientsList.value = patients;
  } catch (error) {
    console.error("Error loading appointments:", error);
    errorMessage.value =
      error.message || "Failed to load appointments. Please try again.";
  } finally {
    loading.value = false;
  }
};
const resetForm = () => {
  appointmentForm.value = {
    patientId: "",
    patientName: "",
    staffId: "",
    staffName: "",
    dateTime: "",
    reason: "",
    notes: "",
    type: "Consultation",
    duration: 30,
  };
};

const openScheduleModal = () => {
  resetForm();
  selectedAppointment.value = null;
  showScheduleModal.value = true;
};

const openEditModal = (appointment) => {
  selectedAppointment.value = appointment;

  // Find the staff member for the selected appointment
  const staffMember = staffList.value.find(
    (staff) => staff.StaffID === appointment.StaffID
  );

  // Populate form with appointment data
  appointmentForm.value = {
    patientId: appointment.PatientID,
    patientName: appointment.Patients?.Users?.fullName || "Unknown Patient",
    staffId: appointment.StaffID,
    staffName: staffMember?.Users?.fullName || "Unknown Staff",
    dateTime: appointment.DateTime,
    reason: appointment.Reason || "",
    notes: appointment.Notes || "",
    type: appointment.Type || "Consultation",
    duration: appointment.Duration || 30,
  };

  showEditModal.value = true;
};

const openCancelModal = (appointment) => {
  selectedAppointment.value = appointment;
  showCancelModal.value = true;
};

const closeModals = () => {
  showScheduleModal.value = false;
  showEditModal.value = false;
  showCancelModal.value = false;
  showAppointmentDetailsModal.value = false;
  selectedAppointment.value = null;
  selectedDate.value = null;
  resetForm();
};

// Helper function to find staff by name and role
const findStaffByName = (staffName) => {
  return staffList.value.find((staff) => staff.Users?.fullName === staffName);
};

const scheduleAppointment = async () => {
  try {
    // Find the staff based on the selected staff name
    const selectedStaff = findStaffByName(appointmentForm.value.staffName);

    if (!selectedStaff) {
      throw new Error("Please select a valid healthcare provider");
    }

    // Create appointment data for Supabase
    const appointmentData = {
      PatientID: appointmentForm.value.patientId,
      StaffID: selectedStaff.StaffID,
      DateTime: appointmentForm.value.dateTime,
      Reason: appointmentForm.value.reason,
      Notes: appointmentForm.value.notes,
      Type: appointmentForm.value.type,
      Duration: appointmentForm.value.duration,
      Status: "Pending",
    };

    // Create appointment using Supabase
    await appointmentOps.createAppointment(appointmentData);

    // Refresh the appointments list to show the new appointment
    await fetchAppointments();
    closeModals();
    console.log("Appointment scheduled successfully");
  } catch (error) {
    console.error("Error scheduling appointment:", error);
    errorMessage.value =
      error.message || "Failed to schedule appointment. Please try again.";
  }
};

const updateAppointment = async () => {
  try {
    // Find the staff based on the selected staff name
    const selectedStaff = findStaffByName(appointmentForm.value.staffName);

    if (!selectedStaff) {
      throw new Error("Please select a valid healthcare provider");
    }

    // Create appointment data for Supabase
    const appointmentData = {
      PatientID: appointmentForm.value.patientId,
      StaffID: selectedStaff.StaffID,
      DateTime: appointmentForm.value.dateTime,
      Reason: appointmentForm.value.reason,
      Notes: appointmentForm.value.notes,
      Type: appointmentForm.value.type,
      Duration: appointmentForm.value.duration,
      Status: appointmentForm.value.status || "Pending",
    };

    // Update appointment using Supabase
    await appointmentOps.updateAppointment(
      selectedAppointment.value.AppointmentID,
      appointmentData
    );

    // Refresh the appointments list to show the updated appointment
    await fetchAppointments();
    closeModals();
    console.log("Appointment updated successfully");
  } catch (error) {
    console.error("Error updating appointment:", error);
    errorMessage.value =
      error.message || "Failed to update appointment. Please try again.";
  }
};

const cancelAppointment = async () => {
  try {
    // Update appointment status to "Cancelled" using Supabase
    const updatedNotes = `${
      selectedAppointment.value.Notes || ""
    }\n\nCancelled on: ${new Date().toISOString()}`.trim();

    await appointmentOps.updateAppointment(
      selectedAppointment.value.AppointmentID,
      {
        Status: "Cancelled",
        Notes: updatedNotes,
      }
    );

    // Refresh the appointments list to show the cancelled appointment
    await fetchAppointments();
    closeModals();
    console.log("Appointment cancelled successfully");
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    errorMessage.value =
      error.message || "Failed to cancel appointment. Please try again.";
  }
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Confirmed: "success",
    Pending: "warning",
    Cancelled: "danger",
    Completed: "info",
  };
  return variants[status] || "secondary";
};

const getTypeBadgeVariant = (type) => {
  const variants = {
    Consultation: "primary",
    "Follow-up": "info",
    Vaccination: "success",
    Emergency: "danger",
  };
  return variants[type] || "secondary";
};

const formatDateTime = (dateTime) => {
  return new Date(dateTime).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const isToday = (dateTime) => {
  const today = new Date().toDateString();
  return new Date(dateTime).toDateString() === today;
};

const isUpcoming = (dateTime) => {
  const now = new Date();
  return new Date(dateTime) > now;
};

// Calendar-specific methods
const navigateMonth = (direction) => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + direction);
  currentDate.value = newDate;
};

const goToToday = () => {
  currentDate.value = new Date();
};

const selectDate = (day) => {
  selectedDate.value = day.date;
};

const openAppointmentDetails = (appointment) => {
  selectedAppointment.value = appointment;
  showAppointmentDetailsModal.value = true;
};

const closeAppointmentDetailsModal = () => {
  showAppointmentDetailsModal.value = false;
  selectedAppointment.value = null;
};

const scheduleAppointmentForDate = (date) => {
  selectedDate.value = date;
  openScheduleModal();
  // Pre-fill the date in the form
  const dateTime = new Date(date);
  dateTime.setHours(9, 0, 0, 0); // Default to 9 AM
  appointmentForm.value.dateTime = dateTime.toISOString().slice(0, 16);
};

// Initialize component
onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (!authStore.isAuthenticated || !authStore.user) {
    console.error("User not authenticated");
    return;
  }

  try {
    // Load appointments and related data
    await fetchAppointments();
  } catch (error) {
    console.error("Error initializing appointments:", error);
  }
});
</script>

<template>
  <div class="appointments-management">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Appointments</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Manage patient appointments and scheduling
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openScheduleModal">
          <i class="bi bi-calendar-plus me-2"></i>
          Schedule Appointment
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-day text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ todayAppointments.length }}</h4>
            <small class="text-muted">Today's Appointments</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredAppointments.filter((a) => a.status === "Pending")
                  .length
              }}
            </h4>
            <small class="text-muted">Pending Approvals</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-200">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-check-circle text-success fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                filteredAppointments.filter((a) => a.status === "Confirmed")
                  .length
              }}
            </h4>
            <small class="text-muted">Confirmed</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-calendar-week text-info fs-2"></i>
            </div>
            <h4 class="mb-1">{{ upcomingAppointments.length }}</h4>
            <small class="text-muted">Upcoming This Week</small>
          </div>
        </div>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="card mb-4 animate-fade-in-up animation-delay-200">
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-md-6">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search appointments by patient, staff, or reason..."
              />
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex justify-content-end gap-2">
              <div class="btn-group" role="group">
                <input
                  type="radio"
                  class="btn-check"
                  id="view-list"
                  v-model="viewMode"
                  value="list"
                  autocomplete="off"
                />
                <label class="btn btn-outline-primary btn-sm" for="view-list">
                  <i class="bi bi-list-ul me-1"></i>List
                </label>

                <input
                  type="radio"
                  class="btn-check"
                  id="view-calendar"
                  v-model="viewMode"
                  value="calendar"
                  autocomplete="off"
                />
                <label
                  class="btn btn-outline-primary btn-sm"
                  for="view-calendar"
                >
                  <i class="bi bi-calendar me-1"></i>Calendar
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="alert alert-danger alert-dismissible fade show"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ errorMessage }}
      <button
        type="button"
        class="btn-close"
        @click="errorMessage = ''"
      ></button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading && !errorMessage" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading appointments...</p>
    </div>

    <!-- Appointments List View -->
    <div
      v-else-if="viewMode === 'list'"
      class="card animate-fade-in-up animation-delay-300"
    >
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-calendar-event me-2"></i>
          All Appointments ({{ filteredAppointments.length }})
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchAppointments"
          :disabled="loading"
        >
          <i
            class="bi bi-arrow-clockwise me-1"
            :class="{ 'animate-spin': loading }"
          ></i>
          Refresh
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Patient</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reason</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="appointment in filteredAppointments"
                :key="appointment.id"
                class="animate-fade-in-up"
              >
                <td>
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">{{ appointment.patientName }}</div>
                      <small class="text-muted"
                        >ID: {{ appointment.patientId }}</small
                      >
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ formatDateTime(appointment.dateTime) }}</div>
                  <small
                    v-if="isToday(appointment.dateTime)"
                    class="badge bg-primary"
                    >Today</small
                  >
                  <small
                    v-else-if="isUpcoming(appointment.dateTime)"
                    class="badge bg-info"
                    >Upcoming</small
                  >
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getTypeBadgeVariant(appointment.type)}`"
                  >
                    {{ appointment.type }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                  >
                    {{ appointment.status }}
                  </span>
                </td>
                <td>
                  <div>{{ appointment.reason }}</div>
                  <small v-if="appointment.notes" class="text-muted">{{
                    appointment.notes
                  }}</small>
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="openEditModal(appointment)"
                      title="Edit Appointment"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      v-if="appointment.status !== 'Cancelled'"
                      class="btn btn-sm btn-outline-danger"
                      @click="openCancelModal(appointment)"
                      title="Cancel Appointment"
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredAppointments.length === 0" class="text-center py-5">
          <i class="bi bi-calendar-x text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No appointments found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : "No appointments scheduled yet."
            }}
          </p>
          <button
            v-if="!search"
            class="btn btn-primary"
            @click="openScheduleModal"
          >
            <i class="bi bi-calendar-plus me-2"></i>
            Schedule First Appointment
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-else class="card animate-fade-in-up animation-delay-300">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-calendar-week me-2"></i>
          {{ currentMonthName }}
        </h5>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" @click="goToToday">
            <i class="bi bi-calendar-day me-1"></i>
            Today
          </button>
          <div class="btn-group" role="group">
            <button
              class="btn btn-sm btn-outline-primary"
              @click="navigateMonth(-1)"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary"
              @click="navigateMonth(1)"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Calendar Grid -->
        <div class="calendar-grid">
          <!-- Days of week header -->
          <div class="calendar-header">
            <div
              v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="day"
              class="calendar-day-header"
            >
              {{ day }}
            </div>
          </div>

          <!-- Calendar days -->
          <div
            v-for="week in calendarDays"
            :key="week[0].date.getTime()"
            class="calendar-week"
          >
            <div
              v-for="day in week"
              :key="day.date.getTime()"
              class="calendar-day"
              :class="{
                'other-month': !day.isCurrentMonth,
                today: day.isToday,
                selected:
                  selectedDate &&
                  selectedDate.toDateString() === day.date.toDateString(),
                'has-appointments': day.appointments.length > 0,
              }"
              @click="selectDate(day)"
            >
              <div class="day-number">{{ day.day }}</div>
              <div class="appointments">
                <div
                  v-for="appointment in day.appointments.slice(0, 3)"
                  :key="appointment.id"
                  class="appointment-dot"
                  :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                  @click.stop="openAppointmentDetails(appointment)"
                  :title="`${appointment.patientName} - ${appointment.type}`"
                ></div>
                <div
                  v-if="day.appointments.length > 3"
                  class="more-appointments"
                  @click.stop="openAppointmentDetails(day.appointments[3])"
                >
                  +{{ day.appointments.length - 3 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected date info and quick actions -->
        <div
          v-if="selectedDate"
          class="selected-date-info mt-4 p-3 bg-light rounded"
        >
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">
              <i class="bi bi-calendar-date me-2"></i>
              {{ formatDateTime(selectedDate) }}
            </h6>
            <div class="btn-group" role="group">
              <button
                class="btn btn-sm btn-primary"
                @click="scheduleAppointmentForDate(selectedDate)"
              >
                <i class="bi bi-plus-circle me-1"></i>
                Schedule
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="selectedDate = null"
              >
                Clear
              </button>
            </div>
          </div>

          <!-- Appointments for selected date -->
          <div
            v-if="
              calendarDays
                .flat()
                .find(
                  (d) => d.date.toDateString() === selectedDate.toDateString()
                )?.appointments.length > 0
            "
          >
            <h6>Appointments:</h6>
            <div
              v-for="appointment in calendarDays
                .flat()
                .find(
                  (d) => d.date.toDateString() === selectedDate.toDateString()
                )?.appointments"
              :key="appointment.id"
              class="appointment-item d-flex justify-content-between align-items-center p-2 border rounded mb-2"
            >
              <div>
                <strong>{{ appointment.patientName }}</strong
                ><br />
                <small class="text-muted"
                  >{{ appointment.staffName }} - {{ appointment.type }}</small
                >
              </div>
              <div class="text-end">
                <span
                  class="badge me-2"
                  :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                >
                  {{ appointment.status }}
                </span>
                <div class="btn-group" role="group">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="openEditModal(appointment)"
                    title="Edit"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-if="appointment.status !== 'Cancelled'"
                    class="btn btn-sm btn-outline-danger"
                    @click="openCancelModal(appointment)"
                    title="Cancel"
                  >
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-muted mb-0">
            No appointments scheduled for this date.
          </p>
        </div>

        <!-- Upcoming appointments summary -->
        <div class="upcoming-appointments mt-4">
          <h6 class="mb-3">
            <i class="bi bi-clock-history me-2"></i>
            Upcoming Appointments
          </h6>
          <div
            v-for="appointment in upcomingAppointments"
            :key="appointment.id"
            class="appointment-card mb-2 p-3 border rounded"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>{{ appointment.patientName }}</strong
                ><br />
                <small class="text-muted">{{ appointment.staffName }}</small>
              </div>
              <div class="text-end">
                <small class="fw-medium">{{
                  formatDateTime(appointment.dateTime)
                }}</small
                ><br />
                <span
                  class="badge"
                  :class="`bg-${getStatusBadgeVariant(appointment.status)}`"
                >
                  {{ appointment.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule Appointment Modal -->
    <div
      class="modal fade"
      :class="{ show: showScheduleModal }"
      :style="{ display: showScheduleModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-plus me-2"></i>
              Schedule New Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="scheduleAppointment">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="appointmentForm.patientId"
                    class="form-select"
                    required
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.Users?.fullName || "Unknown Patient" }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Healthcare Provider *</label>
                  <select
                    v-model="appointmentForm.staffName"
                    class="form-select"
                    required
                  >
                    <option value="">Select Provider</option>
                    <option
                      v-for="staffMember in staffList"
                      :key="staffMember.StaffID"
                      :value="staffMember.Users?.fullName"
                    >
                      {{ staffMember.Users?.fullName }} -
                      {{ staffMember.Users?.RoleName }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Duration (minutes)</label>
                  <select
                    v-model="appointmentForm.duration"
                    class="form-select"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Appointment Type *</label>
                  <select
                    v-model="appointmentForm.type"
                    class="form-select"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Reason for Visit *</label>
                  <input
                    v-model="appointmentForm.reason"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="appointmentForm.notes"
                    class="form-control"
                    rows="3"
                    placeholder="Additional notes or special instructions"
                  ></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-calendar-plus me-2"></i>
                Schedule Appointment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Appointment Modal -->
    <div
      class="modal fade"
      :class="{ show: showEditModal }"
      :style="{ display: showEditModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Edit Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateAppointment">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="appointmentForm.patientId"
                    class="form-select"
                    required
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.Users?.fullName || "Unknown Patient" }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Healthcare Provider *</label>
                  <select
                    v-model="appointmentForm.staffName"
                    class="form-select"
                    required
                  >
                    <option value="">Select Provider</option>
                    <option
                      v-for="staffMember in staffList"
                      :key="staffMember.StaffID"
                      :value="staffMember.Users?.fullName"
                    >
                      {{ staffMember.Users?.fullName }} -
                      {{ staffMember.Users?.RoleName }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date & Time *</label>
                  <input
                    v-model="appointmentForm.dateTime"
                    type="datetime-local"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Duration (minutes)</label>
                  <select
                    v-model="appointmentForm.duration"
                    class="form-select"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Appointment Type *</label>
                  <select
                    v-model="appointmentForm.type"
                    class="form-select"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Reason for Visit *</label>
                  <input
                    v-model="appointmentForm.reason"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Notes</label>
                  <textarea
                    v-model="appointmentForm.notes"
                    class="form-control"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeModals"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-check-lg me-2"></i>
                Update Appointment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showCancelModal }"
      :style="{ display: showCancelModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Cancel Appointment
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to cancel this appointment?</p>
            <div v-if="selectedAppointment" class="alert alert-warning">
              <strong>{{ selectedAppointment.patientName }}</strong
              ><br />
              <small>{{ formatDateTime(selectedAppointment.dateTime) }}</small
              ><br />
              <small>{{ selectedAppointment.reason }}</small>
            </div>
            <p class="text-muted mb-0">
              This action will notify the patient and mark the appointment as
              cancelled.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModals"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              class="btn btn-danger"
              @click="cancelAppointment"
            >
              <i class="bi bi-x-circle me-2"></i>
              Cancel Appointment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showScheduleModal || showEditModal || showCancelModal"
      class="modal-backdrop fade show"
      @click="closeModals"
    ></div>
  </div>
</template>

<style scoped>
.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  z-index: 10;
}

.search-box input {
  padding-left: 40px;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.stats-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.table th {
  border-top: none;
  font-weight: 600;
  color: var(--text-color);
  background-color: rgba(0, 0, 0, 0.02);
}

.table td {
  vertical-align: middle;
  border-color: rgba(0, 0, 0, 0.05);
}

.calendar-placeholder {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05));
  border-radius: 10px;
}

.appointment-card {
  background-color: var(--light-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.appointment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Animation for spinner */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Calendar styles */
.calendar-grid {
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1px;
}

.calendar-day-header {
  background-color: var(--primary-color, #0d6efd);
  color: white;
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.calendar-day {
  background-color: white;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.calendar-day:hover {
  background-color: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.calendar-day.other-month {
  background-color: #f8f9fa;
  color: #6c757d;
}

.calendar-day.today {
  background-color: #e3f2fd;
  border-color: var(--primary-color, #0d6efd);
}

.calendar-day.selected {
  background-color: var(--primary-color, #0d6efd);
  color: white;
}

.calendar-day.has-appointments {
  border-left: 4px solid var(--success-color, #198754);
}

.day-number {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.appointments {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.appointment-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.appointment-dot:hover {
  transform: scale(1.5);
}

.more-appointments {
  font-size: 0.75rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0.125rem;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  margin-top: 0.125rem;
}

.calendar-day.selected .more-appointments {
  color: white;
  background-color: rgba(255, 255, 255, 0.2);
}

.selected-date-info {
  border: 1px solid #dee2e6;
}

.appointment-item {
  background-color: white;
  transition: background-color 0.2s ease;
}

.appointment-item:hover {
  background-color: #f8f9fa;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .btn {
    flex: 1;
  }

  .calendar-day {
    min-height: 80px;
    padding: 0.25rem;
  }

  .day-number {
    font-size: 0.75rem;
  }

  .appointment-dot {
    width: 6px;
    height: 6px;
  }

  .more-appointments {
    font-size: 0.625rem;
  }
}
</style>
