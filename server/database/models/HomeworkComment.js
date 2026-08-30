const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HomeworkComment = sequelize.define('HomeworkComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  homeworkId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'homeworks',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'homework_comments',
  timestamps: true
});

module.exports = HomeworkComment;
