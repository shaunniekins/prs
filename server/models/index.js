import sequelize from "../config/database.js";

// Import all models
import Role from "./Role.js";
import Users from "./Users.js";
import Staff from "./Staff.js";
import Patients from "./Patients.js";
import Appointment from "./Appointment.js";
import Diagnosis from "./Diagnosis.js";
import Treatment from "./Treatment.js";
import Notes from "./Notes.js";
import MedicalRecord from "./MedicalRecord.js";
import Notification from "./Notification.js";

// Initialize associations for all models
const models = {
  Role,
  Users,
  Staff,
  Patients,
  Appointment,
  Diagnosis,
  Treatment,
  Notes,
  MedicalRecord,
  Notification,
};

// Export models and sequelize instance
export {
  sequelize,
  Role,
  Users,
  Staff,
  Patients,
  Appointment,
  Diagnosis,
  Treatment,
  Notes,
  MedicalRecord,
  Notification,
};

export default models;
