const db = require('../database/db');
const bcrypt = require('bcryptjs');

class User {
  // 创建新用户
  static async create(userData) {
    const { username, password, branch, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, branch, role) 
         VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, branch, role],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // 根据用户名查找用户
  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // 验证密码
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // 获取用户列表
  static async getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, username, branch, role, created_at FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 更新用户信息
  static async update(id, userData) {
    const { branch, role } = userData;
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET branch = ?, role = ? WHERE id = ?',
        [branch, role, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // 修改密码
  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = User; 