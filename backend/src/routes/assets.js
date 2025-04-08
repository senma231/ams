const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 获取资产列表
router.get('/', authenticateToken, (req, res) => {
  logger.info('开始获取资产列表');
  logger.info('请求参数:', req.query);

  const { code, type, status, department, keyword, page = 1, pageSize = 10 } = req.query;

  // 首先检查表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='assets'", (tableErr, tableRow) => {
    if (tableErr) {
      logger.error('检查资产表失败:', tableErr);
      return res.status(500).json({
        success: false,
        message: '获取资产列表失败'
      });
    }

    if (!tableRow) {
      logger.error('资产表不存在');
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: '资产表不存在'
      });
    }

    let query = `
      SELECT DISTINCT
             a.id,
             a.code,
             a.name,
             a.type,
             a.status,
             a.department,
             a.description,
             a.created_at,
             so.recipient,
             so.department as current_department,
             so.out_date
      FROM assets a
      LEFT JOIN stock_out_records so ON a.last_stock_out_id = so.id
      WHERE 1=1
    `;
    const params = [];

  if (code) {
    query += ' AND a.code LIKE ?';
    params.push(`%${code}%`);
  }

  if (keyword) {
    query += ' AND (a.name LIKE ? OR a.code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (type) {
    query += ' AND a.type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  if (department) {
    query += ' AND (so.department LIKE ? OR a.department LIKE ?)';
    params.push(`%${department}%`, `%${department}%`);
  }

  // 获取总数
  const countQuery = `
    SELECT COUNT(DISTINCT a.id) as total
    FROM assets a
    LEFT JOIN stock_out_records so ON a.last_stock_out_id = so.id
    WHERE 1=1
    ${code ? ' AND a.code LIKE ?' : ''}
    ${keyword ? ' AND (a.name LIKE ? OR a.code LIKE ?)' : ''}
    ${type ? ' AND a.type = ?' : ''}
    ${status ? ' AND a.status = ?' : ''}
    ${department ? ' AND (so.department LIKE ? OR a.department LIKE ?)' : ''}
  `;

  // 添加分页和排序
  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  // 执行查询
  db.get(countQuery, params.slice(0, -2), (err, result) => {
    if (err) {
      logger.error('获取资产总数失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取资产列表失败'
      });
    }

    // 确保结果存在且有total属性
    const total = result && result.total ? result.total : 0;
    logger.info(`资产总数: ${total}`);

    // 如果总数为0，直接返回空数组
    if (total === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }

    db.all(query, params, (err, assets) => {
      if (err) {
        logger.error('获取资产列表失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取资产列表失败'
        });
      }

      logger.info(`成功获取资产列表，共 ${assets.length} 条记录，总数 ${total}`);

      // 确保返回的是数组
      const safeAssets = Array.isArray(assets) ? assets : [];

      res.json({
        success: true,
        data: safeAssets,
        total
      });
    });
  });
});

// 获取资产详情
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT * FROM assets WHERE id = ?',
    [id],
    (err, asset) => {
      if (err) {
        logger.error('获取资产详情失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取资产详情失败'
        });
      }

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: '资产不存在'
        });
      }

      res.json({
        success: true,
        data: asset
      });
    }
  );
});

// 根据编码获取资产 - 必须放在 /:id 路由之前，否则会被 /:id 路由匹配
router.get('/code/:code', authenticateToken, (req, res) => {
  const { code } = req.params;

  db.get(
    'SELECT * FROM assets WHERE code = ?',
    [code],
    (err, asset) => {
      if (err) {
        logger.error('获取资产详情失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取资产详情失败'
        });
      }

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: '资产不存在'
        });
      }

      res.json({
        success: true,
        data: asset
      });
    }
  );
});

// 更新资产信息
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  db.run(
    'UPDATE assets SET description = ? WHERE id = ?',
    [description, id],
    (err) => {
      if (err) {
        logger.error('更新资产信息失败:', err);
        return res.status(500).json({
          success: false,
          message: '更新资产信息失败'
        });
      }

      res.json({
        success: true,
        message: '更新资产信息成功'
      });
    }
  );
});

// 添加资产
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, status, branch, description } = req.body;
    // 生成资产编码
    const code = `ASSET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const query = `
      INSERT INTO assets (code, name, type, status, branch, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    db.run(query, [code, name, type, status || 'in_stock', branch, description], function(err) {
      if (err) {
        logger.error('添加资产失败:', err);
        return res.status(500).json({
          success: false,
          message: '添加资产失败'
        });
      }

      res.json({
        success: true,
        data: {
          id: this.lastID,
          code,
          name,
          type,
          status: status || 'in_stock',
          branch,
          description
        }
      });
    });
  } catch (error) {
    logger.error('添加资产失败:', error);
    res.status(500).json({
      success: false,
      message: '添加资产失败'
    });
  }
});

