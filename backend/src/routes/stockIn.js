const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 创建入库记录
router.post('/', authenticateToken, async (req, res) => {
  const { assets, batch_no, type, supplier, in_date, notes } = req.body;

  // 验证请求参数
  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供入库资产信息'
    });
  }

  // 验证每个资产的必要字段
  for (const asset of assets) {
    if (!asset.name || !asset.type || !asset.department || !asset.quantity || !asset.unit_price) {
      return res.status(400).json({
        success: false,
        message: '资产信息不完整，请检查名称、类型、部门、数量和单价'
      });
    }
  }

  try {
    // 生成批次号（如果没有提供）
    const finalBatchNo = batch_no || `IN-${Date.now()}`;

    // 开始事务
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 创建入库记录
    const stockInId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stock_in_records (
          batch_no, type, supplier, in_date, operator_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [finalBatchNo, type || 'purchase', supplier, in_date, req.user.id, notes || ''],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 处理每个资产
    for (const asset of assets) {
      // 创建入库明细
      const stockInItemId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO stock_in_items (
            stock_in_id, asset_id, quantity, unit_price
          ) VALUES (?, NULL, ?, ?)`,
          [stockInId, asset.quantity, asset.unit_price],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // 创建多个资产记录
      let firstAssetId = null;

      for (let i = 0; i < asset.quantity; i++) {
        const assetId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO assets (
              name, type, status, department, description,
              created_at, updated_at
            ) VALUES (?, ?, 'in_stock', ?, ?, datetime('now'), datetime('now'))`,
            [
              asset.name,
              asset.type,
              asset.department,
              asset.description || ''
            ],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // 记录第一个资产ID
        if (i === 0) {
          firstAssetId = assetId;

          // 更新入库明细的资产ID
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE stock_in_items SET asset_id = ? WHERE id = ?`,
              [firstAssetId, stockInItemId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }

    // 提交事务
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 返回成功响应
    res.json({
      success: true,
      message: '入库成功',
      data: {
        id: stockInId,
        batch_no: finalBatchNo
      }
    });

  } catch (error) {
    logger.error('入库失败:', error);

    // 回滚事务
    try {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
    } catch (rollbackError) {
      logger.error('回滚事务失败:', rollbackError);
    }

    res.status(500).json({
      success: false,
      message: '入库失败'
    });
  }
});

// 获取入库记录列表
router.get('/', authenticateToken, (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;

  const query = `
    SELECT
      si.*,
      u.username as operator_name,
      COUNT(sii.id) as total_items,
      SUM(sii.quantity) as total_quantity,
      SUM(sii.quantity * sii.unit_price) as total_amount
    FROM stock_in_records si
    LEFT JOIN users u ON si.operator_id = u.id
    LEFT JOIN stock_in_items sii ON si.id = sii.stock_in_id
    GROUP BY si.id
    ORDER BY si.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [parseInt(pageSize), offset], (err, records) => {
    if (err) {
      logger.error('获取入库记录失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取入库记录失败'
      });
    }

    // 获取总数
    db.get('SELECT COUNT(*) as total FROM stock_in_records', [], (err, result) => {
      if (err) {
        logger.error('获取入库记录总数失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取入库记录失败'
        });
      }

      res.json({
        success: true,
        data: records,
        total: result.total
      });
    });
  });
});

// 获取入库记录详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 获取入库记录
    db.get(
      `SELECT
        s.*,
        u.username as operator_name
      FROM stock_in_records s
      JOIN users u ON s.operator_id = u.id
      WHERE s.id = ?`,
      [id],
      (err, record) => {
        if (err) {
          logger.error('获取入库记录失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取入库记录失败'
          });
        }

        if (!record) {
          return res.status(404).json({
            success: false,
            message: '入库记录不存在'
          });
        }

        // 获取入库明细
        db.all(
          `SELECT
            i.id,
            i.asset_id,
            i.quantity,
            i.unit_price,
            a.name,
            a.type,
            a.department,
            a.description
          FROM stock_in_items i
          JOIN assets a ON i.asset_id = a.id
          WHERE i.stock_in_id = ?`,
          [id],
          (err, items) => {
            if (err) {
              logger.error('获取入库明细失败:', err);
              return res.status(500).json({
                success: false,
                message: '获取入库明细失败'
              });
            }

            // 计算总金额
            const total_amount = items.reduce((sum, item) => {
              return sum + (item.quantity * item.unit_price);
            }, 0);

            res.json({
              success: true,
              data: {
                ...record,
                total_amount,
                items
              }
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('获取入库记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取入库记录详情失败'
    });
  }
});

module.exports = router;