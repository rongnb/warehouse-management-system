const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  realName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址'],
  },
  phone: {
    type: String,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号'],
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff',
  },
  avatar: {
    type: String,
    default: '',
  },
  status: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
