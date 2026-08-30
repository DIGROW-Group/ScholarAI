const { Sequelize } = require('sequelize');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let dbHost = '127.0.0.1';
if (process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost') {
  dbHost = process.env.DB_HOST;
}

// In linux/WSL or standard local, 127.0.0.1 is always the right target for postgresql
if (process.platform === 'linux') {
  dbHost = '127.0.0.1';
}

console.log(`🔌 Database connecting to PostgreSQL host: ${dbHost}:${process.env.DB_PORT || 5432}`);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'rmatss_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: dbHost,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
