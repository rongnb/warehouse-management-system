const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const isTestMode = process.env.NODE_ENV === 'test' || process.env.SQLITE_PATH === ':memory:';
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/warehouse.db');

// Create data directory if not in test mode and directory doesn't exist
if (!isTestMode && dbPath !== ':memory:') {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: isTestMode ? ':memory:' : dbPath,
  logging: isTestMode ? false : (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: false,
  },
});

async function connect() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Only sync in test mode or when AUTO_SYNC is explicitly enabled
    if (isTestMode || process.env.AUTO_SYNC === 'true') {
      await sequelize.sync({ alter: false });
      logger.info('Database schema synchronized');
    }
    
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  connect,
  Sequelize,
};
