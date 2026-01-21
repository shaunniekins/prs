import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Staff from "./Staff.js";
import Patients from "./Patients.js";

const Appointment = sequelize.define(
  "Appointment",
  {
    AppointmentID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "AppointmentID",
    },
    ScheduledBy: {
      type: DataTypes.INTEGER,
      references: {
        model: Staff,
        key: "StaffID",
      },
      field: "ScheduledBy",
    },
    PatientID: {
      type: DataTypes.INTEGER,
      references: {
        model: Patients,
        key: "PatientID",
      },
      field: "PatientID",
    },
    DateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "DateTime",
    },
    Status: {
      type: DataTypes.STRING(50),
      defaultValue: "pending",
      field: "Status",
    },
    Reason: {
      type: DataTypes.TEXT,
      field: "Reason",
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "CreatedAt",
    },
  },
  {
    tableName: "Appointment",
    timestamps: false,
    indexes: [
      {
        fields: ["ScheduledBy"],
      },
      {
        fields: ["PatientID"],
      },
      {
        fields: ["DateTime"],
      },
      {
        fields: ["Status"],
      },
    ],
  }
);

// Define associations
Appointment.belongsTo(Staff, { foreignKey: "ScheduledBy" });
Appointment.belongsTo(Patients, { foreignKey: "PatientID" });

export default Appointment;
