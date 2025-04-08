const express = require('express');
const router = express.Router();
const { exportAssets, exportTransactions } = require('../utils/export');
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const logger = createLogger();

// 导出资产信息
router.post('/assets', authenticateToken, async (req, res) => {
  try {
    const filters = req.body;
    const result = await exportAssets(filters);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('导出资产信息失败:', error);
    res.status(500).json({
      success: false,
      message: '导出资产信息失败'
    });
  }
});

// 导出借用记录
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const filters = req.body;
    const result = await exportTransactions(filters);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('导出借用记录失败:', error);
    res.status(500).json({
      success: false,
      message: '导出借用记录失败'
    });
  }
});

// 下载导出文件
router.get('/download/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../../exports', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    res.download(filepath);
  } catch (error) {
    logger.error('下载文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载文件失败'
    });
  }
});

module.exports = router; 