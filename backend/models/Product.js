const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  specification: {
    type: String,
    default: '',
  },
  modelName: {
    type: String,
    default: '',
  },
  manufacturer: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    required: true,
    default: '个',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  image: {
    type: String,
    default: '',
  },
  status: {
    type: Boolean,
    default: true,
  },
  minStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxStock: {
    type: Number,
    default: 99999,
    min: 0,
  },
  remark: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// 索引
productSchema.index({ name: 1 });
productSchema.index({ sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
