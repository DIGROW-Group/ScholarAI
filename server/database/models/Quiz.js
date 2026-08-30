const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Quiz = sequelize.define('Quiz', {
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
    type: DataTypes.STRING,
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
    allowNull: true
  },
  questions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of { id, question, optionA, optionB, optionC, optionD, correctOption, points }'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  maxScore: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    allowNull: false
  }
}, {
  tableName: 'quizzes',
  timestamps: true
});

module.exports = Quiz;
