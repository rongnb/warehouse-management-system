const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  description: {
    type: String,
    default: '',
  },
  sort: {
    type: Number,
    default: 0,
  },
  status: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// 虚拟字段：子分类
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

categorySchema.set('toObject', { virtuals: true });
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
