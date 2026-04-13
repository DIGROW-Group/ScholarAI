const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const RLReward = sequelize.define('RLReward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tutoring_sessions',
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
  // Reward components
  Rs: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Student-level reward (learning success, satisfaction)'
  },
  Rt: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Tutor-level reward (pedagogical quality)'
  },
  Rg: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'General reward (efficiency, engagement)'
  },
  totalReward: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Combined reward: λs*Rs + λt*Rt + λg*Rg'
  },
  // Detailed breakdown
  rewardBreakdown: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Detailed reward calculation components'
  },
  // State-action-reward for RL
  state: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Student knowledge state at start of episode'
  },
  actions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Tutor actions taken during episode'
  },
  nextState: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Student knowledge state after episode'
  },
  isFinalized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether all reward components have been collected'
  },
  computedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'rl_rewards'
});

module.exports = RLReward;

