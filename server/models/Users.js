import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Role from "./Role.js";

const Users = sequelize.define(
  "Users",
  {
    UserID: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      field: "UserID",
    },
    Username: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      field: "Username",
    },
    Password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "Password",
    },
    Email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      field: "Email",
    },
    RoleID: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: "RoleID",
      },
      field: "RoleID",
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "CreatedAt",
    },
  },
  {
    tableName: "Users",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["Username"],
      },
      {
        unique: true,
        fields: ["Email"],
      },
    ],
  }
);

// Define associations
Users.belongsTo(Role, { foreignKey: "RoleID" });

export default Users;
