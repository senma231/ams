const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/asset.db');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err);
    process.exit(1);
  }
  console.log('已连接到数据库');

  // 检查users表
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('查询失败:', err);
    } else {
      console.log('管理员用户信息:', row);
    }

    // 列出所有表
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('获取表列表失败:', err);
      } else {
        console.log('数据库中的表:', tables);
      }

      // 关闭数据库连接
      db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err);
        }
        console.log('数据库连接已关闭');
      });
    });
  });
}); 