/**
 * 异步错误处理包装器
 * 用于包装异步路由处理函数，自动捕获并传递错误给错误处理中间件
 * 
 * @param {Function} fn 异步路由处理函数
 * @returns {Function} 包装后的路由处理函数
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
