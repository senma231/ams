const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { db } = require('../config/database');

const logger = createLogger();

// 获取当前用户信息
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, name, username, role, branch, created_at 
      FROM users 
      WHERE id = ?
    `;
    
    db.get(query, [req.user.id], (err, user) => {
      if (err) {
        logger.error('获取当前用户信息失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取当前用户信息失败'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: user
      });
    });
  } catch (error) {
    logger.error('获取当前用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前用户信息失败'
    });
  }
});

// 获取所有用户
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, name, username, role, branch, created_at FROM users';
    
    db.all(query, [], (err, users) => {
      if (err) {
        logger.error('获取用户列表失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取用户列表失败'
        });
      }
      res.json({
        success: true,
        data: users
      });
    });
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 获取用户列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    db.all(
      `SELECT id, username, name, role, branch, created_at 
       FROM users 
       ORDER BY created_at DESC`,
      [],
      (err, users) => {
        if (err) {
          logger.error('获取用户列表失败:', err);
          return res.status(500).json({
            success: false,
            message: '获取用户列表失败'
          });
        }

        res.json({
          success: true,
          data: users
        });
      }
    );
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 创建用户
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { username, password, name, role, branch } = req.body;

    // 检查用户名是否已存在
    db.get(
      'SELECT username FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          logger.error('检查用户名失败:', err);
          return res.status(500).json({
            success: false,
            message: '创建用户失败'
          });
        }

        if (user) {
          return res.status(400).json({
            success: false,
            message: '用户名已存在'
          });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        db.run(
          `INSERT INTO users (username, password, name, role, branch, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [username, hashedPassword, name, role, branch],
          function(err) {
            if (err) {
              logger.error('创建用户失败:', err);
              return res.status(500).json({
                success: false,
                message: '创建用户失败'
              });
            }

            res.json({
              success: true,
              data: {
                id: this.lastID,
                username,
                name,
                role,
                branch
              }
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败'
    });
  }
});

// 更新用户
router.put('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { name, role, branch, password } = req.body;

    let updateFields = [];
    let params = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (role) {
      updateFields.push('role = ?');
      params.push(role);
    }
    if (branch) {
      updateFields.push('branch = ?');
      params.push(branch);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }

    params.push(username);

    db.run(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE username = ?`,
      params,
      function(err) {
        if (err) {
          logger.error('更新用户失败:', err);
          return res.status(500).json({
            success: false,
            message: '更新用户失败'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }

        res.json({
          success: true,
          message: '更新用户成功'
        });
      }
    );
  } catch (error) {
    logger.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

// 删除用户
router.delete('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // 检查是否为最后一个管理员
    db.get(
      'SELECT role FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) {
          logger.error('检查用户角色失败:', err);
          return res.status(500).json({
            success: false,
            message: '删除用户失败'
          });
        }

        if (user && user.role === 'admin') {
          db.get(
            'SELECT COUNT(*) as count FROM users WHERE role = ?',
            ['admin'],
            (err, result) => {
              if (err) {
                logger.error('检查管理员数量失败:', err);
                return res.status(500).json({
                  success: false,
                  message: '删除用户失败'
                });
              }

              if (result.count <= 1) {
                return res.status(400).json({
                  success: false,
                  message: '不能删除最后一个管理员'
                });
              }

              deleteUser();
            }
          );
        } else {
          deleteUser();
        }
      }
    );

    function deleteUser() {
      db.run(
        'DELETE FROM users WHERE username = ?',
        [username],
        function(err) {
          if (err) {
            logger.error('删除用户失败:', err);
            return res.status(500).json({
              success: false,
              message: '删除用户失败'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: '用户不存在'
            });
          }

          res.json({
            success: true,
            message: '删除用户成功'
          });
        }
      );
    }
  } catch (error) {
    logger.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

module.exports = router; 