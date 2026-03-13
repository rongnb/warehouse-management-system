const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionNo: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['in', 'out'],
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
    min: 1,
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
}, {
  timestamps: true,
});

// 自动生成交易单号
transactionSchema.pre('save', function(next) {
  if (this.isNew) {
    const prefix = this.type === 'in' ? 'IN' : 'OUT';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionNo = `${prefix}${date}${random}`;
  }
  
  // 自动计算总金额
  if (this.quantity && this.price) {
    this.totalAmount = this.quantity * this.price;
  }
  
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
