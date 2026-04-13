const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Attendance = sequelize.define('Attendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('present', 'late', 'absent', 'early_departure'),
    defaultValue: 'absent'
  },
  anomalies: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Detected anomalies: [{ type, description, flaggedAt }]'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Simulated location for MVP'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'attendance',
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'date']
    }
  ]
});

module.exports = Attendance;

