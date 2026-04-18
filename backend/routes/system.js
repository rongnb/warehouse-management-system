const express = require('express');
const { SystemConfig } = require('../models');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// 获取系统配置
router.get('/config', auth, asyncHandler(async (req, res) => {
  const config = await SystemConfig.getInstance();
  res.json({ config });
}));

// 更新系统配置（仅管理员）
router.put('/config', auth, requireRole(['admin']), asyncHandler(async (req, res) => {
  const {
    stocktakeFrequency,
    stocktakeReminderDays,
    autoGenerateStocktake,
    stockWarningThreshold,
    systemName,
    settings
  } = req.body;

  const config = await SystemConfig.getInstance();

  if (stocktakeFrequency) config.stocktakeFrequency = stocktakeFrequency;
  if (stocktakeReminderDays !== undefined) config.stocktakeReminderDays = stocktakeReminderDays;
  if (autoGenerateStocktake !== undefined) config.autoGenerateStocktake = autoGenerateStocktake;
  if (stockWarningThreshold !== undefined) config.stockWarningThreshold = stockWarningThreshold;
  if (systemName) config.systemName = systemName;
  if (settings) config.settings = { ...config.settings, ...settings };

  config.updatedBy = req.user.id;
  await config.save();

  res.json({
    message: '系统配置更新成功',
    config
  });
}));

module.exports = router;
