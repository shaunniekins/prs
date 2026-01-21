import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notes = sequelize.define(
  "Notes",
  {
    NoteID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "NoteID",
    },
    Content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "Content",
    },
  },
  {
    tableName: "Notes",
    timestamps: false,
  }
);

export default Notes;