// 删除资产
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM assets WHERE id = ?';

    db.run(query, [id], (err) => {
      if (err) {
        logger.error('删除资产失败:', err);
        return res.status(500).json({
          success: false,
          message: '删除资产失败'
        });
      }

      res.json({
        success: true,
        message: '资产删除成功'
      });
    });
  } catch (error) {
    logger.error('删除资产失败:', error);
    res.status(500).json({
      success: false,
      message: '删除资产失败'
    });
  }
});

// 资产领用
router.post('/:id/assign', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { recipient, department, out_date, description } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 检查资产状态
    db.get('SELECT status FROM assets WHERE id = ?', [id], (err, asset) => {
      if (err) {
        logger.error('检查资产状态失败:', err);
        db.run('ROLLBACK');
        return res.status(500).json({
          success: false,
          message: '资产领用失败'
        });
      }

      if (!asset || asset.status !== 'in_stock') {
        db.run('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: '资产不可领用'
        });
      }

      // 创建出库记录
      db.run(
        `INSERT INTO stock_out_records (
          batch_no, recipient, department, out_date,
          operator_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `OUT-${Date.now()}`,
          recipient,
          department,
          out_date,
          req.user.id,
          description
        ],
        function(err) {
          if (err) {
            logger.error('创建出库记录失败:', err);
            db.run('ROLLBACK');
            return res.status(500).json({
              success: false,
              message: '资产领用失败'
            });
          }

          const stock_out_id = this.lastID;

          // 更新资产状态
          db.run(
            `UPDATE assets
            SET status = 'in_use',
                last_stock_out_id = ?
            WHERE id = ?`,
            [stock_out_id, id],
            (err) => {
              if (err) {
                logger.error('更新资产状态失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                  success: false,
                  message: '资产领用失败'
                });
              }

              // 创建出库明细
              db.run(
                `INSERT INTO stock_out_items (
                  stock_out_id, asset_id, quantity
                ) VALUES (?, ?, 1)`,
                [stock_out_id, id],
                (err) => {
                  if (err) {
                    logger.error('创建出库明细失败:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({
                      success: false,
                      message: '资产领用失败'
                    });
                  }

                  db.run('COMMIT', (err) => {
                    if (err) {
                      logger.error('提交事务失败:', err);
                      db.run('ROLLBACK');
                      return res.status(500).json({
                        success: false,
                        message: '资产领用失败'
                      });
                    }

                    res.json({
                      success: true,
                      message: '资产领用成功'
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// 资产回收
router.post('/:id/return', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 更新资产状态
    db.run(
      `UPDATE assets
      SET status = 'in_stock',
          last_stock_out_id = NULL
      WHERE id = ?`,
      [id],
      (err) => {
        if (err) {
          logger.error('更新资产状态失败:', err);
          db.run('ROLLBACK');
          return res.status(500).json({
            success: false,
            message: '资产回收失败'
          });
        }

        // 记录回收操作
        db.run(
          `INSERT INTO asset_operations (
            asset_id, operation_type, operator_id, notes
          ) VALUES (?, 'return', ?, ?)`,
          [id, req.user.id, notes || ''],
          (err) => {
            if (err) {
              logger.error('记录回收操作失败:', err);
              db.run('ROLLBACK');
              return res.status(500).json({
                success: false,
                message: '资产回收失败'
              });
            }

            db.run('COMMIT', (err) => {
              if (err) {
                logger.error('提交事务失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                  success: false,
                  message: '资产回收失败'
                });
              }

              res.json({
                success: true,
                message: '资产回收成功'
              });
            });
          }
        );
      }
    );
  });
});

// 资产报废
router.post('/:id/scrap', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 更新资产状态
    db.run(
      `UPDATE assets
      SET status = 'scrapped'
      WHERE id = ?`,
      [id],
      (err) => {
        if (err) {
          logger.error('更新资产状态失败:', err);
          db.run('ROLLBACK');
          return res.status(500).json({
            success: false,
            message: '资产报废失败'
          });
        }

        // 记录报废操作
        db.run(
          `INSERT INTO asset_operations (
            asset_id, operation_type, operator_id, notes
          ) VALUES (?, 'scrap', ?, ?)`,
          [id, req.user.id, notes || ''],
          (err) => {
            if (err) {
              logger.error('记录报废操作失败:', err);
              db.run('ROLLBACK');
              return res.status(500).json({
                success: false,
                message: '资产报废失败'
              });
            }

            db.run('COMMIT', (err) => {
              if (err) {
                logger.error('提交事务失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                  success: false,
                  message: '资产报废失败'
                });
              }

              res.json({
                success: true,
                message: '资产报废成功'
              });
            });
          }
        );
      }
    );
  });
});

module.exports = router;