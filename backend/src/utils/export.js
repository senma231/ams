const ExcelJS = require('exceljs');
const { createLogger } = require('./logger');
const { db } = require('../config/database');
const path = require('path');
const fs = require('fs');

const logger = createLogger();

// 确保导出目录存在
const ensureExportDir = () => {
  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
};

// 导出资产信息
const exportAssets = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('资产信息');

  // 设置表头
  worksheet.columns = [
    { header: '资产编号', key: 'id', width: 10 },
    { header: '资产名称', key: 'name', width: 20 },
    { header: '资产类型', key: 'type', width: 15 },
    { header: '状态', key: 'status', width: 15 },
    { header: '所属部门', key: 'branch', width: 20 },
    { header: '描述', key: 'description', width: 30 },
    { header: '创建时间', key: 'created_at', width: 20 },
    { header: '更新时间', key: 'updated_at', width: 20 }
  ];

  // 构建查询条件
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

  // 获取数据
  const assets = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  // 添加数据行
  assets.forEach(asset => {
    worksheet.addRow(asset);
  });

  // 设置样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  // 保存文件
  const filename = `assets_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
  const filepath = path.join(ensureExportDir(), filename);
  await workbook.xlsx.writeFile(filepath);

  return {
    filename,
    filepath
  };
};

// 导出借用记录
const exportTransactions = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('借用记录');

  // 设置表头
  worksheet.columns = [
    { header: '记录编号', key: 'id', width: 10 },
    { header: '资产名称', key: 'asset_name', width: 20 },
    { header: '借用人', key: 'user_name', width: 15 },
    { header: '操作类型', key: 'type', width: 15 },
    { header: '借用时间', key: 'created_at', width: 20 },
    { header: '预计归还时间', key: 'expected_return_date', width: 20 },
    { header: '实际归还时间', key: 'return_date', width: 20 },
    { header: '状态', key: 'status', width: 15 }
  ];

  // 构建查询条件
  let query = `
    SELECT 
      t.*,
      a.name as asset_name,
      u.name as user_name
    FROM transactions t
    JOIN assets a ON t.asset_id = a.id
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.type) {
    query += ' AND t.type = ?';
    params.push(filters.type);
  }
  if (filters.startDate) {
    query += ' AND t.created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND t.created_at <= ?';
    params.push(filters.endDate);
  }

  // 获取数据
  const transactions = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  // 添加数据行
  transactions.forEach(transaction => {
    worksheet.addRow(transaction);
  });

  // 设置样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  // 保存文件
  const filename = `transactions_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
  const filepath = path.join(ensureExportDir(), filename);
  await workbook.xlsx.writeFile(filepath);

  return {
    filename,
    filepath
  };
};

// 清理过期导出文件（保留24小时内的文件）
const cleanOldExports = async () => {
  const exportDir = ensureExportDir();
  const files = fs.readdirSync(exportDir);
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  files.forEach(file => {
    const filepath = path.join(exportDir, file);
    const stats = fs.statSync(filepath);
    if (now - stats.mtime.getTime() > ONE_DAY) {
      fs.unlinkSync(filepath);
      logger.info(`删除过期导出文件: ${file}`);
    }
  });
};

module.exports = {
  exportAssets,
  exportTransactions,
  cleanOldExports
}; 