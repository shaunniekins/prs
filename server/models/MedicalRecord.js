import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Appointment from "./Appointment.js";
import Staff from "./Staff.js";
import Diagnosis from "./Diagnosis.js";
import Treatment from "./Treatment.js";
import Notes from "./Notes.js";

const MedicalRecord = sequelize.define(
  "MedicalRecord",
  {
    RecordID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "RecordID",
    },
    AppointmentID: {
      type: DataTypes.INTEGER,
      references: {
        model: Appointment,
        key: "AppointmentID",
      },
      field: "AppointmentID",
    },
    EnteredBy: {
      type: DataTypes.INTEGER,
      references: {
        model: Staff,
        key: "StaffID",
      },
      field: "EnteredBy",
    },
    DiagnosisID: {
      type: DataTypes.INTEGER,
      references: {
        model: Diagnosis,
        key: "DiagnosisID",
      },
      field: "DiagnosisID",
    },
    TreatmentID: {
      type: DataTypes.INTEGER,
      references: {
        model: Treatment,
        key: "TreatmentID",
      },
      field: "TreatmentID",
    },
    NoteID: {
      type: DataTypes.INTEGER,
      references: {
        model: Notes,
        key: "NoteID",
      },
      field: "NoteID",
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "CreatedAt",
    },
  },
  {
    tableName: "MedicalRecord",
    timestamps: false,
    indexes: [
      {
        fields: ["AppointmentID"],
      },
      {
        fields: ["EnteredBy"],
      },
    ],
  }
);

// Define associations
MedicalRecord.belongsTo(Appointment, { foreignKey: "AppointmentID" });
MedicalRecord.belongsTo(Staff, { foreignKey: "EnteredBy" });
MedicalRecord.belongsTo(Diagnosis, { foreignKey: "DiagnosisID" });
MedicalRecord.belongsTo(Treatment, { foreignKey: "TreatmentID" });
MedicalRecord.belongsTo(Notes, { foreignKey: "NoteID" });

export default MedicalRecord;
