const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 获取仪表盘数据
router.get('/', authenticateToken, (req, res) => {
  const queries = {
    assetStats: `
      SELECT
        (
          SELECT COUNT(*)
          FROM assets
        ) as total,
        (
          SELECT COUNT(*)
          FROM assets
          WHERE status = 'in_stock'
        ) as in_stock,
        (
          SELECT COUNT(*)
          FROM assets
          WHERE status = 'in_use'
        ) as in_use,
        (
          SELECT COUNT(*)
          FROM assets
          WHERE status = 'scrapped'
        ) as scrapped
    `,
    recentStockIn: `
      SELECT
        s.*,
        u.username as operator_name,
        COUNT(i.id) as item_count,
        SUM(i.quantity) as total_quantity,
        (SELECT GROUP_CONCAT(DISTINCT at.name)
         FROM stock_in_items si
         JOIN assets a ON si.asset_id = a.id
         LEFT JOIN asset_types at ON a.type = at.code
         WHERE si.stock_in_id = s.id) as asset_type_names
      FROM stock_in_records s
      JOIN users u ON s.operator_id = u.id
      JOIN stock_in_items i ON s.id = i.stock_in_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `,
    recentStockOut: `
      SELECT
        s.*,
        u.username as operator_name,
        COUNT(i.id) as item_count
      FROM stock_out_records s
      JOIN users u ON s.operator_id = u.id
      JOIN stock_out_items i ON s.id = i.stock_out_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `,
    recentOperations: `
      SELECT
        o.id,
        o.asset_id,
        o.operation_type,
        o.notes,
        o.created_at,
        u.username as operator_name,
        a.name as asset_name,
        a.code as asset_code
      FROM asset_operations o
      JOIN users u ON o.operator_id = u.id
      JOIN assets a ON o.asset_id = a.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
    assetsByType: `
      SELECT
        a.type,
        t.name as type_name,
        COUNT(*) as total_count,
        SUM(CASE WHEN a.status = 'in_stock' THEN 1 ELSE 0 END) as available_count
      FROM assets a
      LEFT JOIN asset_types t ON a.type = t.code
      GROUP BY a.type
      ORDER BY total_count DESC
    `,
    assetsByDepartment: `
      SELECT
        COALESCE(a.department, '未分配') as department_name,
        COUNT(*) as asset_count,
        SUM(CASE WHEN a.status = 'in_use' THEN 1 ELSE 0 END) as in_use_count
      FROM assets a
      GROUP BY a.department
      ORDER BY asset_count DESC
    `
  };

  // 获取资产统计
  db.get(queries.assetStats, [], (err, assetStats) => {
    if (err) {
      logger.error('获取资产统计失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取仪表盘数据失败'
      });
    }

    // 获取最近入库记录
    db.all(queries.recentStockIn, [], (err, recentStockIn) => {
      if (err) {
        logger.error('获取最近入库记录失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取仪表盘数据失败'
        });
      }

      // 获取最近出库记录
      db.all(queries.recentStockOut, [], (err, recentStockOut) => {
        if (err) {
          logger.error('获取最近出库记录失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取仪表盘数据失败'
          });
        }

        // 获取最近资产操作记录（报废、回收）
        db.all(queries.recentOperations, [], (err, recentOperations) => {
          if (err) {
            logger.error('获取最近资产操作记录失败:', err);
            return res.status(500).json({
              success: false,
              message: '获取仪表盘数据失败'
            });
          }

          // 合并所有操作记录
          const allOperations = [
            ...recentStockIn.map(item => ({
              type: 'stock_in',
              id: `IN-${item.id}`,
              created_at: item.created_at,
              operator_name: item.operator_name,
              description: `批次号: ${item.batch_no}, 类型: ${item.asset_type_names || item.type}, 数量: ${item.total_quantity || 0}`
            })),
            ...recentStockOut.map(item => ({
              type: 'stock_out',
              id: `OUT-${item.id}`,
              created_at: item.created_at,
              operator_name: item.operator_name,
              description: `批次号: ${item.batch_no}, 领用人: ${item.recipient}, 部门: ${item.department}`
            })),
            ...recentOperations.map(item => ({
              type: item.operation_type,
              id: `${item.operation_type.toUpperCase()}-${item.asset_id}`,
              created_at: item.created_at,
              operator_name: item.operator_name,
              description: `资产: ${item.asset_name}, 编码: ${item.asset_code || '无'}, 备注: ${item.notes || '无'}`
            }))
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          // 获取资产类型分布
          db.all(queries.assetsByType, [], (err, assetsByType) => {
            if (err) {
              logger.error('获取资产类型分布失败:', err);
              return res.status(500).json({
                success: false,
                message: '获取仪表盘数据失败'
              });
            }

            // 获取部门资产分布
            db.all(queries.assetsByDepartment, [], (err, assetsByDepartment) => {
              if (err) {
                logger.error('获取部门资产分布失败:', err);
                return res.status(500).json({
                  success: false,
                  message: '获取仪表盘数据失败'
                });
              }

              res.json({
                success: true,
                data: {
                  assetStats,
                  recentStockIn,
                  recentStockOut,
                  recentOperations,
                  allOperations,
                  assetsByType,
                  assetsByDepartment
                }
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;