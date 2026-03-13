const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // 盘库频率：monthly/quarterly/half_year/yearly，默认一季度一次
  stocktakeFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_year', 'yearly'],
    default: 'quarterly',
  },
  // 盘库提醒提前天数
  stocktakeReminderDays: {
    type: Number,
    default: 7,
  },
  // 自动生成盘库任务
  autoGenerateStocktake: {
    type: Boolean,
    default: true,
  },
  // 库存预警阈值
  stockWarningThreshold: {
    type: Number,
    default: 10,
  },
  // 系统名称
  systemName: {
    type: String,
    default: '仓库管理系统',
  },
  // 管理员设置的其他配置
  settings: {
    type: Object,
    default: {},
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// 单例模式，确保只有一条配置记录
systemConfigSchema.statics.getInstance = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
