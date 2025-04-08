const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 创建出库记录
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      batch_no,
      recipient,
      department,
      out_date,
      notes,
      assets
    } = req.body;

    // 验证批次号是否已存在
    db.get('SELECT id FROM stock_out_records WHERE batch_no = ?', [batch_no], (checkErr, existingRecord) => {
      if (checkErr) {
        logger.error('检查批次号失败:', checkErr);
        return res.status(500).json({
          success: false,
          message: '检查批次号失败'
        });
      }

      if (existingRecord) {
        logger.warn(`批次号 ${batch_no} 已存在`);
        return res.status(400).json({
          success: false,
          message: '批次号已存在，请重新提交'
        });
      }

      // 开始事务
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 创建出库记录
        db.run(
          `INSERT INTO stock_out_records (
            batch_no, recipient, department, out_date,
            operator_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [batch_no, recipient, department, out_date, req.user.id, notes],
          function(err) {
            if (err) {
              logger.error('创建出库记录失败:', err);
              db.run('ROLLBACK');
              return res.status(500).json({
                success: false,
                message: '创建出库记录失败'
              });
            }

            const stock_out_id = this.lastID;
            const promises = [];

            // 批量插入出库明细并更新资产状态
            assets.forEach(asset => {
              promises.push(
                new Promise((resolve, reject) => {
                  // 插入出库明细
                  db.run(
                    `INSERT INTO stock_out_items (
                      stock_out_id, asset_id
                    ) VALUES (?, ?)`,
                    [stock_out_id, asset.id],
                    (err) => {
                      if (err) {
                        logger.error('创建出库明细失败:', err);
                        return reject(err);
                      }

                      // 更新资产状态、编码和所属部门
                      db.run(
                        `UPDATE assets SET
                          status = 'in_use',
                          code = CASE WHEN code IS NULL OR code = '' THEN ? ELSE code END,
                          last_stock_out_id = ?,
                          department = ?,
                          updated_at = DATETIME('now')
                        WHERE id = ?`,
                        [asset.code, stock_out_id, department, asset.id],
                        (err) => {
                          if (err) {
                            logger.error('更新资产状态失败:', err);
                            return reject(err);
                          }
                          resolve();
                        }
                      );
                    }
                  );
                })
              );
            });

            // 等待所有操作完成后提交事务
            Promise.all(promises)
              .then(() => {
                db.run('COMMIT', (err) => {
                  if (err) {
                    logger.error('提交事务失败:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({
                      success: false,
                      message: '资产出库失败'
                    });
                  }

                  res.json({
                    success: true,
                    message: '资产出库成功',
                    data: {
                      id: stock_out_id
                    }
                  });
                });
              })
              .catch(err => {
                logger.error('资产出库失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                  success: false,
                  message: '资产出库失败'
                });
              });
          }
        );
      });
    });
  } catch (error) {
    logger.error('资产出库失败:', error);
    res.status(500).json({
      success: false,
      message: '资产出库失败'
    });
  }
});

// 获取出库记录列表
router.get('/', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT
        s.*,
        u.username as operator_name
      FROM stock_out_records s
      JOIN users u ON s.operator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND s.out_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND s.out_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY s.created_at DESC';

    db.all(query, params, (err, records) => {
      if (err) {
        logger.error('获取出库记录失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取出库记录失败'
        });
      }

      res.json({
        success: true,
        data: records
      });
    });
  } catch (error) {
    logger.error('获取出库记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取出库记录失败'
    });
  }
});

// 获取出库记录详情
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // 获取出库记录基本信息
    db.get(
      `SELECT
        s.*,
        u.username as operator_name
      FROM stock_out_records s
      JOIN users u ON s.operator_id = u.id
      WHERE s.id = ?`,
      [id],
      (err, record) => {
        if (err) {
          logger.error('获取出库记录详情失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取出库记录详情失败'
          });
        }

        if (!record) {
          return res.status(404).json({
            success: false,
            message: '出库记录不存在'
          });
        }

        // 获取出库明细
        db.all(
          `SELECT
            i.id as item_id,
            a.*
          FROM stock_out_items i
          JOIN assets a ON i.asset_id = a.id
          WHERE i.stock_out_id = ?`,
          [id],
          (err, items) => {
            if (err) {
              logger.error('获取出库明细失败:', err);
              return res.status(500).json({
                success: false,
                message: '获取出库明细失败'
              });
            }

            res.json({
              success: true,
              data: {
                ...record,
                items
              }
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('获取出库记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取出库记录详情失败'
    });
  }
});

module.exports = router;
