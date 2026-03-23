const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Supplier = require('./models/Supplier');
const Warehouse = require('./models/Warehouse');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Transaction = require('./models/Transaction');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';
const backupDir = path.join(__dirname, '../database/backups');

console.log('正在连接数据库...');

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('数据库连接成功');

    const backupData = async () => {
      try {
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

        console.log('正在读取数据...');
        const [users, categories, suppliers, warehouses, products, inventory, transactions] = await Promise.all([
          User.find().lean(),
          Category.find().lean(),
          Supplier.find().lean(),
          Warehouse.find().lean(),
          Product.find().lean(),
          Inventory.find().lean(),
          Transaction.find().lean(),
        ]);

        const data = {
          timestamp,
          users,
          categories,
          suppliers,
          warehouses,
          products,
          inventory,
          transactions
        };

        console.log('正在写入备份文件...');
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        console.log('备份成功:', backupFile);
        console.log('\n备份数据统计:');
        console.log('  - 用户:', users.length);
        console.log('  - 分类:', categories.length);
        console.log('  - 供应商:', suppliers.length);
        console.log('  - 仓库:', warehouses.length);
        console.log('  - 商品:', products.length);
        console.log('  - 库存:', inventory.length);
        console.log('  - 交易:', transactions.length);

      } catch (error) {
        console.error('备份失败:', error);
      } finally {
        mongoose.disconnect();
        process.exit(0);
      }
    };

    backupData();
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });
