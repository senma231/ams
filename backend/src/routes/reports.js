const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');
const ExcelJS = require('exceljs');

const logger = createLogger();

// 获取资产统计数据
router.get('/statistics/assets', authenticateToken, (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM assets) as total,
      (SELECT COUNT(*) FROM assets WHERE status = 'in_stock') as inStock,
      (SELECT COUNT(*) FROM assets WHERE status = 'in_use') as inUse,
      (SELECT COUNT(*) FROM assets WHERE status = 'scrapped') as scrapped,
      (SELECT COUNT(*) FROM asset_operations WHERE operation_type = 'return') as returned
  `;

  db.get(query, [], (err, stats) => {
    if (err) {
      logger.error('获取资产统计数据失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取资产统计数据失败'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  });
});

// 获取交易统计数据
router.get('/statistics/transactions', authenticateToken, (req, res) => {
  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const lastDayOfMonthStr = lastDayOfMonth.toISOString().split('T')[0];

    const query = `
      SELECT
        (SELECT COUNT(*) FROM stock_out_records) as totalAssign,
        (SELECT COUNT(*) FROM stock_out_records WHERE out_date BETWEEN ? AND ?) as monthlyAssign,
        (SELECT COUNT(*) FROM asset_operations WHERE operation_type = 'return') as totalReturn,
        (SELECT COUNT(*) FROM asset_operations WHERE operation_type = 'return' AND DATE(created_at) BETWEEN ? AND ?) as monthlyReturn
    `;

    db.get(query, [firstDayOfMonthStr, lastDayOfMonthStr, firstDayOfMonthStr, lastDayOfMonthStr], (err, stats) => {
      if (err) {
        logger.error('获取交易统计数据失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取交易统计数据失败'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    });
  } catch (error) {
    logger.error('获取交易统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取交易统计数据失败'
    });
  }
});

// 获取原始统计数据
router.get('/statistics', authenticateToken, (req, res) => {
  const queries = {
    total: 'SELECT COUNT(*) as count FROM assets',
    byStatus: `
      SELECT status, COUNT(*) as count
      FROM assets
      GROUP BY status
    `,
    byType: `
      SELECT type, COUNT(*) as count
      FROM assets
      GROUP BY type
    `,
    byDepartment: `
      SELECT department, COUNT(*) as count
      FROM assets
      WHERE department IS NOT NULL
      GROUP BY department
    `
  };

  // 获取总数
  db.get(queries.total, [], (err, totalResult) => {
    if (err) {
      logger.error('获取资产总数失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取统计数据失败'
      });
    }

    // 获取状态分布
    db.all(queries.byStatus, [], (err, statusResult) => {
      if (err) {
        logger.error('获取资产状态分布失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取统计数据失败'
        });
      }

      // 获取类型分布
      db.all(queries.byType, [], (err, typeResult) => {
        if (err) {
          logger.error('获取资产类型分布失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取统计数据失败'
          });
        }

        // 获取部门分布
        db.all(queries.byDepartment, [], (err, departmentResult) => {
          if (err) {
            logger.error('获取部门分布失败:', err);
            return res.status(500).json({
              success: false,
              message: '获取统计数据失败'
            });
          }

          res.json({
            success: true,
            data: {
              total: totalResult.count,
              byStatus: statusResult,
              byType: typeResult,
              byDepartment: departmentResult
            }
          });
        });
      });
    });
  });
});

// 获取最近活动
router.get('/recent-activities', authenticateToken, (req, res) => {
  const query = `
    SELECT
      'stock_in' as type,
      s.id,
      s.batch_no,
      s.created_at,
      u.username as operator_name,
      COUNT(i.id) as item_count,
      SUM(i.quantity) as total_quantity
    FROM stock_in_records s
    JOIN users u ON s.operator_id = u.id
    JOIN stock_in_items i ON s.id = i.stock_in_id
    GROUP BY s.id
    UNION ALL
    SELECT
      'stock_out' as type,
      s.id,
      s.batch_no,
      s.created_at,
      u.username as operator_name,
      COUNT(i.id) as item_count,
      1 as total_quantity
    FROM stock_out_records s
    JOIN users u ON s.operator_id = u.id
    JOIN stock_out_items i ON s.id = i.stock_out_id
    GROUP BY s.id
    ORDER BY created_at DESC
    LIMIT 10
  `;

  db.all(query, [], (err, activities) => {
    if (err) {
      logger.error('获取最近活动失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取最近活动失败'
      });
    }

    res.json({
      success: true,
      data: activities
    });
  });
});

// 获取趋势数据
router.get('/trends', authenticateToken, (req, res) => {
  const { type = 'month', start_date, end_date } = req.query;

  let timeFormat;
  if (type === 'day') {
    timeFormat = '%Y-%m-%d';
  } else if (type === 'month') {
    timeFormat = '%Y-%m';
  } else {
    timeFormat = '%Y';
  }

  const query = `
    SELECT
      strftime('${timeFormat}', s.created_at) as time_period,
      COUNT(DISTINCT s.id) as record_count,
      COUNT(i.id) as item_count
    FROM stock_in_records s
    JOIN stock_in_items i ON s.id = i.stock_in_id
    ${start_date ? "WHERE s.created_at >= datetime('" + start_date + "')" : ''}
    ${end_date ? "AND s.created_at <= datetime('" + end_date + "')" : ''}
    GROUP BY time_period
    ORDER BY time_period
  `;

  db.all(query, [], (err, trends) => {
    if (err) {
      logger.error('获取趋势数据失败:', err);
      return res.status(500).json({
        success: false,
        message: '获取趋势数据失败'
      });
    }

    res.json({
      success: true,
      data: trends
    });
  });
});

// 导出资产报表
router.get('/assets', authenticateToken, async (req, res) => {
  try {
    const { type, status, branch } = req.query;

    let query = `
      SELECT
        a.id,
        a.code,
        a.name,
        a.type,
        CASE
          WHEN a.status = 'in_stock' THEN '在库'
          WHEN a.status = 'in_use' THEN '使用中'
          WHEN a.status = 'scrapped' THEN '已报废'
          ELSE a.status
        END as status,
        a.department,
        a.description,
        a.created_at,
        u.username as operator_name
      FROM assets a
      LEFT JOIN stock_out_records so ON a.last_stock_out_id = so.id
      LEFT JOIN users u ON so.operator_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }

    if (status) {
      let dbStatus = '';
      if (status === '在库') dbStatus = 'in_stock';
      else if (status === '领用') dbStatus = 'in_use';
      else if (status === '回收') dbStatus = 'scrapped';

      if (dbStatus) {
        query += ' AND a.status = ?';
        params.push(dbStatus);
      }
    }

    if (branch) {
      query += ' AND a.department LIKE ?';
      params.push(`%${branch}%`);
    }

    query += ' ORDER BY a.created_at DESC';

    db.all(query, params, async (err, assets) => {
      if (err) {
        logger.error('获取资产数据失败:', err);
        return res.status(500).json({
          success: false,
          message: '导出资产报表失败'
        });
      }

      // 创建Excel工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('资产报表');

      // 设置表头
      worksheet.columns = [
        { header: '资产ID', key: 'id', width: 10 },
        { header: '资产编码', key: 'code', width: 15 },
        { header: '资产名称', key: 'name', width: 20 },
        { header: '资产类型', key: 'type', width: 15 },
        { header: '状态', key: 'status', width: 10 },
        { header: '所属部门', key: 'department', width: 15 },
        { header: '描述', key: 'description', width: 30 },
        { header: '创建时间', key: 'created_at', width: 20 },
        { header: '操作人', key: 'operator_name', width: 15 }
      ];

      // 添加数据
      assets.forEach(asset => {
        worksheet.addRow({
          id: asset.id,
          code: asset.code || '',
          name: asset.name,
          type: asset.type,
          status: asset.status,
          department: asset.department,
          description: asset.description || '',
          created_at: asset.created_at ? new Date(asset.created_at).toLocaleString() : '',
          operator_name: asset.operator_name || ''
        });
      });

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=assets_report_${new Date().toISOString().split('T')[0]}.xlsx`);

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (error) {
    logger.error('导出资产报表失败:', error);
    res.status(500).json({
      success: false,
      message: '导出资产报表失败'
    });
  }
});

// 导出交易报表
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    // 获取出库记录
    let stockOutQuery = `
      SELECT
        so.id,
        so.batch_no,
        so.recipient,
        so.department,
        so.out_date,
        so.notes,
        so.created_at,
        u.username as operator_name,
        'out' as operation_type,
        COUNT(soi.id) as item_count,
        a.name as asset_name,
        a.code as asset_code
      FROM stock_out_records so
      JOIN users u ON so.operator_id = u.id
      JOIN stock_out_items soi ON so.id = soi.stock_out_id
      JOIN assets a ON soi.asset_id = a.id
      WHERE 1=1
    `;

    const stockOutParams = [];

    if (type && type === '领用') {
      // 只筛选领用记录，不需要额外条件
    } else if (type && type !== '领用') {
      // 如果指定了类型但不是领用，则不返回出库记录
      stockOutQuery += ' AND 1=0';
    }

    if (startDate) {
      stockOutQuery += ' AND so.out_date >= ?';
      stockOutParams.push(startDate);
    }

    if (endDate) {
      stockOutQuery += ' AND so.out_date <= ?';
      stockOutParams.push(endDate);
    }

    stockOutQuery += ' GROUP BY so.id ORDER BY so.created_at DESC';

    // 获取回收记录
    let returnQuery = `
      SELECT
        ao.id,
        NULL as batch_no,
        NULL as recipient,
        a.department,
        ao.created_at as out_date,
        ao.notes,
        ao.created_at,
        u.username as operator_name,
        'return' as operation_type,
        1 as item_count,
        a.name as asset_name,
        a.code as asset_code
      FROM asset_operations ao
      JOIN users u ON ao.operator_id = u.id
      JOIN assets a ON ao.asset_id = a.id
      WHERE ao.operation_type = 'return'
    `;

    const returnParams = [];

    if (type && type === '回收') {
      // 只筛选回收记录，不需要额外条件
    } else if (type && type !== '回收') {
      // 如果指定了类型但不是回收，则不返回回收记录
      returnQuery += ' AND 1=0';
    }

    if (startDate) {
      returnQuery += ' AND DATE(ao.created_at) >= ?';
      returnParams.push(startDate);
    }

    if (endDate) {
      returnQuery += ' AND DATE(ao.created_at) <= ?';
      returnParams.push(endDate);
    }

    returnQuery += ' ORDER BY ao.created_at DESC';

    // 执行查询
    db.all(stockOutQuery, stockOutParams, (err, stockOutRecords) => {
      if (err) {
        logger.error('获取出库记录失败:', err);
        return res.status(500).json({
          success: false,
          message: '导出交易报表失败'
        });
      }

      db.all(returnQuery, returnParams, async (err, returnRecords) => {
        if (err) {
          logger.error('获取回收记录失败:', err);
          return res.status(500).json({
            success: false,
            message: '导出交易报表失败'
          });
        }

        // 合并记录
        const allRecords = [...stockOutRecords, ...returnRecords].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });

        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('交易报表');

        // 设置表头
        worksheet.columns = [
          { header: '操作类型', key: 'operation_type', width: 10 },
          { header: '批次号', key: 'batch_no', width: 15 },
          { header: '资产名称', key: 'asset_name', width: 20 },
          { header: '资产编码', key: 'asset_code', width: 15 },
          { header: '领用人/回收人', key: 'recipient', width: 15 },
          { header: '部门', key: 'department', width: 15 },
          { header: '操作日期', key: 'out_date', width: 15 },
          { header: '操作人', key: 'operator_name', width: 15 },
          { header: '备注', key: 'notes', width: 30 }
        ];

        // 添加数据
        allRecords.forEach(record => {
          worksheet.addRow({
            operation_type: record.operation_type === 'out' ? '领用' : '回收',
            batch_no: record.batch_no || '',
            asset_name: record.asset_name || '',
            asset_code: record.asset_code || '',
            recipient: record.recipient || '',
            department: record.department || '',
            out_date: record.out_date ? new Date(record.out_date).toLocaleDateString() : '',
            operator_name: record.operator_name || '',
            notes: record.notes || ''
          });
        });

        // 设置响应头
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_report_${new Date().toISOString().split('T')[0]}.xlsx`);

        // 写入响应
        await workbook.xlsx.write(res);
        res.end();
      });
    });
  } catch (error) {
    logger.error('导出交易报表失败:', error);
    res.status(500).json({
      success: false,
      message: '导出交易报表失败'
    });
  }
});

module.exports = router;