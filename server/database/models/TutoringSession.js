const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TutoringSession = sequelize.define('TutoringSession', {
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
  subject: {
    type: DataTypes.ENUM('math', 'physics', 'arabic', 'english', 'french', 'informatique'),
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  conversation: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  mode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Current tutor mode: recall, diagnostic, scaffold'
  },
  outcome: {
    type: DataTypes.ENUM('solved', 'needs_review', 'abandoned', 'ongoing'),
    defaultValue: 'ongoing'
  },
  difficulty: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: true
  },
  hintsGiven: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  studentRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  studentFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  teacherRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  teacherFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sourcesUsed: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Documents/sources referenced in RAG'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tutoring_sessions'
});

module.exports = TutoringSession;

