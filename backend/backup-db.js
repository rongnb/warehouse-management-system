require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  sequelize,
  User,
  Category,
  Supplier,
  Warehouse,
  Product,
  Inventory,
  Transaction,
  Stocktake,
  StocktakeItem,
} = require('./models');

const backupDir = path.join(__dirname, '../database/backups');

console.log('正在连接数据库...');

async function backupData() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    console.log('正在读取数据...');
    const [users, categories, suppliers, warehouses, products, inventory, transactions, stocktakes, stocktakeItems] = await Promise.all([
      User.findAll({ raw: true }),
      Category.findAll({ raw: true }),
      Supplier.findAll({ raw: true }),
      Warehouse.findAll({ raw: true }),
      Product.findAll({ raw: true }),
      Inventory.findAll({ raw: true }),
      Transaction.findAll({ raw: true }),
      Stocktake.findAll({ raw: true }),
      StocktakeItem.findAll({ raw: true }),
    ]);

    const data = {
      timestamp,
      users,
      categories,
      suppliers,
      warehouses,
      products,
      inventory,
      transactions,
      stocktakes,
      stocktakeItems,
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
    console.log('  - 盘库单:', stocktakes.length);
    console.log('  - 盘库项:', stocktakeItems.length);

  } catch (error) {
    console.error('备份失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

backupData();
