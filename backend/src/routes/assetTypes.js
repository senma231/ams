const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const database = require('../config/database');

const logger = createLogger();
const db = database.db;

// 获取所有资产类型
router.get('/', authenticateToken, (req, res) => {
  logger.info('开始获取资产类型列表');

  // 首先检查表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='asset_types'", (tableErr, tableRow) => {
    if (tableErr) {
      logger.error('检查资产类型表失败:', tableErr);
      return res.status(500).json({
        success: false,
        message: '获取资产类型失败'
      });
    }

    if (!tableRow) {
      logger.error('资产类型表不存在');
      return res.json({
        success: true,
        data: [],
        message: '资产类型表不存在'
      });
    }

    // 表存在，获取数据
    db.all(
      `SELECT * FROM asset_types ORDER BY name`,
      [],
      (err, types) => {
        if (err) {
          logger.error('获取资产类型失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取资产类型失败'
          });
        }

        logger.info(`成功获取资产类型列表，共 ${types.length} 条记录`);
        res.json({
          success: true,
          data: types
        });
      }
    );
  });
});

// 获取单个资产类型
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM asset_types WHERE id = ?`,
    [id],
    (err, type) => {
      if (err) {
        logger.error('获取资产类型失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取资产类型失败'
        });
      }

      if (!type) {
        return res.status(404).json({
          success: false,
          message: '资产类型不存在'
        });
      }

      res.json({
        success: true,
        data: type
      });
    }
  );
});

// 创建资产类型
router.post('/', authenticateToken, (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员可以创建资产类型'
    });
  }

  const { name, code, description } = req.body;

  // 验证必填字段
  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: '名称和编码为必填项'
    });
  }

  // 检查编码是否已存在
  db.get(
    `SELECT id FROM asset_types WHERE code = ?`,
    [code],
    (err, existingType) => {
      if (err) {
        logger.error('检查资产类型编码失败:', err);
        return res.status(500).json({
          success: false,
          message: '创建资产类型失败'
        });
      }

      if (existingType) {
        return res.status(400).json({
          success: false,
          message: '该编码已存在'
        });
      }

      // 创建新资产类型
      db.run(
        `INSERT INTO asset_types (name, code, description)
         VALUES (?, ?, ?)`,
        [name, code, description || ''],
        function(err) {
          if (err) {
            logger.error('创建资产类型失败:', err);
            return res.status(500).json({
              success: false,
              message: '创建资产类型失败'
            });
          }

          res.status(201).json({
            success: true,
            message: '创建资产类型成功',
            data: {
              id: this.lastID,
              name,
              code,
              description
            }
          });
        }
      );
    }
  );
});

// 更新资产类型
router.put('/:id', authenticateToken, (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员可以更新资产类型'
    });
  }

  const { id } = req.params;
  const { name, description } = req.body;

  // 验证必填字段
  if (!name) {
    return res.status(400).json({
      success: false,
      message: '名称为必填项'
    });
  }

  // 检查资产类型是否存在
  db.get(
    `SELECT * FROM asset_types WHERE id = ?`,
    [id],
    (err, type) => {
      if (err) {
        logger.error('检查资产类型失败:', err);
        return res.status(500).json({
          success: false,
          message: '更新资产类型失败'
        });
      }

      if (!type) {
        return res.status(404).json({
          success: false,
          message: '资产类型不存在'
        });
      }

      // 更新资产类型
      db.run(
        `UPDATE asset_types
         SET name = ?, description = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [name, description || '', id],
        (err) => {
          if (err) {
            logger.error('更新资产类型失败:', err);
            return res.status(500).json({
              success: false,
              message: '更新资产类型失败'
            });
          }

          res.json({
            success: true,
            message: '更新资产类型成功',
            data: {
              id: parseInt(id),
              name,
              code: type.code,
              description: description || ''
            }
          });
        }
      );
    }
  );
});

// 删除资产类型
router.delete('/:id', authenticateToken, (req, res) => {
  // 检查是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员可以删除资产类型'
    });
  }

  const { id } = req.params;

  // 检查是否有资产使用此类型
  db.get(
    `SELECT COUNT(*) as count FROM assets WHERE type = (SELECT code FROM asset_types WHERE id = ?)`,
    [id],
    (err, result) => {
      if (err) {
        logger.error('检查资产类型使用情况失败:', err);
        return res.status(500).json({
          success: false,
          message: '删除资产类型失败'
        });
      }

      if (result.count > 0) {
        return res.status(400).json({
          success: false,
          message: '该资产类型已被使用，无法删除'
        });
      }

      // 删除资产类型
      db.run(
        `DELETE FROM asset_types WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            logger.error('删除资产类型失败:', err);
            return res.status(500).json({
              success: false,
              message: '删除资产类型失败'
            });
          }

          res.json({
            success: true,
            message: '删除资产类型成功'
          });
        }
      );
    }
  );
});

module.exports = router;
