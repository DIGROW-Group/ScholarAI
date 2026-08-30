const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const QuizSubmission = sequelize.define('QuizSubmission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quizId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'quizzes',
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
  answers: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Map of { questionId: selectedOption }'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'quiz_submissions',
  timestamps: true
});

module.exports = QuizSubmission;
