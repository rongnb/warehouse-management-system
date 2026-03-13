const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  location: {
    type: String,
    default: '',
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  phone: {
    type: String,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号'],
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: Boolean,
    default: true,
  },
  sort: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
