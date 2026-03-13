const express = require('express');
const SystemConfig = require('../models/SystemConfig');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 获取系统配置
router.get('/config', auth, async (req, res) => {
  try {
    const config = await SystemConfig.getInstance();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ message: '获取系统配置失败', error: error.message });
  }
});

// 更新系统配置（仅管理员）
router.put('/config', auth, requireRole(['admin']), async (req, res) => {
  try {
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
    
    config.updatedBy = req.user._id;
    await config.save();

    res.json({ 
      message: '系统配置更新成功',
      config 
    });
  } catch (error) {
    res.status(500).json({ message: '更新系统配置失败', error: error.message });
  }
});

module.exports = router;
