import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Users from "./Users.js";

const Notification = sequelize.define(
  "Notification",
  {
    NotificationID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "NotificationID",
    },
    UserID: {
      type: DataTypes.STRING(255),
      references: {
        model: Users,
        key: "UserID",
      },
      field: "UserID",
    },
    Message: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "Message",
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "CreatedAt",
    },
  },
  {
    tableName: "Notification",
    timestamps: false,
    indexes: [
      {
        fields: ["UserID"],
      },
      {
        fields: ["CreatedAt"],
      },
    ],
  }
);

// Define associations
Notification.belongsTo(Users, { foreignKey: "UserID" });

export default Notification;
