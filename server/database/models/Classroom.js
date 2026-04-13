const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Classroom = sequelize.define('Classroom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Classroom name, e.g., "1ère Bac Sciences - Classe A"'
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Grade level: 1ere College, 2eme College, etc.'
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Primary teacher for this classroom'
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    comment: 'Subjects taught in this classroom (inherited from teacher)'
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., "2024-2025"'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'classrooms'
});

module.exports = Classroom;

