<script setup>
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "../../composables/useSupabase.js";
import { useAuthStore } from "../../stores/auth.js";

const {
  consultationNotes: consultationNotesOps,
  patients: patientOps,
  staff: staffOps,
} = useSupabase();
const authStore = useAuthStore();

// Reactive data
const loading = ref(false);
const search = ref("");
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const selectedNote = ref(null);
const filterType = ref("all");
const consultationNotes = ref([]);
const patientsList = ref([]);
const currentStaff = ref(null); // Current logged-in staff record
const error = ref(null);
const operationError = ref(null);

// Form data
const noteForm = ref({
  patientId: "",
  patientName: "",
  appointmentId: "",
  type: "Consultation",
  subject: "",
  content: "",
  vitalSigns: {
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
  },
  assessment: "",
  plan: "",
  followUp: "",
  status: "Draft",
});

// Helper function to get field values from either Supabase or mock data structure
const getNoteField = (note, field) => {
  const fieldMap = {
    id: "NoteID",
    patientName: "PatientName",
    staffName: "StaffName",
    type: "Type",
    subject: "Subject",
    content: "Content",
    status: "Status",
    createdAt: "CreatedAt",
    updatedAt: "UpdatedAt",
    patientId: "PatientID",
    appointmentId: "AppointmentID",
    enteredBy: "EnteredBy",
    vitalSigns: "VitalSigns",
    assessment: "Assessment",
    plan: "Plan",
    followUp: "FollowUp",
  };

  const supabaseField = fieldMap[field];
  return note[supabaseField] !== undefined ? note[supabaseField] : note[field];
};

const filteredNotes = computed(() => {
  return consultationNotes.value.filter((note) => {
    const patientName = getNoteField(note, "patientName");
    const staffName = getNoteField(note, "staffName");
    const subject = getNoteField(note, "subject");
    const content = getNoteField(note, "content");
    const type = getNoteField(note, "type");

    const matchesSearch =
      patientName.toLowerCase().includes(search.value.toLowerCase()) ||
      staffName.toLowerCase().includes(search.value.toLowerCase()) ||
      subject.toLowerCase().includes(search.value.toLowerCase()) ||
      content.toLowerCase().includes(search.value.toLowerCase());

    const matchesType =
      filterType.value === "all" || type.toLowerCase() === filterType.value;

    return matchesSearch && matchesType;
  });
});

const draftNotes = computed(() => {
  return consultationNotes.value.filter((note) => {
    const status = getNoteField(note, "status");
    return status === "Draft";
  });
});

// Methods
const fetchNotes = async () => {
  loading.value = true;
  error.value = null;
  try {
    const notes = await consultationNotesOps.getAllConsultationNotes();
    consultationNotes.value = notes || [];

    // Fetch patients for the dropdown
    const patientsData = await patientOps.getAllPatients();
    patientsList.value = patientsData || [];

    // Fetch current staff record for the logged-in user
    if (authStore.user?.id) {
      try {
        const staffData = await staffOps.getStaffByUserId(authStore.user.id);
        currentStaff.value = staffData;
      } catch (staffErr) {
        console.warn("Could not fetch staff record:", staffErr);
        currentStaff.value = null;
      }
    }
  } catch (err) {
    console.error("Error fetching consultation notes:", err);
    error.value = "Failed to load consultation notes. Please try again.";
    consultationNotes.value = [];
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  noteForm.value = {
    patientId: "",
    patientName: "",
    appointmentId: "",
    type: "Consultation",
    subject: "",
    content: "",
    vitalSigns: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
    },
    assessment: "",
    plan: "",
    followUp: "",
    status: "Draft",
  };
};

const openAddModal = () => {
  resetForm();
  selectedNote.value = null;
  showAddModal.value = true;
};

const openEditModal = (note) => {
  // Close view modal if open
  showViewModal.value = false;

  selectedNote.value = note;
  noteForm.value = {
    patientId: getNoteField(note, "patientId"),
    patientName: getNoteField(note, "patientName"),
    appointmentId: getNoteField(note, "appointmentId"),
    type: getNoteField(note, "type"),
    subject: getNoteField(note, "subject"),
    content: getNoteField(note, "content"),
    vitalSigns: { ...(getNoteField(note, "vitalSigns") || {}) },
    assessment: getNoteField(note, "assessment"),
    plan: getNoteField(note, "plan"),
    followUp: getNoteField(note, "followUp"),
    status: getNoteField(note, "status"),
  };
  showEditModal.value = true;
};

