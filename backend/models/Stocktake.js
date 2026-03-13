const mongoose = require('mongoose');

const stocktakeItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  spec: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    default: '',
  },
  systemQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  actualQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  difference: {
    type: Number,
    required: true,
  },
  differenceType: {
    type: String,
    enum: ['profit', 'loss', 'none'],
    required: true,
  },
  unitPrice: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  remark: {
    type: String,
    default: '',
  },
});

const stocktakeSchema = new mongoose.Schema({
  stocktakeNo: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  warehouseName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'confirming', 'completed', 'cancelled'],
    default: 'draft',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  items: [stocktakeItemSchema],
  totalProfitQuantity: {
    type: Number,
    default: 0,
  },
  totalProfitAmount: {
    type: Number,
    default: 0,
  },
  totalLossQuantity: {
    type: Number,
    default: 0,
  },
  totalLossAmount: {
    type: Number,
    default: 0,
  },
  firstConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  firstConfirmedAt: {
    type: Date,
  },
  firstConfirmedRemark: {
    type: String,
    default: '',
  },
  secondConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  secondConfirmedAt: {
    type: Date,
  },
  secondConfirmedRemark: {
    type: String,
    default: '',
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  completedAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancelledAt: {
    type: Date,
  },
  cancelReason: {
    type: String,
    default: '',
  },
  remark: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// 生成盘库单号
stocktakeSchema.pre('save', async function(next) {
  if (this.isNew && !this.stocktakeNo) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, month - 1, day),
        $lt: new Date(year, month - 1, day + 1),
      },
    });
    
    this.stocktakeNo = `PD${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Stocktake', stocktakeSchema);
