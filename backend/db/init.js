require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize, User, Warehouse, Category, Supplier, Product, Inventory, Transaction } = require('../models');
const logger = require('../utils/logger');

async function initDatabase() {
  try {
    console.log('=== Database Initialization Started ===');

    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync schema (force if RESET=true or --reset flag)
    const shouldReset = process.env.RESET === 'true' || process.argv.includes('--reset');
    if (shouldReset) {
      console.log('⚠ RESET mode: dropping all tables...');
    }

    await sequelize.sync({ force: shouldReset });
    console.log(`✓ Database schema synchronized (force: ${shouldReset})`);

    // --- Seed Users ---
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Creating users...');
      const users = [
        { username: 'admin', password: 'admin123', realName: '系统管理员', email: 'admin@warehouse.com', role: 'admin', status: true },
        { username: 'keeper1', password: 'keeper123', realName: '仓库管理员1', email: 'keeper1@warehouse.com', role: 'warehouse_keeper', status: true },
        { username: 'keeper2', password: 'keeper123', realName: '仓库管理员2', email: 'keeper2@warehouse.com', role: 'warehouse_keeper', status: true },
      ];
      for (const u of users) {
        await User.create(u);
        console.log(`  ✓ User created: ${u.username} (${u.role})`);
      }
    } else {
      console.log(`✓ Users exist (${userCount}), skipping user seed`);
    }

    // --- Seed Warehouses ---
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
      console.log('Creating warehouses...');
      const warehouses = [
        { name: '主仓库', code: 'MAIN', location: 'A栋1楼', description: '主要存储仓库', status: true, sort: 0 },
        { name: '备用仓库', code: 'BACKUP', location: 'B栋2楼', description: '备用存储仓库', status: true, sort: 1 },
      ];
      for (const w of warehouses) {
        await Warehouse.create(w);
        console.log(`  ✓ Warehouse created: ${w.name} (${w.code})`);
      }
    } else {
      console.log(`✓ Warehouses exist (${warehouseCount}), skipping warehouse seed`);
    }

    // --- Seed Categories ---
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      console.log('Creating categories...');
      const categories = [
        { name: '办公用品', code: 'OFFICE', description: '办公用品类别', sort: 1 },
        { name: '电子产品', code: 'ELECTRONICS', description: '电子产品类别', sort: 2 },
        { name: '耗材', code: 'CONSUMABLES', description: '耗材类别', sort: 3 },
        { name: '食品饮料', code: 'FOOD', description: '食品饮料类别', sort: 4 },
        { name: '工具设备', code: 'TOOLS', description: '工具设备类别', sort: 5 },
      ];
      for (const cat of categories) {
        await Category.create(cat);
        console.log(`  ✓ Category created: ${cat.name}`);
      }
    } else {
      console.log(`✓ Categories exist (${categoryCount}), skipping category seed`);
    }

    // --- Seed Suppliers ---
    const supplierCount = await Supplier.count();
    if (supplierCount === 0) {
      console.log('Creating suppliers...');
      const suppliers = [
        { name: '示例供应商A', code: 'SUP-A', contact: '张三', phone: '13800138001', email: 'supplierA@example.com', address: '北京市朝阳区', level: 'A' },
        { name: '示例供应商B', code: 'SUP-B', contact: '李四', phone: '13800138002', email: 'supplierB@example.com', address: '上海市浦东新区', level: 'B' },
      ];
      for (const sup of suppliers) {
        await Supplier.create(sup);
        console.log(`  ✓ Supplier created: ${sup.name}`);
      }
    } else {
      console.log(`✓ Suppliers exist (${supplierCount}), skipping supplier seed`);
    }

    // --- Seed Products, Inventory, and Transactions ---
    const productCount = await Product.count();
    if (productCount === 0) {
      console.log('Creating products with initial inventory...');

      const admin = await User.findOne({ where: { username: 'admin' } });
      const mainWarehouse = await Warehouse.findOne({ where: { code: 'MAIN' } });
      const categories = await Category.findAll();
      const suppliers = await Supplier.findAll();

      const catMap = {};
      categories.forEach(c => { catMap[c.code] = c.id; });
      const supMap = {};
      suppliers.forEach(s => { supMap[s.code] = s.id; });

      const products = [
        { name: 'A4打印纸', sku: 'OFFICE-001', categoryId: catMap['OFFICE'], supplierId: supMap['SUP-A'], unit: '箱', price: 45.00, costPrice: 35.00, minStock: 10, maxStock: 500, specification: '70g 500张/包 5包/箱', manufacturer: '得力' },
        { name: '笔记本电脑', sku: 'ELEC-001', categoryId: catMap['ELECTRONICS'], supplierId: supMap['SUP-B'], unit: '台', price: 5999.00, costPrice: 4500.00, minStock: 5, maxStock: 50, specification: '14英寸 i5 16GB 512GB', manufacturer: '联想' },
        { name: '墨盒', sku: 'CONS-001', categoryId: catMap['CONSUMABLES'], supplierId: supMap['SUP-A'], unit: '个', price: 120.00, costPrice: 80.00, minStock: 20, maxStock: 200, specification: '黑色 标准容量', manufacturer: 'HP' },
        { name: '矿泉水', sku: 'FOOD-001', categoryId: catMap['FOOD'], supplierId: supMap['SUP-B'], unit: '箱', price: 28.00, costPrice: 18.00, minStock: 50, maxStock: 1000, specification: '550ml 24瓶/箱', manufacturer: '农夫山泉' },
        { name: '螺丝刀套装', sku: 'TOOL-001', categoryId: catMap['TOOLS'], supplierId: supMap['SUP-A'], unit: '套', price: 89.00, costPrice: 55.00, minStock: 10, maxStock: 100, specification: '45合1 精密维修套装', manufacturer: '世达' },
      ];

      for (const prod of products) {
        const product = await Product.create({
          ...prod,
          createdBy: admin.id,
          status: true,
        });

        // Create initial inventory (100 units in main warehouse)
        const initQty = 100;
        await Inventory.create({
          productId: product.id,
          warehouseId: mainWarehouse.id,
          quantity: initQty,
          updatedBy: admin.id,
        });

        // Create corresponding inbound transaction
        await Transaction.create({
          type: 'in',
          productId: product.id,
          warehouseId: mainWarehouse.id,
          quantity: initQty,
          price: prod.costPrice,
          supplierId: prod.supplierId,
          operator: admin.id,
          createdBy: admin.id,
          status: 'completed',
          remark: '系统初始化入库',
        });

        console.log(`  ✓ Product created: ${prod.name} (${prod.sku}) — inventory: ${initQty} ${prod.unit}`);
      }
    } else {
      console.log(`✓ Products exist (${productCount}), skipping product seed`);
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
