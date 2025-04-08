const db = require('../database/db');

class Asset {
  // 创建新资产
  static async create(assetData) {
    return new Promise((resolve, reject) => {
      const { asset_id, type, branch, assigned_to } = assetData;
      db.run(
        `INSERT INTO assets (asset_id, type, branch, assigned_to) 
         VALUES (?, ?, ?, ?)`,
        [asset_id, type, branch, assigned_to],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // 根据ID查找资产
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM assets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // 根据分公司查找资产
  static async findByBranch(branch) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM assets WHERE branch = ?', [branch], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 更新资产状态
  static async updateStatus(id, status, assigned_to = null) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE assets 
         SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, assigned_to, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // 获取所有资产
  static async getAll(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM assets WHERE 1=1';
      const params = [];

      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.branch) {
        query += ' AND branch = ?';
        params.push(filters.branch);
      }

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Asset; 