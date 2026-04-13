const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Junction table for student-classroom relationships
const StudentClassroom = sequelize.define('StudentClassroom', {
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
  classroomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  },
  enrolledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'student_classroom',
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'classroomId']
    }
  ]
});

module.exports = StudentClassroom;

