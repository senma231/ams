const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 获取所有借用记录
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate, userId } = req.query;
    let query = `
      SELECT 
        t.*,
        a.name as asset_name,
        u.username as user_name
      FROM transactions t
      JOIN assets a ON t.asset_id = a.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    if (startDate) {
      query += ' AND t.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.created_at <= ?';
      params.push(endDate);
    }
    if (userId) {
      query += ' AND t.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY t.created_at DESC';

    db.all(query, params, (err, transactions) => {
      if (err) {
        logger.error('获取借用记录失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取借用记录失败'
        });
      }
      res.json({
        success: true,
        data: transactions
      });
    });
  } catch (error) {
    logger.error('获取借用记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取借用记录失败'
    });
  }
});

// 创建借用记录
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { asset_id, user_id, type, expected_return_date } = req.body;
    
    // 检查资产是否可用
    db.get('SELECT status FROM assets WHERE id = ?', [asset_id], (err, asset) => {
      if (err) {
        logger.error('检查资产状态失败:', err);
        return res.status(500).json({
          success: false,
          message: '创建借用记录失败'
        });
      }

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: '资产不存在'
        });
      }

      if (asset.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: '资产当前不可用'
        });
      }

      // 创建借用记录
      const query = `
        INSERT INTO transactions (
          asset_id, user_id, type, status, 
          created_at, expected_return_date
        )
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `;
      
      db.run(query, [
        asset_id, user_id, type, 'borrowed', expected_return_date
      ], function(err) {
        if (err) {
          logger.error('创建借用记录失败:', err);
          return res.status(500).json({
            success: false,
            message: '创建借用记录失败'
          });
        }

        // 更新资产状态
        db.run(
          'UPDATE assets SET status = ? WHERE id = ?',
          ['in_use', asset_id],
          (err) => {
            if (err) {
              logger.error('更新资产状态失败:', err);
              return res.status(500).json({
                success: false,
                message: '更新资产状态失败'
              });
            }

            res.json({
              success: true,
              data: {
                id: this.lastID,
                asset_id,
                user_id,
                type,
                status: 'borrowed',
                expected_return_date
              }
            });
          }
        );
      });
    });
  } catch (error) {
    logger.error('创建借用记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建借用记录失败'
    });
  }
});

// 归还资产
router.put('/transactions/:id/return', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查借用记录是否存在
    db.get(
      'SELECT asset_id, status FROM transactions WHERE id = ?',
      [id],
      (err, transaction) => {
        if (err) {
          logger.error('检查借用记录失败:', err);
          return res.status(500).json({
            success: false,
            message: '归还资产失败'
          });
        }

        if (!transaction) {
          return res.status(404).json({
            success: false,
            message: '借用记录不存在'
          });
        }

        if (transaction.status === 'returned') {
          return res.status(400).json({
            success: false,
            message: '该资产已经归还'
          });
        }

        // 更新借用记录
        db.run(
          `UPDATE transactions 
           SET status = ?, return_date = datetime('now')
           WHERE id = ?`,
          ['returned', id],
          (err) => {
            if (err) {
              logger.error('更新借用记录失败:', err);
              return res.status(500).json({
                success: false,
                message: '归还资产失败'
              });
            }

            // 更新资产状态
            db.run(
              'UPDATE assets SET status = ? WHERE id = ?',
              ['available', transaction.asset_id],
              (err) => {
                if (err) {
                  logger.error('更新资产状态失败:', err);
                  return res.status(500).json({
                    success: false,
                    message: '更新资产状态失败'
                  });
                }

                res.json({
                  success: true,
                  message: '资产归还成功'
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    logger.error('归还资产失败:', error);
    res.status(500).json({
      success: false,
      message: '归还资产失败'
    });
  }
});

module.exports = router; 