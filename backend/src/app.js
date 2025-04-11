require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { createLogger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const assetRoutes = require('./routes/assets_new');
const assetTypeRoutes = require('./routes/assetTypes');
const backupRoutes = require('./routes/backup');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const stockInRoutes = require('./routes/stockIn');
const stockOutRoutes = require('./routes/stockOut');
const reportRoutes = require('./routes/reports');
const { errorHandler } = require('./middleware/error');

const app = express();
const logger = createLogger();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/asset-types', assetTypeRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock-in', stockInRoutes);
app.use('/api/stock-out', stockOutRoutes);
app.use('/api/reports', reportRoutes);

// 错误处理
app.use(errorHandler);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('应用错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 从环境变量或配置文件中获取端口
const config = require('./config/config');
const PORT = process.env.PORT || config.SERVER.port || 3000;

// 检查端口是否被占用的函数
const checkPort = (port) => {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`端口 ${port} 已被占用，尝试使用其他端口`);
        resolve(false);
      } else {
        reject(err);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
};

// 尝试启动服务器，如果端口被占用则尝试其他端口
const startServer = async () => {
  let currentPort = PORT;
  let maxAttempts = 10; // 最多尝试10个端口
  let isAvailable = false;

  while (!isAvailable && maxAttempts > 0) {
    isAvailable = await checkPort(currentPort);
    if (!isAvailable) {
      currentPort++;
      maxAttempts--;
    }
  }

  if (!isAvailable) {
    logger.error('无法找到可用端口，服务启动失败');
    process.exit(1);
  }

  app.listen(currentPort, () => {
    logger.info(`服务器运行在端口 ${currentPort}`);
    // 如果使用了不同于配置的端口，记录下来以便其他服务（如Nginx）可以使用
    if (currentPort !== PORT) {
      logger.info(`注意：原配置端口 ${PORT} 被占用，使用了新端口 ${currentPort}`);
      // 将实际使用的端口写入文件，以便其他服务可以读取
      const fs = require('fs');
      const portFilePath = path.join(__dirname, '../.actual_port');
      fs.writeFileSync(portFilePath, currentPort.toString());
    }
  });
};

// 启动服务器
startServer().catch(err => {
  logger.error('启动服务器时出错:', err);
  process.exit(1);
});

module.exports = app;