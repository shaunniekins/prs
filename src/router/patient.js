// Patient Views
import PatientDashboard from "../views/patient/Dashboard.vue";
import MyAppointments from "../views/patient/MyAppointments.vue";
import MyMedicalRecords from "../views/patient/MyMedicalRecords.vue";
import PatientNotifications from "../views/patient/Notifications.vue";

export const patientRoutes = [
  {
    path: "/patient",
    name: "PatientDashboard",
    component: PatientDashboard,
    meta: { requiresAuth: true, role: "patient" },
  },
  {
    path: "/patient/appointments",
    name: "MyAppointments",
    component: MyAppointments,
    meta: { requiresAuth: true, role: "patient" },
  },
  {
    path: "/patient/medical-records",
    name: "MyMedicalRecords",
    component: MyMedicalRecords,
    meta: { requiresAuth: true, role: "patient" },
  },
  {
    path: "/patient/notifications",
    name: "PatientNotifications",
    component: PatientNotifications,
    meta: { requiresAuth: true, role: "patient" },
  },
];