const openViewModal = (note) => {
  selectedNote.value = note;
  showViewModal.value = true;
};

const closeModals = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  showViewModal.value = false;
  selectedNote.value = null;
  resetForm();
};

// Helper to get patient name from ID
const getPatientNameById = (patientId) => {
  const patient = patientsList.value.find((p) => p.PatientID === patientId);
  if (patient) {
    return `${patient.FirstName || ""} ${patient.Surname || ""}`.trim();
  }
  return "Unknown Patient";
};

const addNote = async () => {
  operationError.value = null;
  try {
    // Get patient name from selected patient ID
    const patientName = getPatientNameById(noteForm.value.patientId);

    const noteData = {
      PatientID: noteForm.value.patientId,
      PatientName: patientName,
      AppointmentID: noteForm.value.appointmentId || null,
      EnteredBy: currentStaff.value?.StaffID || null, // Staff ID from Staff table
      StaffName:
        authStore.user?.fullName || authStore.user?.username || "Current Nurse",
      Type: noteForm.value.type,
      Subject: noteForm.value.subject,
      Content: noteForm.value.content,
      VitalSigns: noteForm.value.vitalSigns,
      Assessment: noteForm.value.assessment,
      Plan: noteForm.value.plan,
      FollowUp: noteForm.value.followUp,
      Status: noteForm.value.status,
    };

    const newNote = await consultationNotesOps.createConsultationNote(noteData);

    if (newNote) {
      consultationNotes.value.push(newNote);
      closeModals();
    } else {
      operationError.value =
        "Failed to create note. Please check your input and try again.";
    }
  } catch (error) {
    console.error("Error adding note:", error);
    operationError.value = "Failed to create note. Please try again.";
  }
};

const updateNote = async () => {
  operationError.value = null;
  try {
    // Get patient name from selected patient ID
    const patientName = getPatientNameById(noteForm.value.patientId);

    const noteData = {
      PatientID: noteForm.value.patientId,
      PatientName: patientName,
      AppointmentID: noteForm.value.appointmentId || null,
      EnteredBy: currentStaff.value?.StaffID || null, // Staff ID from Staff table
      StaffName:
        authStore.user?.fullName || authStore.user?.username || "Current Nurse",
      Type: noteForm.value.type,
      Subject: noteForm.value.subject,
      Content: noteForm.value.content,
      VitalSigns: noteForm.value.vitalSigns,
      Assessment: noteForm.value.assessment,
      Plan: noteForm.value.plan,
      FollowUp: noteForm.value.followUp,
      Status: noteForm.value.status,
    };

    const updatedNote = await consultationNotesOps.updateConsultationNote(
      selectedNote.value.NoteID || selectedNote.value.id,
      noteData,
    );

    if (updatedNote) {
      const index = consultationNotes.value.findIndex(
        (n) =>
          (n.NoteID || n.id) ===
          (selectedNote.value.NoteID || selectedNote.value.id),
      );
      if (index !== -1) {
        consultationNotes.value[index] = updatedNote;
      }
      closeModals();
    } else {
      operationError.value =
        "Failed to update note. Please check your input and try again.";
    }
  } catch (error) {
    console.error("Error updating note:", error);
    operationError.value = "Failed to update note. Please try again.";
  }
};

