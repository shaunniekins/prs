import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Treatment = sequelize.define(
  "Treatment",
  {
    TreatmentID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "TreatmentID",
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "Description",
    },
  },
  {
    tableName: "Treatment",
    timestamps: false,
  }
);

export default Treatment;
