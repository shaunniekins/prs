import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Role = sequelize.define(
  "Role",
  {
    RoleID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "RoleID",
    },
    RoleName: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: "RoleName",
    },
  },
  {
    tableName: "Role",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["RoleName"],
      },
    ],
  }
);

export default Role;
