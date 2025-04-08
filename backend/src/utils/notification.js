const { db } = require('../config/database');
const { createLogger } = require('./logger');

const logger = createLogger();

// 发送通知
const sendNotification = async (notification) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO notifications (user_id, type, title, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [notification.user_id, notification.type, notification.title, notification.content, notification.created_at],
      function(err) {
        if (err) {
          logger.error('发送通知失败:', err);
          reject(err);
          return;
        }
        resolve(this.lastID);
      }
    );
  });
};

// 获取用户未读通知
const getUnreadNotifications = async (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) {
          logger.error('获取未读通知失败:', err);
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
};

// 标记通知为已读
const markNotificationAsRead = async (notificationId, userId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId],
      (err) => {
        if (err) {
          logger.error('标记通知已读失败:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

// 标记所有通知为已读
const markAllNotificationsAsRead = async (userId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE notifications SET read = 1 WHERE user_id = ?',
      [userId],
      (err) => {
        if (err) {
          logger.error('标记所有通知已读失败:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

// 删除通知
const deleteNotification = async (notificationId, userId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId],
      (err) => {
        if (err) {
          logger.error('删除通知失败:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

// 清理旧通知（保留最近30天）
const cleanOldNotifications = async () => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM notifications WHERE created_at < date("now", "-30 days")',
      (err) => {
        if (err) {
          logger.error('清理旧通知失败:', err);
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
};

module.exports = {
  sendNotification,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  cleanOldNotifications
}; 