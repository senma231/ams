module.exports = {
  // 服务器配置
  port: process.env.PORT || 3000,
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: '24h',
  
  // 数据库配置
  database: {
    path: process.env.NODE_ENV === 'production' 
      ? '/var/lib/asset.db'
      : '../data/asset.db'
  },
  
  // 备份配置
  backup: {
    path: '../backup',
    schedule: '0 3 * * *' // 每天凌晨3点
  },
  
  // 日志配置
  log: {
    path: '../logs',
    level: 'info'
  }
}; 