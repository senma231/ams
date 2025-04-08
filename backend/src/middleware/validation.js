const { body, validationResult } = require('express-validator');

// 用户表单验证规则
const userValidationRules = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3到20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度不能小于6位')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)
    .withMessage('密码必须包含至少一个字母和一个数字'),
  
  body('name')
    .notEmpty()
    .withMessage('姓名不能为空')
    .isLength({ max: 50 })
    .withMessage('姓名长度不能超过50个字符'),
  
  body('role')
    .isIn(['admin', 'user'])
    .withMessage('角色必须是 admin 或 user'),
  
  body('branch')
    .notEmpty()
    .withMessage('所属分公司不能为空')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg
    });
  }
  next();
};

// 用户验证中间件
const validateUser = [
  ...userValidationRules,
  validate
];

// 验证用户信息
const validateUserInfo = (req, res, next) => {
  const { username, password, name, role, branch } = req.body;

  // 验证用户名
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
    return res.status(400).json({ message: '用户名必须是3-20个字符' });
  }

  // 验证密码（仅在创建用户或更新密码时验证）
  if (req.method === 'POST' || (req.method === 'PUT' && password)) {
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: '密码必须至少包含6个字符' });
    }
  }

  // 验证姓名
  if (!name || typeof name !== 'string' || name.length < 2 || name.length > 50) {
    return res.status(400).json({ message: '姓名必须是2-50个字符' });
  }

  // 验证角色
  const validRoles = ['admin', 'user'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: '无效的用户角色' });
  }

  // 验证部门
  if (!branch || typeof branch !== 'string' || branch.length < 2 || branch.length > 50) {
    return res.status(400).json({ message: '部门名称必须是2-50个字符' });
  }

  next();
};

module.exports = {
  validateUser,
  validateUserInfo
}; 