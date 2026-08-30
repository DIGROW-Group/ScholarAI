const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Homework = sequelize.define('Homework', {
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
  subject: {
    type: DataTypes.ENUM('math', 'physics', 'arabic', 'english', 'french', 'informatique'),
    allowNull: false
  },
  gradeLevel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Tous les niveaux'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  maxScore: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    allowNull: false
  },
  attachmentPath: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'homeworks',
  timestamps: true
});

module.exports = Homework;
