const { createLogger } = require('../utils/logger');
const logger = createLogger();

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误
 */
class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message || '输入数据验证失败', 400, errors);
  }
}

/**
 * 未授权错误
 */
class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || '未授权的访问', 401);
  }
}

/**
 * 禁止访问错误
 */
class ForbiddenError extends AppError {
  constructor(message) {
    super(message || '禁止访问该资源', 403);
  }
}

/**
 * 资源不存在错误
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message || '请求的资源不存在', 404);
  }
}

/**
 * 统一错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误
  logger.error({
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    // 不记录敏感信息
    query: req.query,
    params: req.params,
    user: req.user ? { id: req.user.id, username: req.user.username, role: req.user.role } : null
  });

  // 如果是自定义错误类
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  // 处理JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌已过期'
    });
  }

  // 默认返回500错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
};

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
};