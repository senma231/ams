const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '../data/database.db');
// 标准化架构SQL文件路径
const schemaPath = path.join(__dirname, '../src/config/schema.sql');

// 确保数据目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 如果数据库文件已存在，则删除它
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('已删除旧的数据库文件');
}

// 读取架构SQL文件
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

// 创建新的数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err);
    process.exit(1);
  }
  console.log('成功连接到数据库');

  // 执行架构SQL
  db.exec(schemaSql, (err) => {
    if (err) {
      console.error('初始化数据库失败:', err);
      process.exit(1);
    }
    console.log('数据库初始化完成');
    console.log('创建管理员用户成功 (用户名: admin, 密码: admin123)');
    db.close();
    process.exit(0);
  });
});

