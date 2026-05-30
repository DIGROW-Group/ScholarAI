const { sequelize } = require('../models');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Dev: database synced');
    } else {
      await sequelize.authenticate();
      console.log('Production: connection verified — migrations handle schema');
    }

    console.log('✅ Migrations completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

