<script setup>
import { ref, computed, onMounted } from "vue";
import { Line, Bar, Doughnut } from "vue-chartjs";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuth } from "../../composables/useAuth.js";
import { useAuthStore } from "../../stores/auth.js";
import { useAuthGuard } from "../../composables/useAuthGuard.js";

// Initialize composables
const { reports: reportOps, users: userOps } = useSupabase();
const { requireAdminAccess } = useAuth();
const authStore = useAuthStore();
const { waitForAdminAccess, authError: guardError } = useAuthGuard();

// Reactive data
const loading = ref(false);
const error = ref(null);
const activeTab = ref("overview");
const showReportForm = ref(false);
const editingReport = ref(null);
const expandedReportId = ref(null);
const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0], // 30 days ago
  end: new Date().toISOString().split("T")[0], // today
});

// Date validation
const dateValidation = computed(() => {
  const errors = [];
  const startDate = new Date(dateRange.value.start);
  const endDate = new Date(dateRange.value.end);

  if (!dateRange.value.start) {
    errors.push("Start date is required");
  } else if (isNaN(startDate.getTime())) {
    errors.push("Start date is invalid");
  }

  if (!dateRange.value.end) {
    errors.push("End date is required");
  } else if (isNaN(endDate.getTime())) {
    errors.push("End date is invalid");
  }

  if (dateRange.value.start && dateRange.value.end && startDate > endDate) {
    errors.push("Start date cannot be after end date");
  }

  return errors;
});

// Reports data
const reportsList = ref([]);
const reportForm = ref({
  title: "",
  description: "",
  type: "summary",
  data: {},
  parameters: {},
});

// Analytics data (replaces mock data)
const reportData = ref({
  overview: {
    totalPatients: 0,
    totalStaff: 0,
    totalAppointments: 0,
    totalRecords: 0,
    growth: {
      patients: 0,
      appointments: 0,
      records: 0,
    },
  },
  appointments: {
    byStatus: [],
    byType: [],
    trends: [],
  },
  patients: {
    byGender: [],
    byAgeGroup: [],
    registrationTrends: [],
  },
  staff: {
    performance: [],
    workload: [],
    dailyWorkload: [],
  },
});

// Helper function for consistent date formatting (mm/dd/yyyy)
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Computed properties for displaying dates in MM/DD/YYYY format
const displayStartDate = computed({
  get: () => dateRange.value.start,
  set: (value) => {
    dateRange.value.start = value;
  },
});

const displayEndDate = computed({
  get: () => dateRange.value.end,
  set: (value) => {
    dateRange.value.end = value;
  },
});

// Methods

