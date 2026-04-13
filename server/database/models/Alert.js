const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('attendance', 'performance', 'engagement', 'wellbeing', 'orientation'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    defaultValue: 'info'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Which agent generated this: geofencing_agent, orientation_agent, etc.'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readBy: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'User IDs who have read this alert'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'alerts'
});

module.exports = Alert;

