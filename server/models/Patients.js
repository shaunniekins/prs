import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Users from "./Users.js";

const Patients = sequelize.define(
  "Patients",
  {
    PatientID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "PatientID",
    },
    UserID: {
      type: DataTypes.STRING(255),
      references: {
        model: Users,
        key: "UserID",
      },
      field: "UserID",
    },
    FirstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "FirstName",
    },
    Surname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "Surname",
    },
    Suffix: {
      type: DataTypes.STRING(10),
      field: "Suffix",
    },
    Address: {
      type: DataTypes.TEXT,
      field: "Address",
    },
    Gender: {
      type: DataTypes.STRING(10),
      field: "Gender",
    },
    BirthDate: {
      type: DataTypes.DATE,
      field: "BirthDate",
    },
    ContactNumber: {
      type: DataTypes.STRING(20),
      field: "ContactNumber",
    },
  },
  {
    tableName: "Patients",
    timestamps: false,
    indexes: [
      {
        fields: ["UserID"],
      },
    ],
  }
);

// Define associations
Patients.belongsTo(Users, { foreignKey: "UserID" });

export default Patients;
