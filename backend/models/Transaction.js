const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionNo: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['in', 'out', 'stocktake_profit', 'stocktake_loss'],
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  price: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  customer: {
    type: String,
    default: '',
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referenceNo: {
    type: String,
    default: '',
  },
  unitPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  remark: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed',
  },
  batchNumber: {
    type: String,
    default: '',
  },
  productionDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  auditBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  auditTime: {
    type: Date,
  },
  auditRemark: {
    type: String,
    default: '',
  },
  // 领用相关字段（用于出库）
  consumptionUnit: {
    type: String,
    default: '',
  },
  consumptionApprover: {
    type: String,
    default: '',
  },
  consumptionHandler: {
    type: String,
    default: '',
  },
  consumptionDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// 自动生成交易单号
transactionSchema.pre('save', function(next) {
  if (this.isNew) {
    let prefix = 'OUT';
    if (this.type === 'in') prefix = 'IN';
    if (this.type === 'stocktake_profit') prefix = 'PROFIT';
    if (this.type === 'stocktake_loss') prefix = 'LOSS';
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionNo = `${prefix}${date}${random}`;
  }
  
  // 自动计算总金额
  if (this.quantity && (this.price || this.unitPrice)) {
    this.totalAmount = this.quantity * (this.price || this.unitPrice);
  }
  
  // 如果没有operator，使用createdBy
  if (!this.operator && this.createdBy) {
    this.operator = this.createdBy;
  }
  
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
