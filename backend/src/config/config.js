/**
 * 系统配置
 * 从环境变量中读取配置，并提供默认值
 */
module.exports = {
  // JWT 密钥
  JWT_SECRET: process.env.JWT_SECRET || 'asset-management-system-secret-key-2023',

  // JWT 过期时间
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // 数据库配置
  DATABASE: {
    filename: process.env.DB_FILENAME || './data/asset_management.db'
  },

  // 服务器配置
  SERVER: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // 密码加密配置
  BCRYPT: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  },

  // 日志配置
  LOGGING: {
    level: process.env.LOG_LEVEL || 'info',
    filename: process.env.LOG_FILENAME || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
  },

  // 备份配置
  BACKUP: {
    directory: process.env.BACKUP_DIR || './backup',
    interval: process.env.BACKUP_INTERVAL || '0 0 * * *', // 默认每天凌晨执行备份
    maxBackups: parseInt(process.env.MAX_BACKUPS || '7', 10) // 保存7个备份
  }
};