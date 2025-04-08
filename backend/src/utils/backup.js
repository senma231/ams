const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const config = require('../config/config');
const { db } = require('../config/database');

const logger = createLogger();

// 确保备份目录存在
const ensureBackupDir = () => {
  const backupDir = config.BACKUP.directory;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// 生成备份文件名
const generateBackupFileName = () => {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.db`;
};

// 执行数据库备份
const backupDatabase = () => {
  return new Promise((resolve, reject) => {
    const backupDir = ensureBackupDir();
    const backupFile = path.join(backupDir, generateBackupFileName());

    // 备份前确保数据库连接正常
    db.get('SELECT 1', async (err) => {
      if (err) {
        logger.error('数据库连接检查失败:', err);
        reject(err);
        return;
      }

      try {
        // 创建备份文件的写入流
        const writeStream = fs.createWriteStream(backupFile);

        // 从数据库文件复制到备份文件
        fs.createReadStream(config.DATABASE.filename)
          .pipe(writeStream)
          .on('finish', () => {
            logger.info(`数据库备份成功: ${backupFile}`);
            resolve(backupFile);
          })
          .on('error', (error) => {
            logger.error('数据库备份失败:', error);
            reject(error);
          });
      } catch (error) {
        logger.error('创建备份文件失败:', error);
        reject(error);
      }
    });
  });
};

// 清理旧备份
const cleanOldBackups = async () => {
  const backupDir = ensureBackupDir();
  const maxBackups = 10; // 保留最近10个备份

  try {
    // 获取所有备份文件
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序排序

    // 删除多余的备份
    if (files.length > maxBackups) {
      const filesToDelete = files.slice(maxBackups);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.info(`删除旧备份文件: ${file.name}`);
      }
    }
  } catch (error) {
    logger.error('清理旧备份失败:', error);
    throw error;
  }
};

// 获取备份列表
const getBackupList = () => {
  const backupDir = ensureBackupDir();

  try {
    return fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);
  } catch (error) {
    logger.error('获取备份列表失败:', error);
    throw error;
  }
};

// 恢复数据库
const restoreDatabase = (backupFile) => {
  return new Promise((resolve, reject) => {
    const backupPath = path.join(config.BACKUP.directory, backupFile);

    // 检查备份文件是否存在
    if (!fs.existsSync(backupPath)) {
      reject(new Error('备份文件不存在'));
      return;
    }

    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        logger.error('关闭数据库连接失败:', err);
        reject(err);
        return;
      }

      try {
        // 复制备份文件到数据库文件
        fs.copyFileSync(backupPath, config.DATABASE.filename);
        logger.info(`数据库恢复成功: ${backupFile}`);

        // 重新打开数据库连接
        db.open(config.DATABASE.filename, (err) => {
          if (err) {
            logger.error('重新打开数据库失败:', err);
            reject(err);
            return;
          }
          resolve();
        });
      } catch (error) {
        logger.error('数据库恢复失败:', error);
        reject(error);
      }
    });
  });
};

module.exports = {
  backupDatabase,
  cleanOldBackups,
  getBackupList,
  restoreDatabase
}; 