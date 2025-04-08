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

  const { code, type, status, department, page = 1, pageSize = 10 } = req.query;

  // 将code参数也用作关键字搜索
  const keyword = code || req.query.keyword;

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
        let safeAssets = Array.isArray(assets) ? assets : [];

        // 输出详细的资产数据信息便于调试
        if (safeAssets.length > 0) {
          const firstAsset = safeAssets[0];
          try {
            // 使用安全的方式输出字段
            logger.info('资产ID:', firstAsset.id);
            logger.info('资产名称:', firstAsset.name);
            logger.info('资产类型:', firstAsset.type);
            logger.info('资产状态:', firstAsset.status);
            logger.info('所属部门:', firstAsset.department);
            logger.info('当前使用部门:', firstAsset.current_department);
            logger.info('使用人:', firstAsset.recipient);
          } catch (error) {
            logger.error('输出资产数据详情时出错:', error);
          }

          // 确保所有资产都有必要的字段
          safeAssets = safeAssets.map(asset => ({
            ...asset,
            id: asset.id || '',
            name: asset.name || '',
            type: asset.type || '',
            status: asset.status || 'in_stock',
            department: asset.department || '',
            current_department: asset.current_department || '',
            recipient: asset.recipient || ''
          }));
        } else {
          logger.info('资产数据为空');
        }

        res.json({
          success: true,
          data: safeAssets,
          total
        });
      });
    });
  });
});

// 资产回收
router.post('/:id/return', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  logger.info(`开始回收资产 ID: ${id}`);

  // 首先检查资产是否存在
  db.get('SELECT * FROM assets WHERE id = ?', [id], (err, asset) => {
    if (err) {
      logger.error(`查询资产失败:`, err);
      return res.status(500).json({
        success: false,
        message: '回收资产失败'
      });
    }

    if (!asset) {
      logger.error(`资产不存在 ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: '资产不存在'
      });
    }

    // 更新资产状态为在库
    db.run(
      'UPDATE assets SET status = ?, last_stock_out_id = NULL, updated_at = DATETIME("now") WHERE id = ?',
      ['in_stock', id],
      function(updateErr) {
        if (updateErr) {
          logger.error(`更新资产状态失败:`, updateErr);
          return res.status(500).json({
            success: false,
            message: '回收资产失败'
          });
        }

        // 记录回收操作
        db.run(
          'INSERT INTO asset_operations (asset_id, operation_type, operator_id, notes) VALUES (?, ?, ?, ?)',
          [id, 'return', userId, ''],
          function(opErr) {
            if (opErr) {
              logger.error(`记录回收操作失败:`, opErr);
              // 不返回错误，因为资产状态已经更新成功
              logger.warn(`资产状态已更新，但操作记录失败`);
            }

            logger.info(`资产回收成功 ID: ${id}`);
            return res.json({
              success: true,
              message: '资产回收成功'
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
  const userId = req.user.id;

  logger.info(`开始报废资产 ID: ${id}`);

  // 首先检查资产是否存在
  db.get('SELECT * FROM assets WHERE id = ?', [id], (err, asset) => {
    if (err) {
      logger.error(`查询资产失败:`, err);
      return res.status(500).json({
        success: false,
        message: '报废资产失败'
      });
    }

    if (!asset) {
      logger.error(`资产不存在 ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: '资产不存在'
      });
    }

    // 更新资产状态为报废
    db.run(
      'UPDATE assets SET status = ?, updated_at = DATETIME("now") WHERE id = ?',
      ['scrapped', id],
      function(updateErr) {
        if (updateErr) {
          logger.error(`更新资产状态失败:`, updateErr);
          return res.status(500).json({
            success: false,
            message: '报废资产失败'
          });
        }

        // 记录报废操作
        db.run(
          'INSERT INTO asset_operations (asset_id, operation_type, operator_id, notes) VALUES (?, ?, ?, ?)',
          [id, 'scrap', userId, ''],
          function(opErr) {
            if (opErr) {
              logger.error(`记录报废操作失败:`, opErr);
              // 不返回错误，因为资产状态已经更新成功
              logger.warn(`资产状态已更新，但操作记录失败`);
            }

            logger.info(`资产报废成功 ID: ${id}`);
            return res.json({
              success: true,
              message: '资产报废成功'
            });
          }
        );
      }
    );
  });
});

module.exports = router;