const fetchReportsList = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Fetch saved reports from Supabase
    const reports = await reportOps.getAllReports();
    reportsList.value = reports || [];
  } catch (err) {
    // If table doesn't exist yet, just use empty array
    console.warn("Could not fetch reports from database:", err.message);
    reportsList.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchOverviewStats = async () => {
  loading.value = true;
  error.value = null;
  try {
    const stats = await reportOps.getOverviewStats(
      dateRange.value.start,
      dateRange.value.end,
    );
    reportData.value.overview = {
      totalPatients: stats.totalPatients,
      totalStaff: stats.totalStaff,
      totalAppointments: stats.totalAppointments,
      totalRecords: stats.totalRecords,
      growth: {
        patients: 0, // TODO: Calculate growth from previous period
        appointments: 0,
        records: 0,
      },
    };
  } catch (err) {
    error.value = "Failed to fetch overview statistics: " + err.message;
    console.error("Error fetching overview stats:", err);
  } finally {
    loading.value = false;
  }
};

const fetchAppointmentAnalytics = async () => {
  loading.value = true;
  error.value = null;
  try {
    const analytics = await reportOps.getAppointmentAnalytics(
      dateRange.value.start,
      dateRange.value.end,
    );
    reportData.value.appointments = analytics;
  } catch (err) {
    error.value = "Failed to fetch appointment analytics: " + err.message;
    console.error("Error fetching appointment analytics:", err);
    // Provide fallback data to prevent chart errors
    reportData.value.appointments = {
      byStatus: [],
      byType: [],
      trends: [],
    };
  } finally {
    loading.value = false;
  }
};

const fetchPatientAnalytics = async () => {
  loading.value = true;
  error.value = null;
  try {
    const analytics = await reportOps.getPatientAnalytics(
      dateRange.value.start,
      dateRange.value.end,
    );
    reportData.value.patients = analytics;
  } catch (err) {
    error.value = "Failed to fetch patient analytics: " + err.message;
    console.error("Error fetching patient analytics:", err);
    // Provide fallback data to prevent chart errors
    reportData.value.patients = {
      byGender: [],
      byAgeGroup: [],
      registrationTrends: [],
    };
  } finally {
    loading.value = false;
  }
};

const fetchReportData = async () => {
  await Promise.all([
    fetchReportsList(),
    fetchOverviewStats(),
    fetchAppointmentAnalytics(),
    fetchPatientAnalytics(),
  ]);
};

// Fetch staff analytics (optional, for staff tab)
const fetchStaffAnalytics = async () => {
  loading.value = true;
  error.value = null;
  try {
    const analytics = await reportOps.getStaffAnalytics(
      dateRange.value.start,
      dateRange.value.end,
    );
    reportData.value.staff = analytics;
  } catch (err) {
    error.value = "Failed to fetch staff analytics: " + err.message;
    console.error("Error fetching staff analytics:", err);
    // Provide fallback data to prevent chart errors
    reportData.value.staff = {
      performance: [],
      workload: [],
      dailyWorkload: [],
    };
  } finally {
    loading.value = false;
  }
};

const generateCustomReport = async () => {
  loading.value = true;
  error.value = null;
  try {
    await fetchReportData();
  } catch (err) {
    error.value = "Failed to generate custom report: " + err.message;
    console.error("Error generating custom report:", err);
  } finally {
    loading.value = false;
  }
};

// Report CRUD operations
const createReport = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Capture current analytics data as a snapshot
    const snapshotData = {
      overview: { ...reportData.value.overview },
      appointments: {
        byStatus: [...reportData.value.appointments.byStatus],
        byType: [...reportData.value.appointments.byType],
        trends: [...reportData.value.appointments.trends],
      },
      patients: {
        byGender: [...reportData.value.patients.byGender],
        byAgeGroup: [...reportData.value.patients.byAgeGroup],
        registrationTrends: [...reportData.value.patients.registrationTrends],
      },
    };

    // Save to Supabase
    const newReport = await reportOps.createReport({
      Title: reportForm.value.title,
      Description: reportForm.value.description,
      ReportType: reportForm.value.type,
      Data: snapshotData,
      Parameters: {
        dateRange: { ...dateRange.value },
      },
    });

    // Refresh the reports list from database
    await fetchReportsList();

    showReportForm.value = false;
    resetReportForm();
    alert("Report saved successfully! View it in 'Manage Reports' tab.");
  } catch (err) {
    error.value = "Failed to create report: " + err.message;
    console.error("Error creating report:", err);
  } finally {
    loading.value = false;
  }
};

const updateReport = async () => {
  if (!editingReport.value) return;

  loading.value = true;
  error.value = null;
  try {
    const updatedReport = {
      ...editingReport.value,
      Title: reportForm.value.title,
      Description: reportForm.value.description,
      ReportType: reportForm.value.type,
      Data: reportForm.value.data,
      Parameters: {
        ...reportForm.value.parameters,
        dateRange: dateRange.value,
      },
    };

    const index = reportsList.value.findIndex(
      (r) => r.ReportID === editingReport.value.ReportID,
    );
    if (index !== -1) {
      reportsList.value[index] = updatedReport;
    }

    showReportForm.value = false;
    resetReportForm();
  } catch (err) {
    error.value = "Failed to update report: " + err.message;
    console.error("Error updating report:", err);
  } finally {
    loading.value = false;
  }
};

const deleteReport = async (reportId) => {
  if (!confirm("Are you sure you want to delete this report?")) return;

  loading.value = true;
  error.value = null;
  try {
    // Delete from Supabase
    await reportOps.deleteReport(reportId);

    // Refresh the reports list from database
    await fetchReportsList();
  } catch (err) {
    error.value = "Failed to delete report: " + err.message;
    console.error("Error deleting report:", err);
  } finally {
    loading.value = false;
  }
};

const editReport = (report) => {
  editingReport.value = report;
  reportForm.value = {
    title: report.Title || "",
    description: report.Description || "",
    type: report.ReportType || "summary",
    data: report.Data || {},
    parameters: report.Parameters || {},
  };
  showReportForm.value = true;
};

const resetReportForm = () => {
  reportForm.value = {
    title: "",
    description: "",
    type: "summary",
    data: {},
    parameters: {},
  };
  editingReport.value = null;
};

// Toggle report details expansion
const toggleReportDetails = (reportId) => {
  if (expandedReportId.value === reportId) {
    expandedReportId.value = null;
  } else {
    expandedReportId.value = reportId;
  }
};

