const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

// 数据库文件路径
const dbPath = path.join(__dirname, '../../data/database.db');
// 标准化架构SQL文件路径
const schemaPath = path.join(__dirname, './schema.sql');

// 确保数据目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('连接数据库失败:', err);
    return;
  }
  logger.info('成功连接到数据库');

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 检查数据库是否需要初始化
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
      logger.error('检查数据库表失败:', err);
      return;
    }

    // 如果没有表，初始化数据库
    if (!row) {
      // 读取架构SQL文件
      fs.readFile(schemaPath, 'utf-8', (err, schemaSql) => {
        if (err) {
          logger.error('读取架构SQL文件失败:', err);
          return;
        }

        // 执行架构SQL
        db.exec(schemaSql, (err) => {
          if (err) {
            logger.error('初始化数据库失败:', err);
            return;
          }
          logger.info('数据库初始化完成');
        });
      });
    } else {
      // 检查是否需要创建管理员用户
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          logger.error('检查用户数据失败:', err);
          return;
        }

        if (row.count === 0) {
          // 创建默认管理员用户
          db.run(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin', '$2b$10$hxwsZZ3Ynbzv4Sfm67enD.vDwDS0Q94qGPx7pXuLYW9O3VQiBTuci', '管理员', 'admin'],
            (err) => {
              if (err) {
                logger.error('创建管理员用户失败:', err);
                return;
              }
              logger.info('创建管理员用户成功');
            }
          );
        }
      });
    }
  });
});

// 导出数据库对象
module.exports = {
  get db() {
    return global.db || db;
  },
  set db(newDb) {
    global.db = newDb;
  }
};