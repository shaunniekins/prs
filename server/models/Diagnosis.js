import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Diagnosis = sequelize.define(
  "Diagnosis",
  {
    DiagnosisID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "DiagnosisID",
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "Description",
    },
  },
  {
    tableName: "Diagnosis",
    timestamps: false,
  }
);

export default Diagnosis;
