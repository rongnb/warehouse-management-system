const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
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
  contact: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号'],
  },
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址'],
  },
  address: {
    type: String,
    default: '',
  },
  remark: {
    type: String,
    default: '',
  },
  status: {
    type: Boolean,
    default: true,
  },
  level: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    default: 'B',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Supplier', supplierSchema);
