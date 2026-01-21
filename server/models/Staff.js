import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Users from "./Users.js";

const Staff = sequelize.define(
  "Staff",
  {
    StaffID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "StaffID",
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
    ContactNumber: {
      type: DataTypes.STRING(20),
      field: "ContactNumber",
    },
  },
  {
    tableName: "Staff",
    timestamps: false,
    indexes: [
      {
        fields: ["UserID"],
      },
    ],
  }
);

// Define associations
Staff.belongsTo(Users, { foreignKey: "UserID" });

export default Staff;
