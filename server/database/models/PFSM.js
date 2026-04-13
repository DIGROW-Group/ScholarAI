const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Pedagogical Flow Shared Memory - Core learner state
const PFSM = sequelize.define('PFSM', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Knowledge state per topic/skill
  masteryLevels: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Skill mastery levels: { "algebra": 0.75, "calculus": 0.45, ... }'
  },
  misconceptions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Identified misconceptions: [{ topic, description, detectedAt }]'
  },
  strengths: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Student strengths and talents'
  },
  weaknesses: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Areas needing improvement'
  },
  learningStyle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Detected learning style: visual, auditory, kinesthetic, etc.'
  },
  // Performance metrics
  performanceMetrics: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Subject-wise performance: { math: { average: 85, trend: "improving" }, ... }'
  },
  engagementMetrics: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Session counts, average duration, etc.'
  },
  // Flags and recommendations
  orientationFlags: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Current orientation agent flags and recommendations'
  },
  attendanceIssues: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recommendedFocus: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Current recommended learning focus area'
  },
  // Cross-agent state
  recentInteractions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Last N interactions summary for quick access'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Version for optimistic locking'
  },
  lastUpdatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Which agent last updated: tutor_math, orientation, etc.'
  }
}, {
  tableName: 'pfsm',
  timestamps: true
});

module.exports = PFSM;

