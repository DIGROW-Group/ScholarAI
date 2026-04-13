const { sequelize } = require('../models');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Authenticate connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('✓ All models synchronized');

    console.log('✅ Migrations completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

