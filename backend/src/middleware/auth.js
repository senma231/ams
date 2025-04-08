const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { JWT_SECRET } = require('../config/config');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

/**
 * 统一的认证中间件
 * 验证JWT令牌并将用户信息添加到请求对象中
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error('令牌验证失败:', err);
      return res.status(403).json({
        success: false,
        message: err.name === 'TokenExpiredError' ? '认证令牌已过期' : '无效的认证令牌'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * 验证用户是否为管理员
 */
const isAdmin = (req, res, next) => {
  // 先进行认证
  authenticateToken(req, res, () => {
    // 检查用户角色
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    next();
  });
};

/**
 * 检查用户是否有权限访问特定资源
 */
const hasPermission = (resourceType) => [
  authenticateToken,
  async (req, res, next) => {
    const { id } = req.params;

    try {
      let hasAccess = false;

      switch (resourceType) {
        case 'asset':
          // 管理员可以访问所有资产
          if (req.user.role === 'admin') {
            hasAccess = true;
          } else {
            // 普通用户只能访问自己借用的资产
            const asset = await new Promise((resolve, reject) => {
              db.get(
                'SELECT * FROM assets WHERE id = ? AND last_stock_out_id IN (SELECT id FROM stock_out_records WHERE recipient = ?)',
                [id, req.user.username],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                }
              );
            });
            hasAccess = !!asset;
          }
          break;

        case 'transaction':
          // 管理员可以访问所有交易记录
          if (req.user.role === 'admin') {
            hasAccess = true;
          } else {
            // 普通用户只能访问自己的交易记录
            const transaction = await new Promise((resolve, reject) => {
              db.get(
                'SELECT * FROM stock_out_records WHERE id = ? AND operator_id = ?',
                [id, req.user.id],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                }
              );
            });
            hasAccess = !!transaction;
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: '无效的资源类型'
          });
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '没有权限访问该资源'
        });
      }

      next();
    } catch (error) {
      logger.error('权限验证失败:', error);
      res.status(500).json({
        success: false,
        message: '权限验证失败'
      });
    }
  }
];

module.exports = {
  isAdmin,
  hasPermission,
  authenticateToken
};