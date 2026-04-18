require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize, User, Warehouse, Category } = require('../models');
const logger = require('../utils/logger');

async function initDatabase() {
  try {
    console.log('=== Database Initialization Started ===');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Sync schema (force if RESET=true)
    const shouldReset = process.env.RESET === 'true';
    if (shouldReset) {
      console.log('⚠ RESET mode: dropping all tables...');
    }
    
    await sequelize.sync({ force: shouldReset });
    console.log(`✓ Database schema synchronized (force: ${shouldReset})`);
    
    // Seed default admin user
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Creating default admin user...');
      const adminUser = await User.create({
        username: 'admin',
        password: 'admin123',
        realName: '系统管理员',
        email: 'admin@warehouse.com',
        role: 'admin',
        status: true,
      });
      console.log(`✓ Admin user created: ${adminUser.username}`);
    } else {
      console.log(`✓ Users exist (${userCount}), skipping admin seed`);
    }
    
    // Seed default warehouse
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
      console.log('Creating default warehouse...');
      const warehouse = await Warehouse.create({
        name: '默认仓库',
        code: 'DEFAULT',
        location: '',
        description: '系统默认仓库',
        status: true,
        sort: 0,
      });
      console.log(`✓ Default warehouse created: ${warehouse.name}`);
    } else {
      console.log(`✓ Warehouses exist (${warehouseCount}), skipping warehouse seed`);
    }
    
    // Seed default categories
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      console.log('Creating default categories...');
      const categories = [
        { name: '办公用品', code: 'OFFICE', description: '办公用品类别', sort: 1 },
        { name: '电子产品', code: 'ELECTRONICS', description: '电子产品类别', sort: 2 },
        { name: '耗材', code: 'CONSUMABLES', description: '耗材类别', sort: 3 },
      ];
      
      for (const cat of categories) {
        await Category.create(cat);
        console.log(`  ✓ Category created: ${cat.name}`);
      }
    } else {
      console.log(`✓ Categories exist (${categoryCount}), skipping category seed`);
    }
    
    console.log('=== Database Initialization Completed Successfully ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    logger.error('Database initialization error:', error);
    process.exit(1);
  }
}

initDatabase();
