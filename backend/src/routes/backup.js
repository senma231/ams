const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const database = require('../config/database');
const sqlite3 = require('sqlite3');

const logger = createLogger();
const BACKUP_DIR = path.join(__dirname, '../../backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 获取备份列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files.map(file => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      return {
        name: file,
        size: stats.size,
        time: stats.mtime
      };
    }).sort((a, b) => b.time - a.time);

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    logger.error('获取备份列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备份列表失败'
    });
  }
});

// 创建备份
router.post('/', authenticateToken, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

    // 备份数据库
    await new Promise((resolve, reject) => {
      // 使用文件复制方式备份
      const dbPath = path.join(__dirname, '../../data/database.db');
      const readStream = fs.createReadStream(dbPath);
      const writeStream = fs.createWriteStream(backupFile);

      readStream.on('error', (err) => {
        logger.error('读取数据库文件失败:', err);
        reject(err);
      });

      writeStream.on('error', (err) => {
        logger.error('写入备份文件失败:', err);
        reject(err);
      });

      writeStream.on('finish', () => {
        resolve();
      });

      readStream.pipe(writeStream);
    });

    res.json({
      success: true,
      message: '创建备份成功'
    });
  } catch (error) {
    logger.error('创建备份失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备份失败'
    });
  }
});

// 恢复备份
router.post('/:name/restore', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const backupFile = path.join(BACKUP_DIR, name);

    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({
        success: false,
        message: '备份文件不存在'
      });
    }

    // 关闭当前数据库连接
    await new Promise((resolve) => {
      database.db.close((err) => {
        if (err) {
          logger.error('关闭数据库连接失败:', err);
        }
        resolve();
      });
    });

    // 恢复数据库
    await new Promise((resolve, reject) => {
      // 使用文件复制方式恢复
      const dbPath = path.join(__dirname, '../../data/database.db');
      const readStream = fs.createReadStream(backupFile);
      const writeStream = fs.createWriteStream(dbPath);

      readStream.on('error', (err) => {
        logger.error('读取备份文件失败:', err);
        reject(err);
      });

      writeStream.on('error', (err) => {
        logger.error('写入数据库文件失败:', err);
        reject(err);
      });

      writeStream.on('finish', () => {
        resolve();
      });

      readStream.pipe(writeStream);
    });

    // 重新打开数据库连接
    const dbPath = path.join(__dirname, '../../data/database.db');
    const newDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('重新打开数据库失败:', err);
      }
    });

    // 替换全局数据库对象
    database.db = newDb;

    res.json({
      success: true,
      message: '恢复备份成功'
    });
  } catch (error) {
    logger.error('恢复备份失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复备份失败'
    });
  }
});

module.exports = router;