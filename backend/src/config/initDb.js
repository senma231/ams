const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger();
const dbPath = path.join(__dirname, '../../data/asset.db');
const initSqlPath = path.join(__dirname, 'init.sql');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取初始化 SQL 文件
const initSql = fs.readFileSync(initSqlPath, 'utf-8');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('连接数据库失败:', err);
    process.exit(1);
  }
  logger.info('已连接到数据库');
});

// 执行初始化 SQL
db.exec(initSql, (err) => {
  if (err) {
    logger.error('初始化数据库失败:', err);
    process.exit(1);
  }
  logger.info('数据库初始化成功');
  db.close((err) => {
    if (err) {
      logger.error('关闭数据库连接失败:', err);
      process.exit(1);
    }
    logger.info('数据库连接已关闭');
    process.exit(0);
  });
}); 