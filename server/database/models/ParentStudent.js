const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Junction table for parent-student relationships
const ParentStudent = sequelize.define('ParentStudent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  relationship: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'parent'
  }
}, {
  tableName: 'parent_student',
  indexes: [
    {
      unique: true,
      fields: ['parentId', 'studentId']
    }
  ]
});

module.exports = ParentStudent;

