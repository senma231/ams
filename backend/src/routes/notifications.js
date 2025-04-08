const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} = require('../utils/notification');

// 获取未读通知
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    const notifications = await getUnreadNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: '获取通知失败' });
  }
});

// 标记通知为已读
router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    await markNotificationAsRead(req.params.id, req.user.id);
    res.json({ message: '标记通知已读成功' });
  } catch (error) {
    res.status(500).json({ message: '标记通知已读失败' });
  }
});

// 标记所有通知为已读
router.put('/notifications/read-all', isAuthenticated, async (req, res) => {
  try {
    await markAllNotificationsAsRead(req.user.id);
    res.json({ message: '标记所有通知已读成功' });
  } catch (error) {
    res.status(500).json({ message: '标记所有通知已读失败' });
  }
});

// 删除通知
router.delete('/notifications/:id', isAuthenticated, async (req, res) => {
  try {
    await deleteNotification(req.params.id, req.user.id);
    res.json({ message: '删除通知成功' });
  } catch (error) {
    res.status(500).json({ message: '删除通知失败' });
  }
});

module.exports = router; 