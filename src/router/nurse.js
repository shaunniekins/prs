// Nurse Views
import NurseDashboard from "../views/nurse/Dashboard.vue";
import PatientManagement from "../views/nurse/PatientManagement.vue";
import NurseMedicalRecords from "../views/nurse/MedicalRecords.vue";
import AppointmentRequests from "../views/nurse/AppointmentRequests.vue";
import TreatmentDiagnosis from "../views/nurse/TreatmentDiagnosis.vue";
import ConsultationNotes from "../views/nurse/ConsultationNotes.vue";
import NurseNotifications from "../views/nurse/Notifications.vue";

export const nurseRoutes = [
  {
    path: "/nurse",
    name: "NurseDashboard",
    component: NurseDashboard,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/patient-management",
    name: "PatientManagement",
    component: PatientManagement,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/medical-records",
    name: "NurseMedicalRecords",
    component: NurseMedicalRecords,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/appointment-requests",
    name: "AppointmentRequests",
    component: AppointmentRequests,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/treatment-diagnosis",
    name: "TreatmentDiagnosis",
    component: TreatmentDiagnosis,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/consultation-notes",
    name: "ConsultationNotes",
    component: ConsultationNotes,
    meta: { requiresAuth: true, role: "nurse" },
  },
  {
    path: "/nurse/notifications",
    name: "NurseNotifications",
    component: NurseNotifications,
    meta: { requiresAuth: true, role: "nurse" },
  },
];
