const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { JWT_SECRET } = require('../config/config');
const { createLogger } = require('../utils/logger');

const logger = createLogger();

// 用户登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  logger.info(`尝试登录用户: ${username}`);

  try {
    // 查找用户
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          logger.error('登录查询失败:', err);
          return res.status(500).json({
            success: false,
            message: '登录失败'
          });
        }

        if (!user) {
          logger.warn(`用户不存在: ${username}`);
          return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
          });
        }

        logger.info(`找到用户: ${username}`);

        try {
          // 验证密码
          const validPassword = await bcrypt.compare(password, user.password);
          // 不记录具体的密码验证结果

          if (!validPassword) {
            logger.warn(`密码验证失败: ${username}`);
            return res.status(401).json({
              success: false,
              message: '用户名或密码错误'
            });
          }

          // 生成 JWT token
          const token = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          logger.info(`用户登录成功: ${username}`);
          res.json({
            success: true,
            message: '登录成功',
            data: {
              token,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                branch: user.branch
              }
            }
          });
        } catch (error) {
          logger.error('密码验证失败:', error);
          return res.status(500).json({
            success: false,
            message: '登录失败'
          });
        }
      }
    );
  } catch (error) {
    logger.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

// 生成测试密码哈希的辅助函数
router.get('/generate-hash/:password', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.params.password, 10);
    res.json({ hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取认证状态
router.get('/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌',
      authenticated: false
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查找用户
    db.get(
      'SELECT id, username, name, role, branch FROM users WHERE id = ?',
      [decoded.id],
      (err, user) => {
        if (err || !user) {
          return res.status(401).json({
            success: false,
            message: '无效的认证令牌',
            authenticated: false
          });
        }

        res.json({
          success: true,
          message: '认证有效',
          authenticated: true,
          data: {
            user
          }
        });
      }
    );
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '无效的认证令牌',
      authenticated: false
    });
  }
});

module.exports = router;