const getStatusBadgeVariant = (status) => {
  const variants = {
    Draft: "warning",
    Final: "success",
    Amended: "info",
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
  return new Date(dateTime).toLocaleString();
};

const exportNote = (note) => {
  const patientName = getNoteField(note, "patientName");
  const staffName = getNoteField(note, "staffName");
  const noteType = getNoteField(note, "type");
  const subject = getNoteField(note, "subject");
  const content = getNoteField(note, "content");
  const assessment = getNoteField(note, "assessment");
  const plan = getNoteField(note, "plan");
  const followUp = getNoteField(note, "followUp");
  const status = getNoteField(note, "status");
  const createdAt = getNoteField(note, "createdAt");
  const vitalSigns = getNoteField(note, "vitalSigns") || {};

  const exportText = `
CONSULTATION NOTE EXPORT
========================

Patient: ${patientName}
Healthcare Provider: ${staffName}
Date: ${formatDateTime(createdAt)}
Type: ${noteType}
Status: ${status}

Subject: ${subject}

Content:
${content || "N/A"}

Assessment:
${assessment || "N/A"}

Plan:
${plan || "N/A"}

Follow-up:
${followUp || "N/A"}

Vital Signs:
${vitalSigns.bloodPressure ? `Blood Pressure: ${vitalSigns.bloodPressure}` : ""}
${vitalSigns.heartRate ? `Heart Rate: ${vitalSigns.heartRate}` : ""}
${vitalSigns.temperature ? `Temperature: ${vitalSigns.temperature}` : ""}
${vitalSigns.weight ? `Weight: ${vitalSigns.weight}` : ""}
${vitalSigns.height ? `Height: ${vitalSigns.height}` : ""}

Generated on: ${new Date().toLocaleString()}
  `.trim();

  const blob = new Blob([exportText], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consultation-note-${getNoteField(note, "id")}-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const printNote = (note) => {
  const patientName = getNoteField(note, "patientName");
  const staffName = getNoteField(note, "staffName");
  const noteType = getNoteField(note, "type");
  const subject = getNoteField(note, "subject");
  const content = getNoteField(note, "content");
  const assessment = getNoteField(note, "assessment");
  const plan = getNoteField(note, "plan");
  const followUp = getNoteField(note, "followUp");
  const status = getNoteField(note, "status");
  const createdAt = getNoteField(note, "createdAt");
  const vitalSigns = getNoteField(note, "vitalSigns") || {};

  const printContent = `
    <html>
      <head>
        <title>Consultation Note - ${patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
          .header h1 { margin: 0; color: #333; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; }
          .content { white-space: pre-wrap; background: #f9f9f9; padding: 10px; border-radius: 5px; }
          .vital-signs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
          .vital-sign { padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
          .badge-primary { background: #0d6efd; color: white; }
          .badge-success { background: #198754; color: white; }
          .badge-warning { background: #ffc107; color: #333; }
          .footer { border-top: 1px solid #ddd; margin-top: 30px; padding-top: 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Consultation Note</h1>
          <p><span class="label">Patient:</span> ${patientName}</p>
          <p><span class="label">Provider:</span> ${staffName}</p>
          <p><span class="label">Date:</span> ${formatDateTime(createdAt)}</p>
          <p><span class="label">Type:</span> <span class="badge badge-primary">${noteType}</span> <span class="label" style="margin-left: 15px;">Status:</span> <span class="badge badge-${status === "Final" ? "success" : "warning"}">${status}</span></p>
        </div>
        
        <div class="section">
          <div class="section-title">Subject</div>
          <p>${subject}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Content</div>
          <div class="content">${content || "N/A"}</div>
        </div>
        
        ${
          assessment
            ? `
        <div class="section">
          <div class="section-title">Assessment</div>
          <div class="content">${assessment}</div>
        </div>`
            : ""
        }
        
        ${
          plan
            ? `
        <div class="section">
          <div class="section-title">Plan</div>
          <div class="content">${plan}</div>
        </div>`
            : ""
        }
        
        ${
          followUp
            ? `
        <div class="section">
          <div class="section-title">Follow-up</div>
          <div class="content">${followUp}</div>
        </div>`
            : ""
        }
        
        ${
          Object.values(vitalSigns).some((v) => v)
            ? `
        <div class="section">
          <div class="section-title">Vital Signs</div>
          <div class="vital-signs">
            ${vitalSigns.bloodPressure ? `<div class="vital-sign"><span class="label">Blood Pressure:</span> ${vitalSigns.bloodPressure}</div>` : ""}
            ${vitalSigns.heartRate ? `<div class="vital-sign"><span class="label">Heart Rate:</span> ${vitalSigns.heartRate}</div>` : ""}
            ${vitalSigns.temperature ? `<div class="vital-sign"><span class="label">Temperature:</span> ${vitalSigns.temperature}</div>` : ""}
            ${vitalSigns.weight ? `<div class="vital-sign"><span class="label">Weight:</span> ${vitalSigns.weight}</div>` : ""}
            ${vitalSigns.height ? `<div class="vital-sign"><span class="label">Height:</span> ${vitalSigns.height}</div>` : ""}
          </div>
        </div>`
            : ""
        }
        
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};

onMounted(async () => {
  // Ensure auth is initialized before fetching data
  if (!authStore.isInitialized) {
    await authStore.initializeAuth();
  }

  if (authStore.isAuthenticated) {
    await fetchNotes();
  }
});
</script>

<template>
  <div class="consultation-notes">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="mb-2 animate-fade-in-left">Consultation Notes</h1>
        <p class="text-muted mb-0 animate-fade-in-left animation-delay-100">
          Create and manage patient consultation notes
        </p>
      </div>
      <div class="animate-fade-in-right">
        <button class="btn btn-primary" @click="openAddModal">
          <i class="bi bi-plus-circle me-2"></i>
          New Consultation Note
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-journal-text text-primary fs-2"></i>
            </div>
            <h4 class="mb-1">{{ consultationNotes.length }}</h4>
            <small class="text-muted">Total Notes</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-100">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-pencil text-warning fs-2"></i>
            </div>
            <h4 class="mb-1">{{ draftNotes.length }}</h4>
            <small class="text-muted">Draft Notes</small>
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
              {{ filteredNotes.filter((n) => n.status === "Final").length }}
            </h4>
            <small class="text-muted">Final Notes</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card animate-fade-in-up animation-delay-300">
          <div class="card-body text-center">
            <div class="stats-icon mb-2">
              <i class="bi bi-clock text-info fs-2"></i>
            </div>
            <h4 class="mb-1">
              {{
                consultationNotes.filter(
                  (n) =>
                    new Date(getNoteField(n, "createdAt")) >
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ).length
              }}
            </h4>
            <small class="text-muted">Recent (7 days)</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Draft Notes Alert -->
    <div
      v-if="draftNotes.length > 0"
      class="alert alert-warning animate-fade-in-up animation-delay-200"
    >
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center">
          <div class="alert-icon me-3">
            <i class="bi bi-exclamation-triangle text-warning fs-4"></i>
          </div>
          <div class="grow">
            <h6 class="alert-heading mb-1">Draft Notes Require Completion</h6>
            <p class="mb-0">
              You have {{ draftNotes.length }} draft note(s) that need to be
              finalized.
            </p>
          </div>
        </div>
        <button class="btn btn-warning btn-sm">
          <i class="bi bi-eye me-1"></i>
          Review Drafts
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card mb-4 animate-fade-in-up animation-delay-300">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="form-control"
                placeholder="Search notes by patient, staff, or content..."
              />
            </div>
          </div>
          <div class="col-md-6">
            <select v-model="filterType" class="form-select">
              <option value="all">All Types</option>
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="vaccination">Vaccination</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="alert alert-danger animate-fade-in-up"
      role="alert"
    >
      <div class="d-flex align-items-center">
        <div class="alert-icon me-3">
          <i class="bi bi-exclamation-triangle text-danger fs-4"></i>
        </div>
        <div class="grow">
          <h6 class="alert-heading mb-1">Error Loading Notes</h6>
          <p class="mb-0">{{ error }}</p>
        </div>
        <button class="btn btn-danger btn-sm" @click="fetchNotes">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Retry
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary animate-pulse" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading consultation notes...</p>
    </div>

    <!-- Notes Table -->
    <div v-else class="card animate-fade-in-up animation-delay-400">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">
          <i class="bi bi-journal-text me-2"></i>
          Consultation Notes ({{ filteredNotes.length }})
        </h5>
        <button
          class="btn btn-sm btn-outline-primary"
          @click="fetchNotes"
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
                <th>Healthcare Provider</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Date Created</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="note in filteredNotes"
                :key="getNoteField(note, 'id')"
                class="animate-fade-in-up"
              >
                <td>
                  <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                      <div class="fw-medium">
                        {{ getNoteField(note, "patientName") }}
                      </div>
                      <small class="text-muted"
                        >ID: {{ getNoteField(note, "patientId") }}</small
                      >
                    </div>
                  </div>
                </td>
                <td>
                  <div class="fw-medium">
                    {{ getNoteField(note, "staffName") }}
                  </div>
                  <small class="text-muted">{{
                    formatDateTime(getNoteField(note, "createdAt"))
                  }}</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getTypeBadgeVariant(
                      getNoteField(note, 'type'),
                    )}`"
                  >
                    {{ getNoteField(note, "type") }}
                  </span>
                </td>
                <td>
                  <div class="fw-medium">
                    {{ getNoteField(note, "subject") }}
                  </div>
                  <small class="text-muted"
                    >{{
                      getNoteField(note, "content").substring(0, 60)
                    }}...</small
                  >
                </td>
                <td>
                  <span
                    class="badge"
                    :class="`bg-${getStatusBadgeVariant(
                      getNoteField(note, 'status'),
                    )}`"
                  >
                    {{ getNoteField(note, "status") }}
                  </span>
                </td>
                <td>
                  {{
                    new Date(
                      getNoteField(note, "createdAt"),
                    ).toLocaleDateString()
                  }}
                </td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-info"
                      @click="openViewModal(note)"
                      title="View Note"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="openEditModal(note)"
                      title="Edit Note"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-success"
                      @click="exportNote(note)"
                      title="Export Note"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="printNote(note)"
                      title="Print Note"
                    >
                      <i class="bi bi-printer"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredNotes.length === 0" class="text-center py-5">
          <i class="bi bi-journal-x text-muted fs-1 mb-3"></i>
          <h5 class="text-muted">No consultation notes found</h5>
          <p class="text-muted mb-3">
            {{
              search
                ? "Try adjusting your search criteria."
                : "No consultation notes have been created yet."
            }}
          </p>
          <button v-if="!search" class="btn btn-primary" @click="openAddModal">
            <i class="bi bi-plus-circle me-2"></i>
            Create First Note
          </button>
        </div>
      </div>
    </div>

    <!-- Add Note Modal -->
    <div
      class="modal fade"
      :class="{ show: showAddModal }"
      :style="{ display: showAddModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Create New Consultation Note
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="addNote">
            <div class="modal-body">
              <!-- Operation Error Alert -->
              <div
                v-if="operationError"
                class="alert alert-danger alert-dismissible fade show"
                role="alert"
              >
                <i class="bi bi-exclamation-triangle me-2"></i>
                {{ operationError }}
                <button
                  type="button"
                  class="btn-close"
                  @click="operationError = null"
                ></button>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="noteForm.patientId"
                    class="form-select"
                    required
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.FirstName }} {{ patient.Surname }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Note Type *</label>
                  <select v-model="noteForm.type" class="form-select" required>
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Subject *</label>
                  <input
                    v-model="noteForm.subject"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Consultation Content *</label>
                  <textarea
                    v-model="noteForm.content"
                    class="form-control"
                    rows="4"
                    required
                    placeholder="Detailed description of the consultation, patient presentation, and findings"
                  ></textarea>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Vital Signs</label>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure</label>
                  <input
                    v-model="noteForm.vitalSigns.bloodPressure"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="noteForm.vitalSigns.heartRate"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 72"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="noteForm.vitalSigns.temperature"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 36.8"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="noteForm.vitalSigns.weight"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 70"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="noteForm.vitalSigns.height"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 175"
                  />
                </div>

                <div class="col-md-12">
                  <label class="form-label">Assessment</label>
                  <textarea
                    v-model="noteForm.assessment"
                    class="form-control"
                    rows="2"
                    placeholder="Clinical assessment and impression"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Plan</label>
                  <textarea
                    v-model="noteForm.plan"
                    class="form-control"
                    rows="2"
                    placeholder="Treatment plan and recommendations"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Follow-up</label>
                  <input
                    v-model="noteForm.followUp"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 2 weeks, 3 months"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="noteForm.status" class="form-select">
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                  </select>
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
                Create Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Note Modal -->
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
              Edit Consultation Note
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <form @submit.prevent="updateNote">
            <div class="modal-body">
              <!-- Operation Error Alert -->
              <div
                v-if="operationError"
                class="alert alert-danger alert-dismissible fade show"
                role="alert"
              >
                <i class="bi bi-exclamation-triangle me-2"></i>
                {{ operationError }}
                <button
                  type="button"
                  class="btn-close"
                  @click="operationError = null"
                ></button>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Patient *</label>
                  <select
                    v-model="noteForm.patientId"
                    class="form-select"
                    required
                    disabled
                  >
                    <option value="">Select Patient</option>
                    <option
                      v-for="patient in patientsList"
                      :key="patient.PatientID"
                      :value="patient.PatientID"
                    >
                      {{ patient.FirstName }} {{ patient.Surname }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Note Type *</label>
                  <select v-model="noteForm.type" class="form-select" required>
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Subject *</label>
                  <input
                    v-model="noteForm.subject"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Consultation Content *</label>
                  <textarea
                    v-model="noteForm.content"
                    class="form-control"
                    rows="4"
                    required
                  ></textarea>
                </div>

                <div class="col-md-12">
                  <label class="form-label">Vital Signs</label>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Blood Pressure</label>
                  <input
                    v-model="noteForm.vitalSigns.bloodPressure"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Heart Rate (bpm)</label>
                  <input
                    v-model="noteForm.vitalSigns.heartRate"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Temperature (°C)</label>
                  <input
                    v-model="noteForm.vitalSigns.temperature"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Weight (kg)</label>
                  <input
                    v-model="noteForm.vitalSigns.weight"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Height (cm)</label>
                  <input
                    v-model="noteForm.vitalSigns.height"
                    type="text"
                    class="form-control"
                  />
                </div>

                <div class="col-md-12">
                  <label class="form-label">Assessment</label>
                  <textarea
                    v-model="noteForm.assessment"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Plan</label>
                  <textarea
                    v-model="noteForm.plan"
                    class="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Follow-up</label>
                  <input
                    v-model="noteForm.followUp"
                    type="text"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="noteForm.status" class="form-select">
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                    <option value="Amended">Amended</option>
                  </select>
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
                Update Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Note Modal -->
    <div
      class="modal fade"
      :class="{ show: showViewModal }"
      :style="{ display: showViewModal ? 'block' : 'none' }"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-journal-text me-2"></i>
              Consultation Note Details
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModals"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedNote">
            <div class="row g-3">
              <div class="col-md-12">
                <div
                  class="note-header d-flex align-items-center mb-4 p-3 bg-light rounded"
                >
                  <div class="patient-avatar-large me-3">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <div>
                    <h4 class="mb-1">
                      {{ getNoteField(selectedNote, "patientName") }}
                    </h4>
                    <p class="text-muted mb-1">
                      Patient ID: {{ getNoteField(selectedNote, "patientId") }}
                    </p>
                    <p class="text-muted mb-0">
                      Note ID: {{ getNoteField(selectedNote, "id") }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Note Information</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Healthcare Provider:</strong>
                    {{ getNoteField(selectedNote, "staffName") }}
                  </div>
                  <div class="info-item">
                    <strong>Note Type:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getTypeBadgeVariant(
                        getNoteField(selectedNote, 'type'),
                      )}`"
                    >
                      {{ getNoteField(selectedNote, "type") }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Created:</strong>
                    {{
                      formatDateTime(getNoteField(selectedNote, "createdAt"))
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Last Updated:</strong>
                    {{
                      formatDateTime(getNoteField(selectedNote, "updatedAt"))
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Status:</strong>
                    <span
                      class="badge ms-2"
                      :class="`bg-${getStatusBadgeVariant(
                        getNoteField(selectedNote, 'status'),
                      )}`"
                    >
                      {{ getNoteField(selectedNote, "status") }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-medium">Vital Signs</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Blood Pressure:</strong>
                    {{
                      getNoteField(selectedNote, "vitalSigns").bloodPressure ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Heart Rate:</strong>
                    {{
                      getNoteField(selectedNote, "vitalSigns").heartRate ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Temperature:</strong>
                    {{
                      getNoteField(selectedNote, "vitalSigns").temperature ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Weight:</strong>
                    {{
                      getNoteField(selectedNote, "vitalSigns").weight ||
                      "Not recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Height:</strong>
                    {{
                      getNoteField(selectedNote, "vitalSigns").height ||
                      "Not recorded"
                    }}
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <label class="form-label fw-medium">Consultation Details</label>
                <div class="info-group">
                  <div class="info-item">
                    <strong>Subject:</strong>
                    {{ getNoteField(selectedNote, "subject") }}
                  </div>
                  <div class="info-item">
                    <strong>Content:</strong>
                    {{ getNoteField(selectedNote, "content") }}
                  </div>
                  <div class="info-item">
                    <strong>Assessment:</strong>
                    {{
                      getNoteField(selectedNote, "assessment") ||
                      "No assessment recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Plan:</strong>
                    {{
                      getNoteField(selectedNote, "plan") || "No plan recorded"
                    }}
                  </div>
                  <div class="info-item">
                    <strong>Follow-up:</strong>
                    {{
                      getNoteField(selectedNote, "followUp") ||
                      "No follow-up scheduled"
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModals"
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="openEditModal(selectedNote)"
            >
              <i class="bi bi-pencil me-2"></i>
              Edit Note
            </button>
            <button
              type="button"
              class="btn btn-success"
              @click="exportNote(selectedNote)"
            >
              <i class="bi bi-download me-2"></i>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div
      v-if="showAddModal || showEditModal || showViewModal"
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

.patient-avatar-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.patient-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-gradient-start);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.stats-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
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

.note-header {
  background: linear-gradient(
    135deg,
    rgba(67, 97, 238, 0.1),
    rgba(63, 55, 201, 0.1)
  );
}

.info-group {
  background-color: rgba(0, 0, 0, 0.02);
  padding: 1rem;
  border-radius: 8px;
}

.info-item {
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.recent-note-card {
  background-color: var(--light-color);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.recent-note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.alert-icon {
  flex-shrink: 0;
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
}
</style>
