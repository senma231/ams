const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, branch, role } = req.body;
    
    // 检查用户名是否已存在
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const userId = await User.create({ username, password, branch, role });
    
    res.status(201).json({ 
      message: '用户注册成功',
      userId 
    });
  } catch (error) {
    res.status(500).json({ 
      message: '用户注册失败',
      error: error.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        branch: user.branch,
        role: user.role 
      }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        branch: user.branch,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: '登录失败',
      error: error.message 
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch, role } = req.body;

    const updated = await User.update(id, { branch, role });
    if (!updated) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ message: '用户信息更新成功' });
  } catch (error) {
    res.status(500).json({ 
      message: '用户信息更新失败',
      error: error.message 
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    // 验证旧密码
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isValid = await User.verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: '旧密码错误' });
    }

    // 更新密码
    await User.changePassword(id, newPassword);
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ 
      message: '密码修改失败',
      error: error.message 
    });
  }
}; 