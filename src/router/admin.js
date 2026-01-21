// Admin Views
import AdminDashboard from "../views/admin/Dashboard.vue";
import ManageStaff from "../views/admin/ManageStaff.vue";
import ManagePatients from "../views/admin/ManagePatients.vue";
import Appointments from "../views/admin/Appointments.vue";
import MedicalRecords from "../views/admin/MedicalRecords.vue";
import Notifications from "../views/admin/Notifications.vue";
import Reports from "../views/admin/Reports.vue";
import AccountCreation from "../views/admin/AccountCreation.vue";

export const adminRoutes = [
  {
    path: "/admin",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/staff",
    name: "ManageStaff",
    component: ManageStaff,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/patients",
    name: "ManagePatients",
    component: ManagePatients,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/appointments",
    name: "Appointments",
    component: Appointments,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/medical-records",
    name: "MedicalRecords",
    component: MedicalRecords,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/notifications",
    name: "AdminNotifications",
    component: Notifications,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/reports",
    name: "Reports",
    component: Reports,
    meta: { requiresAuth: true, role: "admin" },
  },
  {
    path: "/admin/account-creation",
    name: "AccountCreation",
    component: AccountCreation,
    meta: { requiresAuth: true, role: "admin" },
  },
];
