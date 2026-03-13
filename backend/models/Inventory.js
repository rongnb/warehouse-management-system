const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
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
    default: 0,
  },
  location: {
    type: String,
    default: '',
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
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// 复合索引，同一个商品在同一个仓库只能有一条库存记录
inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
