const schedule = require('node-schedule');
const { createLogger } = require('./logger');
const { backupDatabase, cleanOldBackups } = require('./backup');
const { db } = require('../config/database');
const { sendNotification } = require('./notification');
const config = require('../config/config');

const logger = createLogger();

// 初始化定时任务
const initScheduler = () => {
  // 数据库自动备份任务（每天凌晨3点执行）
  schedule.scheduleJob('0 3 * * *', async () => {
    try {
      logger.info('开始执行自动备份...');
      await backupDatabase();
      await cleanOldBackups();
      logger.info('自动备份完成');
    } catch (error) {
      logger.error('自动备份失败:', error);
    }
  });

  // 借用到期检查任务（每小时检查一次）
  schedule.scheduleJob('0 * * * *', async () => {
    try {
      logger.info('开始检查借用到期情况...');
      
      // 查询即将到期和已过期的借用记录
      const overdueRecords = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            t.id as transaction_id,
            t.expected_return_date,
            a.name as asset_name,
            u.id as user_id,
            u.name as user_name
          FROM transactions t
          JOIN assets a ON t.asset_id = a.id
          JOIN users u ON t.user_id = u.id
          WHERE t.type = 'borrow'
          AND t.status = 'active'
          AND (
            -- 已过期
            (t.expected_return_date < date('now') AND t.notification_sent = 0)
            OR
            -- 即将到期（3天内）
            (t.expected_return_date BETWEEN date('now') AND date('now', '+3 days') AND t.notification_sent = 0)
          )
        `, (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      // 发送通知
      for (const record of overdueRecords) {
        const isOverdue = new Date(record.expected_return_date) < new Date();
        const notification = {
          user_id: record.user_id,
          type: isOverdue ? 'overdue' : 'due_soon',
          title: isOverdue ? '资产已逾期' : '资产即将到期',
          content: `资产"${record.asset_name}"${isOverdue ? '已逾期' : '即将到期'}，请及时处理。`,
          created_at: new Date()
        };

        await sendNotification(notification);

        // 更新通知发送状态
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE transactions SET notification_sent = 1 WHERE id = ?',
            [record.transaction_id],
            (err) => {
              if (err) reject(err);
              resolve();
            }
          );
        });
      }

      logger.info(`借用到期检查完成，发送了 ${overdueRecords.length} 条通知`);
    } catch (error) {
      logger.error('借用到期检查失败:', error);
    }
  });

  // 库存预警检查任务（每天早上9点执行）
  schedule.scheduleJob('0 9 * * *', async () => {
    try {
      logger.info('开始检查库存预警...');

      // 查询库存不足的资产
      const lowStockAssets = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            a.id,
            a.name,
            a.type,
            COUNT(*) as stock_count,
            t.threshold
          FROM assets a
          JOIN asset_types t ON a.type = t.name
          WHERE a.status = 'in_stock'
          GROUP BY a.type
          HAVING stock_count <= t.threshold
        `, (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      // 发送库存预警通知给管理员
      if (lowStockAssets.length > 0) {
        const admins = await new Promise((resolve, reject) => {
          db.all(
            'SELECT id FROM users WHERE role = ?',
            ['admin'],
            (err, rows) => {
              if (err) reject(err);
              resolve(rows);
            }
          );
        });

        for (const admin of admins) {
          const notification = {
            user_id: admin.id,
            type: 'low_stock',
            title: '库存预警提醒',
            content: `以下资产库存不足：\n${lowStockAssets.map(asset => 
              `${asset.name}（${asset.type}）：当前库存 ${asset.stock_count}`
            ).join('\n')}`,
            created_at: new Date()
          };

          await sendNotification(notification);
        }
      }

      logger.info(`库存预警检查完成，发现 ${lowStockAssets.length} 个预警项`);
    } catch (error) {
      logger.error('库存预警检查失败:', error);
    }
  });
};

module.exports = {
  initScheduler
}; 