const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Junction table for teacher-classroom relationships
const TeacherClassroom = sequelize.define('TeacherClassroom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teacherId: {
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
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'teacher_classroom',
  indexes: [
    {
      unique: true,
      fields: ['teacherId', 'classroomId']
    }
  ]
});

module.exports = TeacherClassroom;

