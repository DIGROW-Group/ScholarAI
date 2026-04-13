const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const CourseDocument = sequelize.define('CourseDocument', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  chapter: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Teaching guidelines and instructions for the AI tutor'
  },
  isProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether document has been vectorized for RAG'
  },
  embeddingId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to vector store collection'
  },
  chunkCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'course_documents'
});

module.exports = CourseDocument;

