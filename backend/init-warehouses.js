const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Warehouse = require('./models/Warehouse');
const User = require('./models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';

console.log(`正在连接数据库: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ 数据库连接成功');

    // 检查是否已有仓库
    const existingWarehouses = await Warehouse.find({});
    console.log(`📦 当前仓库数量: ${existingWarehouses.length}`);

    if (existingWarehouses.length === 0) {
      console.log('创建示例仓库...');

      // 获取一个管理员用户作为默认管理员
      const admin = await User.findOne({ role: 'admin' }) || await User.findOne();

      const warehouses = [
        {
          name: '主仓库',
          code: 'WH001',
          location: '一号楼一层',
          manager: admin?._id,
          phone: '13800138000',
          sort: 1,
          status: true
        },
        {
          name: '二号仓库',
          code: 'WH002',
          location: '二号楼三层',
          manager: admin?._id,
          phone: '13800138001',
          sort: 2,
          status: true
        },
        {
          name: '备品仓库',
          code: 'WH003',
          location: '三号楼二层',
          manager: admin?._id,
          phone: '13800138002',
          sort: 3,
          status: true
        },
      ];

      await Warehouse.insertMany(warehouses);
      console.log('✅ 示例仓库创建成功');

      const newWarehouses = await Warehouse.find({});
      console.log('仓库列表:');
      newWarehouses.forEach((w, i) => {
        console.log(`  ${i+1}. ${w.name} (${w.code}) - ${w.location}`);
      });
    } else {
      console.log('仓库列表:');
      existingWarehouses.forEach((w, i) => {
        console.log(`  ${i+1}. ${w.name} (${w.code}) - 状态: ${w.status ? '启用' : '禁用'}`);
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  });
