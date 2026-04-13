const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const { sequelize } = require('./database/models');
const RAGService = require('./services/RAGService');
const counselorController = require('./controllers/counselorController');

// Import routes
const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutor');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent');
const adminRoutes = require('./routes/admin');
const counselorRoutes = require('./routes/counselor');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - required when behind a reverse proxy or load balancer
// This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For header
// Only trust first proxy (more secure)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// AI endpoint rate limiting (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});
app.use('/api/tutor/ask', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/counselor', counselorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync database (use { force: false } in production)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database synchronized');

    // Initialize RAG service
    await RAGService.initialize();
    console.log('✓ RAG service initialized');

    // Set up weekly cron job for automatic student analysis
    // Runs every Sunday at 2:00 AM
    // Cron format: minute hour day-of-month month day-of-week
    // 0 2 * * 0 means: at 2:00 AM on Sundays
    cron.schedule('0 2 * * 0', async () => {
      console.log('\n📊 Starting weekly automatic student analysis...');
      try {
        // Create a mock request object for the controller
        const mockReq = {};
        const mockRes = {
          json: (data) => {
            console.log('✓ Weekly analysis completed:', {
              total: data.total,
              processed: data.processed,
              failed: data.failed
            });
            if (data.errors && data.errors.length > 0) {
              console.warn('⚠ Some analyses failed:', data.errors);
            }
          }
        };
        await counselorController.runAnalysisForAllStudents(mockReq, mockRes);
      } catch (error) {
        console.error('❌ Weekly analysis job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    console.log('✓ Weekly analysis cron job scheduled (Sundays at 2:00 AM UTC)');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 RMATSS Server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;