// Export a saved report
const exportSavedReport = (report) => {
  if (!report.Data) {
    alert("This report has no data to export.");
    return;
  }

  const exportData = {
    reportTitle: report.Title,
    reportDescription: report.Description,
    reportType: report.ReportType,
    generatedAt: report.CreatedAt,
    generatedBy: report.GeneratedByNavigation?.fullName || "Admin",
    dateRange: report.Parameters?.dateRange || {},
    data: report.Data,
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = `${report.Title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.json`;

  const blob = new Blob([content], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const exportReport = (format) => {
  let content = "";
  let filename = "";
  let mimeType = "";

  // Prepare export data from current analytics
  const exportData = {
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: dateRange.value.start,
      end: dateRange.value.end,
    },
    overview: reportData.value.overview,
    appointments: reportData.value.appointments,
    patients: reportData.value.patients,
  };

  switch (format) {
    case "csv":
      content = convertAnalyticsToCSV(exportData);
      filename = `clinic_analytics_${new Date().toISOString().split("T")[0]}.csv`;
      mimeType = "text/csv";
      break;
    case "json":
      content = JSON.stringify(exportData, null, 2);
      filename = `clinic_analytics_${new Date().toISOString().split("T")[0]}.json`;
      mimeType = "application/json";
      break;
    default:
      alert(`Export format ${format} not yet implemented`);
      return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Convert analytics data to CSV format
const convertAnalyticsToCSV = (data) => {
  const lines = [];

  // Header info
  lines.push("Clinic Analytics Report");
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push(`Date Range: ${data.dateRange.start} to ${data.dateRange.end}`);
  lines.push("");

  // Overview section
  lines.push("=== OVERVIEW ===");
  lines.push(`Total Patients,${data.overview.totalPatients}`);
  lines.push(`Total Staff,${data.overview.totalStaff}`);
  lines.push(`Total Appointments,${data.overview.totalAppointments}`);
  lines.push(`Total Medical Records,${data.overview.totalRecords}`);
  lines.push("");

  // Appointment Status
  lines.push("=== APPOINTMENTS BY STATUS ===");
  lines.push("Status,Count");
  data.appointments.byStatus.forEach((item) => {
    lines.push(`${item.status},${item.count}`);
  });
  lines.push("");

  // Appointment Types
  lines.push("=== APPOINTMENTS BY TYPE ===");
  lines.push("Type,Count");
  data.appointments.byType.forEach((item) => {
    lines.push(`${item.type},${item.count}`);
  });
  lines.push("");

  // Appointment Trends
  lines.push("=== APPOINTMENT TRENDS (6 MONTHS) ===");
  lines.push("Month,Appointments");
  data.appointments.trends.forEach((item) => {
    lines.push(`${item.month},${item.appointments}`);
  });
  lines.push("");

  // Patient Gender
  lines.push("=== PATIENTS BY GENDER ===");
  lines.push("Gender,Count");
  data.patients.byGender.forEach((item) => {
    lines.push(`${item.gender},${item.count}`);
  });
  lines.push("");

  // Patient Age Groups
  lines.push("=== PATIENTS BY AGE GROUP ===");
  lines.push("Age Group,Count");
  data.patients.byAgeGroup.forEach((item) => {
    lines.push(`${item.group},${item.count}`);
  });
  lines.push("");

  // Patient Registration Trends
  lines.push("=== PATIENT REGISTRATION TRENDS ===");
  lines.push("Month,Registrations");
  data.patients.registrationTrends.forEach((item) => {
    lines.push(`${item.month},${item.registrations}`);
  });

  return lines.join("\n");
};

const convertToCSV = (data) => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          return typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
};

// Initialize data on component mount
const initializeData = () => {
  fetchReportData();
};

const getChartData = (data) => {
  return {
    labels: data.map(
      (item) =>
        item.status ||
        item.type ||
        item.group ||
        item.month ||
        item.name ||
        item.day,
    ),
    datasets: [
      {
        data: data.map(
          (item) =>
            item.count ||
            item.appointments ||
            item.registrations ||
            item.patients ||
            item.hours,
        ),
        backgroundColor: data.map((item) => item.color),
        borderWidth: 2,
      },
    ],
  };
};

const getLineChartData = (data, label) => {
  return {
    labels: data.map((item) => item.month || item.day),
    datasets: [
      {
        label: label,
        data: data.map(
          (item) => item.appointments || item.registrations || item.hours,
        ),
        borderColor: "#4361ee",
        backgroundColor: "rgba(67, 97, 238, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
};

// Chart configuration options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

// Chart data methods
const getAppointmentTrendsData = () => {
  return {
    labels: reportData.value.appointments.trends.map((item) => item.month),
    datasets: [
      {
        label: "Appointments",
        data: reportData.value.appointments.trends.map(
          (item) => item.appointments,
        ),
        borderColor: "#4361ee",
        backgroundColor: "rgba(67, 97, 238, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
};

const getAppointmentStatusData = () => {
  return {
    labels: reportData.value.appointments.byStatus.map((item) => item.status),
    datasets: [
      {
        data: reportData.value.appointments.byStatus.map((item) => item.count),
        backgroundColor: reportData.value.appointments.byStatus.map(
          (item) => item.color,
        ),
        borderWidth: 2,
      },
    ],
  };
};

const getAppointmentTypesData = () => {
  return {
    labels: reportData.value.appointments.byType.map((item) => item.type),
    datasets: [
      {
        label: "Appointments",
        data: reportData.value.appointments.byType.map((item) => item.count),
        backgroundColor: reportData.value.appointments.byType.map(
          (item) => item.color,
        ),
        borderWidth: 2,
      },
    ],
  };
};

const getPatientGenderData = () => {
  return {
    labels: reportData.value.patients.byGender.map((item) => item.gender),
    datasets: [
      {
        data: reportData.value.patients.byGender.map((item) => item.count),
        backgroundColor: reportData.value.patients.byGender.map(
          (item) => item.color,
        ),
        borderWidth: 2,
      },
    ],
  };
};

const getPatientAgeData = () => {
  return {
    labels: reportData.value.patients.byAgeGroup.map(
      (item) => item.group + " years",
    ),
    datasets: [
      {
        label: "Patients",
        data: reportData.value.patients.byAgeGroup.map((item) => item.count),
        backgroundColor: reportData.value.patients.byAgeGroup.map(
          (item) => item.color,
        ),
        borderWidth: 2,
      },
    ],
  };
};

const getRegistrationTrendsData = () => {
  return {
    labels: reportData.value.patients.registrationTrends.map(
      (item) => item.month,
    ),
    datasets: [
      {
        label: "Registrations",
        data: reportData.value.patients.registrationTrends.map(
          (item) => item.registrations,
        ),
        borderColor: "#4CAF50",
        backgroundColor: "rgba(76, 175, 80, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
};

const getWorkloadData = () => {
  return {
    labels: reportData.value.staff.workload.map((item) => item.day),
    datasets: [
      {
        label: "Hours",
        data: reportData.value.staff.workload.map((item) => item.hours),
        backgroundColor: "#FF9800",
        borderWidth: 1,
      },
    ],
  };
};

onMounted(async () => {
  try {
    loading.value = true;
    error.value = null;

    // Use the auth guard to wait for authentication with proper timing handling
    const { success, error: authErr } = await waitForAdminAccess();

    if (!success) {
      error.value = authErr || "Admin access required. Please log in again.";
      return;
    }

    await initializeData();
  } catch (err) {
    console.error("Error initializing reports:", err);
    error.value =
      err.message || "Failed to load reports. Please try refreshing the page.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="reports-analytics">
    <div class="container-fluid">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="mb-2 animate-fade-in-left">Reports & Analytics</h1>
          <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
            Comprehensive clinic statistics and insights
          </p>
        </div>
        <div class="animate-fade-in-right">
          <div class="btn-group me-2">
            <button
              class="btn btn-outline-primary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i class="bi bi-download me-2"></i>
              Export Report
            </button>
            <ul class="dropdown-menu">
              <li>
                <a class="dropdown-item" href="#" @click="exportReport('csv')"
                  ><i class="bi bi-file-earmark-spreadsheet me-2"></i>Export as
                  CSV</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" @click="exportReport('json')"
                  ><i class="bi bi-file-earmark-code me-2"></i>Export as JSON</a
                >
              </li>
            </ul>
          </div>
          <button
            class="btn btn-primary animate-fade-in-right"
            @click="showReportForm = true"
          >
            <i class="bi bi-plus-circle me-2"></i>
            Create Report
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      <div
        v-if="error"
        class="alert alert-danger alert-dismissible fade show animate-fade-in-up"
        role="alert"
      >
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ error }}
        <button type="button" class="btn-close" @click="error = null"></button>
      </div>

      <!-- Date Range Selector -->
      <div class="card mb-4 animate-fade-in-up">
        <div class="card-body">
          <div class="row g-3 align-items-center">
            <div class="col-md-4">
              <label for="startDate" class="form-label">Start Date</label>
              <input
                id="startDate"
                v-model="displayStartDate"
                type="date"
                class="form-control"
                :aria-invalid="dateValidation.length > 0"
                aria-describedby="dateError"
              />
            </div>
            <div class="col-md-4">
              <label for="endDate" class="form-label">End Date</label>
              <input
                id="endDate"
                v-model="displayEndDate"
                type="date"
                class="form-control"
                :aria-invalid="dateValidation.length > 0"
                aria-describedby="dateError"
              />
            </div>
            <div class="col-md-4">
              <label class="form-label">&nbsp;</label>
              <div class="d-grid">
                <button
                  class="btn btn-primary"
                  @click="generateCustomReport"
                  :disabled="dateValidation.length > 0"
                >
                  <i class="bi bi-bar-chart-line me-2"></i>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="dateValidation.length > 0"
            id="dateError"
            class="text-danger mt-2 small"
          >
            <i class="bi bi-exclamation-triangle me-1"></i>
            {{ dateValidation.join(". ") }}.
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <ul
        class="nav nav-tabs mb-4 animate-fade-in-up animation-delay-200"
        role="tablist"
      >
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'overview' }"
            @click="activeTab = 'overview'"
          >
            <i class="bi bi-speedometer2 me-2"></i>Overview
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'appointments' }"
            @click="activeTab = 'appointments'"
          >
            <i class="bi bi-calendar-check me-2"></i>Appointments
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'patients' }"
            @click="activeTab = 'patients'"
          >
            <i class="bi bi-people me-2"></i>Patients
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'reports' }"
            @click="activeTab = 'reports'"
          >
            <i class="bi bi-file-earmark-text me-2"></i>Manage Reports
          </button>
        </li>
      </ul>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary animate-pulse" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading report data...</p>
      </div>

      <!-- Overview Tab -->
      <div v-else-if="activeTab === 'overview'" class="animate-fade-in-up">
        <!-- Key Metrics -->
        <div class="row g-4 mb-4">
          <div class="col-xl-3 col-lg-6">
            <div class="card stats-card animate-fade-in-up">
              <div class="card-body text-center">
                <div class="stats-icon mb-3">
                  <i
                    class="bi bi-people-fill text-primary fs-1 animate-float"
                  ></i>
                </div>
                <h3 class="card-title text-primary mb-2">
                  {{ reportData.overview.totalPatients }}
                </h3>
                <p class="card-text text-muted mb-2">Total Patients</p>
                <small class="text-success">
                  <i class="bi bi-arrow-up"></i>
                  +{{ reportData.overview.growth.patients }}% from last month
                </small>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-lg-6">
            <div class="card stats-card animate-fade-in-up animation-delay-100">
              <div class="card-body text-center">
                <div class="stats-icon mb-3">
                  <i
                    class="bi bi-person-badge-fill text-info fs-1 animate-float"
                  ></i>
                </div>
                <h3 class="card-title text-info mb-2">
                  {{ reportData.overview.totalStaff }}
                </h3>
                <p class="card-text text-muted mb-2">Healthcare Staff</p>
                <small class="text-muted">All active and operational</small>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-lg-6">
            <div class="card stats-card animate-fade-in-up animation-delay-200">
              <div class="card-body text-center">
                <div class="stats-icon mb-3">
                  <i
                    class="bi bi-calendar-day-fill text-warning fs-1 animate-float"
                  ></i>
                </div>
                <h3 class="card-title text-warning mb-2">
                  {{ reportData.overview.totalAppointments }}
                </h3>
                <p class="card-text text-muted mb-2">Total Appointments</p>
                <small class="text-success">
                  <i class="bi bi-arrow-up"></i>
                  +{{ reportData.overview.growth.appointments }}% from last
                  month
                </small>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-lg-6">
            <div class="card stats-card animate-fade-in-up animation-delay-300">
              <div class="card-body text-center">
                <div class="stats-icon mb-3">
                  <i
                    class="bi bi-file-medical text-success fs-1 animate-float"
                  ></i>
                </div>
                <h3 class="card-title text-success mb-2">
                  {{ reportData.overview.totalRecords }}
                </h3>
                <p class="card-text text-muted mb-2">Medical Records</p>
                <small class="text-success">
                  <i class="bi bi-arrow-up"></i>
                  +{{ reportData.overview.growth.records }}% from last month
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="row g-4">
          <!-- Appointment Trends -->
          <div class="col-lg-8">
            <div class="card animate-fade-in-left">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-graph-up me-2"></i>
                  Appointment Trends (6 Months)
                </h5>
              </div>
              <div class="card-body">
                <Line
                  :data="getAppointmentTrendsData()"
                  :options="chartOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>

          <!-- Appointment Status Distribution -->
          <div class="col-lg-4">
            <div class="card animate-fade-in-right">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-pie-chart me-2"></i>
                  Appointment Status
                </h5>
              </div>
              <div class="card-body">
                <Doughnut
                  :data="getAppointmentStatusData()"
                  :options="doughnutOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Appointments Tab -->
      <div v-else-if="activeTab === 'appointments'" class="animate-fade-in-up">
        <div class="row g-4">
          <!-- Appointment Types -->
          <div class="col-lg-6">
            <div class="card animate-fade-in-left">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-bar-chart me-2"></i>
                  Appointments by Type
                </h5>
              </div>
              <div class="card-body">
                <Bar
                  :data="getAppointmentTypesData()"
                  :options="barOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>

          <!-- Appointment Trends -->
          <div class="col-lg-6">
            <div class="card animate-fade-in-right">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-graph-up me-2"></i>
                  Monthly Appointment Trends
                </h5>
              </div>
              <div class="card-body">
                <Line
                  :data="getAppointmentTrendsData()"
                  :options="chartOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Patients Tab -->
      <div v-else-if="activeTab === 'patients'" class="animate-fade-in-up">
        <div class="row g-4">
          <!-- Patient Demographics -->
          <div class="col-lg-6">
            <div class="card animate-fade-in-left">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-pie-chart me-2"></i>
                  Patient Demographics (Gender)
                </h5>
              </div>
              <div class="card-body">
                <Doughnut
                  :data="getPatientGenderData()"
                  :options="doughnutOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>

          <!-- Age Groups -->
          <div class="col-lg-6">
            <div class="card animate-fade-in-right">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="bi bi-bar-chart me-2"></i>
                  Patient Age Groups
                </h5>
              </div>
              <div class="card-body">
                <Bar
                  :data="getPatientAgeData()"
                  :options="barOptions"
                  class="chart-container"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Registration Trends -->
        <div class="card mt-4 animate-fade-in-up animation-delay-200">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-graph-up me-2"></i>
              Patient Registration Trends
            </h5>
          </div>
          <div class="card-body">
            <Line
              :data="getRegistrationTrendsData()"
              :options="chartOptions"
              class="chart-container"
            />
          </div>
        </div>
      </div>

      <!-- Reports Management Tab -->
      <div v-else-if="activeTab === 'reports'" class="animate-fade-in-up">
        <div class="card">
          <div
            class="card-header d-flex justify-content-between align-items-center"
          >
            <h5 class="mb-0">
              <i class="bi bi-file-earmark-text me-2"></i>
              Saved Reports
            </h5>
            <span class="badge bg-primary"
              >{{ reportsList.length }} Reports</span
            >
          </div>
          <div class="card-body">
            <!-- No reports message -->
            <div v-if="reportsList.length === 0" class="text-center py-5">
              <i class="bi bi-file-earmark-x text-muted fs-1 mb-3 d-block"></i>
              <h5 class="text-muted">No saved reports yet</h5>
              <p class="text-muted mb-3">
                Generate a report first, then click "Create Report" to save a
                snapshot.
              </p>
              <button class="btn btn-primary" @click="showReportForm = true">
                <i class="bi bi-plus-circle me-2"></i>
                Create Your First Report
              </button>
            </div>

            <!-- Reports list -->
            <div v-else class="reports-list">
              <div
                v-for="report in reportsList"
                :key="report.ReportID"
                class="report-card mb-4 p-3 border rounded"
              >
                <!-- Report Header -->
                <div
                  class="d-flex justify-content-between align-items-start mb-3"
                >
                  <div>
                    <h5 class="mb-1">
                      <i
                        class="bi bi-file-earmark-bar-graph me-2 text-primary"
                      ></i>
                      {{ report.Title }}
                    </h5>
                    <p class="text-muted mb-1 small">
                      {{ report.Description }}
                    </p>
                    <div class="d-flex gap-3 text-muted small">
                      <span>
                        <i class="bi bi-calendar me-1"></i>
                        {{ formatDate(report.CreatedAt) }}
                      </span>
                      <span>
                        <i class="bi bi-person me-1"></i>
                        {{ report.GeneratedByNavigation?.fullName || "Admin" }}
                      </span>
                      <span class="badge bg-secondary">{{
                        report.ReportType
                      }}</span>
                    </div>
                  </div>
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-info"
                      @click="toggleReportDetails(report.ReportID)"
                      :title="
                        expandedReportId === report.ReportID
                          ? 'Hide Details'
                          : 'View Details'
                      "
                    >
                      <i
                        :class="
                          expandedReportId === report.ReportID
                            ? 'bi bi-chevron-up'
                            : 'bi bi-eye'
                        "
                      ></i>
                    </button>
                    <button
                      class="btn btn-outline-success"
                      @click="exportSavedReport(report)"
                      title="Export Report"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="deleteReport(report.ReportID)"
                      title="Delete Report"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <!-- Report Data Preview (always visible) -->
                <div v-if="report.Data" class="row g-2 mb-2">
                  <div class="col-md-3">
                    <div class="stat-mini bg-light rounded p-2 text-center">
                      <div class="fw-bold text-primary">
                        {{ report.Data.overview?.totalPatients || 0 }}
                      </div>
                      <small class="text-muted">Patients</small>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-mini bg-light rounded p-2 text-center">
                      <div class="fw-bold text-info">
                        {{ report.Data.overview?.totalStaff || 0 }}
                      </div>
                      <small class="text-muted">Staff</small>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-mini bg-light rounded p-2 text-center">
                      <div class="fw-bold text-warning">
                        {{ report.Data.overview?.totalAppointments || 0 }}
                      </div>
                      <small class="text-muted">Appointments</small>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-mini bg-light rounded p-2 text-center">
                      <div class="fw-bold text-success">
                        {{ report.Data.overview?.totalRecords || 0 }}
                      </div>
                      <small class="text-muted">Records</small>
                    </div>
                  </div>
                </div>

                <!-- Expanded Report Details -->
                <div
                  v-if="expandedReportId === report.ReportID && report.Data"
                  class="mt-3 pt-3 border-top"
                >
                  <div class="row g-3">
                    <!-- Date Range -->
                    <div class="col-12">
                      <p class="text-muted small mb-2">
                        <i class="bi bi-calendar-range me-1"></i>
                        Report Date Range:
                        {{ report.Parameters?.dateRange?.start || "N/A" }} to
                        {{ report.Parameters?.dateRange?.end || "N/A" }}
                      </p>
                    </div>

                    <!-- Appointments by Status -->
                    <div class="col-md-6">
                      <h6 class="mb-2">
                        <i class="bi bi-pie-chart me-2"></i>Appointments by
                        Status
                      </h6>
                      <ul class="list-unstyled small">
                        <li
                          v-for="item in report.Data.appointments?.byStatus ||
                          []"
                          :key="item.status"
                          class="mb-1"
                        >
                          <span
                            class="badge me-2"
                            :style="{ backgroundColor: item.color }"
                            >{{ item.count }}</span
                          >
                          {{ item.status }}
                        </li>
                        <li
                          v-if="!report.Data.appointments?.byStatus?.length"
                          class="text-muted"
                        >
                          No data
                        </li>
                      </ul>
                    </div>

                    <!-- Appointments by Type -->
                    <div class="col-md-6">
                      <h6 class="mb-2">
                        <i class="bi bi-bar-chart me-2"></i>Appointments by Type
                      </h6>
                      <ul class="list-unstyled small">
                        <li
                          v-for="item in report.Data.appointments?.byType || []"
                          :key="item.type"
                          class="mb-1"
                        >
                          <span
                            class="badge me-2"
                            :style="{ backgroundColor: item.color }"
                            >{{ item.count }}</span
                          >
                          {{ item.type }}
                        </li>
                        <li
                          v-if="!report.Data.appointments?.byType?.length"
                          class="text-muted"
                        >
                          No data
                        </li>
                      </ul>
                    </div>

                    <!-- Patients by Gender -->
                    <div class="col-md-6">
                      <h6 class="mb-2">
                        <i class="bi bi-people me-2"></i>Patients by Gender
                      </h6>
                      <ul class="list-unstyled small">
                        <li
                          v-for="item in report.Data.patients?.byGender || []"
                          :key="item.gender"
                          class="mb-1"
                        >
                          <span
                            class="badge me-2"
                            :style="{ backgroundColor: item.color }"
                            >{{ item.count }}</span
                          >
                          {{ item.gender }}
                        </li>
                        <li
                          v-if="!report.Data.patients?.byGender?.length"
                          class="text-muted"
                        >
                          No data
                        </li>
                      </ul>
                    </div>

                    <!-- Patients by Age Group -->
                    <div class="col-md-6">
                      <h6 class="mb-2">
                        <i class="bi bi-bar-chart-steps me-2"></i>Patients by
                        Age Group
                      </h6>
                      <ul class="list-unstyled small">
                        <li
                          v-for="item in report.Data.patients?.byAgeGroup || []"
                          :key="item.group"
                          class="mb-1"
                        >
                          <span
                            class="badge me-2"
                            :style="{ backgroundColor: item.color }"
                            >{{ item.count }}</span
                          >
                          {{ item.group }} years
                        </li>
                        <li
                          v-if="!report.Data.patients?.byAgeGroup?.length"
                          class="text-muted"
                        >
                          No data
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Form Modal -->
    <div
      v-if="showReportForm"
      class="modal-overlay"
      @click="showReportForm = false"
    >
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-file-earmark-plus me-2"></i>
              {{ editingReport ? "Edit Report" : "Create New Report" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="showReportForm = false"
            ></button>
          </div>
          <div class="modal-body">
            <!-- Info about what Create Report does -->
            <div v-if="!editingReport" class="alert alert-info small mb-3">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Save a Snapshot:</strong> This will save the current
              analytics data (using the date range: {{ dateRange.start }} to
              {{ dateRange.end }}) as a report you can view later.
            </div>
            <form
              @submit.prevent="editingReport ? updateReport() : createReport()"
            >
              <div class="mb-3">
                <label for="reportTitle" class="form-label">Report Title</label>
                <input
                  id="reportTitle"
                  v-model="reportForm.title"
                  type="text"
                  class="form-control"
                  placeholder="Enter report title"
                  required
                />
              </div>
              <div class="mb-3">
                <label for="reportDescription" class="form-label"
                  >Description</label
                >
                <textarea
                  id="reportDescription"
                  v-model="reportForm.description"
                  class="form-control"
                  rows="3"
                  placeholder="Enter report description"
                ></textarea>
              </div>
              <div class="mb-3">
                <label for="reportType" class="form-label">Report Type</label>
                <select
                  id="reportType"
                  v-model="reportForm.type"
                  class="form-select"
                >
                  <option value="summary">Summary</option>
                  <option value="detailed">Detailed</option>
                  <option value="analytics">Analytics</option>
                  <!-- <option value="custom">Custom</option> -->
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Date Range</label>
                <div class="row g-2">
                  <div class="col-md-6">
                    <input
                      v-model="displayStartDate"
                      type="date"
                      class="form-control"
                      placeholder="Start Date"
                      :aria-invalid="dateValidation.length > 0"
                    />
                  </div>
                  <div class="col-md-6">
                    <input
                      v-model="displayEndDate"
                      type="date"
                      class="form-control"
                      placeholder="End Date"
                      :aria-invalid="dateValidation.length > 0"
                    />
                  </div>
                </div>
                <div
                  v-if="dateValidation.length > 0"
                  class="text-danger small mt-1"
                >
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  {{ dateValidation.join(". ") }}.
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showReportForm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="editingReport ? updateReport() : createReport()"
            >
              <i class="bi bi-check-lg me-2"></i>
              {{ editingReport ? "Update Report" : "Create Report" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Export dropdown z-index fix */
.btn-group .dropdown-menu {
  z-index: 1050;
}

/* Report card styles */
.report-card {
  transition: all 0.2s ease;
  background: #fff;
}

.report-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #dee2e6 !important;
}

.stat-mini {
  transition: all 0.2s ease;
}

.stat-mini:hover {
  transform: scale(1.02);
}

.stats-icon {
  position: relative;
}

.nav-tabs .nav-link {
  border: none;
  color: var(--text-color);
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
}

.nav-tabs .nav-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--primary-gradient-start);
}

.nav-tabs .nav-link.active {
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start),
    var(--primary-gradient-end)
  );
  color: white;
}

.chart-placeholder {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05));
  border-radius: 10px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.chart-container {
  width: 100% !important;
  height: 300px !important;
  position: relative;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.staff-avatar {
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

.rating {
  display: flex;
  align-items: center;
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

.workload-bar {
  width: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  backdrop-filter: blur(2px);
}

.modal-dialog {
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: none;
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(
    135deg,
    var(--primary-gradient-start, #4361ee),
    var(--primary-gradient-end, #3f37c9)
  );
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  font-weight: 600;
}

.modal-body {
  padding: 2rem;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 0 0 12px 12px;
}

/* Table Enhancements */
.table-responsive {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.table th {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: none;
  font-weight: 600;
  color: #495057;
  padding: 1rem 0.75rem;
}

.table td {
  padding: 1rem 0.75rem;
  vertical-align: middle;
  border-color: #e9ecef;
}

.table-hover tbody tr:hover {
  background-color: rgba(67, 97, 238, 0.02);
}

/* Button Enhancements */
.btn-group-sm .btn {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

.btn-outline-primary:hover {
  background-color: var(--primary-gradient-start, #4361ee);
  border-color: var(--primary-gradient-start, #4361ee);
}

.btn-outline-danger:hover {
  background-color: #dc3545;
  border-color: #dc3545;
}

/* Badge Styles */
.badge {
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
}

/* Validation styles */
.text-danger {
  color: #dc3545 !important;
}

.is-invalid {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .nav-tabs .nav-link {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .chart-placeholder {
    min-height: 200px;
  }

  .chart-container {
    height: 250px !important;
  }

  .modal-dialog {
    width: 95%;
    margin: 1rem;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .table-responsive {
    font-size: 0.875rem;
  }

  .btn-group-sm {
    flex-direction: column;
    gap: 0.25rem;
  }

  .btn-group-sm .btn {
    border-radius: 0.375rem !important;
  }
}
</style>
