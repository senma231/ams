# 部署指南

本文档提供了将资产管理系统部署到生产环境的详细步骤。

## 目录

1. [系统要求](#系统要求)
2. [前端部署](#前端部署)
3. [后端部署](#后端部署)
4. [数据库设置](#数据库设置)
5. [自动化部署脚本](#自动化部署脚本)
6. [安全考虑](#安全考虑)
7. [性能优化](#性能优化)
8. [故障排除](#故障排除)

## 系统要求

### 最低配置
- CPU: 双核处理器
- 内存: 2GB RAM
- 存储: 10GB 可用空间
- 操作系统: Linux (推荐 Ubuntu 20.04+)、Windows Server 或 macOS

### 软件要求
- Node.js v18.0.0 或更高版本
- npm v8.0.0 或更高版本
- SQLite v3.0.0 或更高版本

## 前端部署

### 构建前端应用
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build
```

构建完成后，`dist` 目录中将包含所有静态文件。

### 部署选项

#### 选项 1: Caddy (推荐)
```bash
# 安装 Caddy
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# 配置 Caddy (使用 IP 地址)
sudo nano /etc/caddy/Caddyfile

# 添加以下配置
:80 {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * /path/to/frontend/dist
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}

# 或者使用域名配置 (自动 HTTPS)
example.com {
    # 允许所有访问
    header Access-Control-Allow-Origin *

    root * /path/to/frontend/dist
    route {
        reverse_proxy /api/* localhost:3000
        try_files {path} {path}/ /index.html
    }
    file_server browse
    encode gzip
}

# 设置文件权限
sudo chown -R caddy:caddy /path/to/frontend/dist
sudo chmod -R 755 /path/to/frontend/dist

# 重启 Caddy
sudo systemctl reload caddy
```

#### 选项 2: Nginx
```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx

# 配置 Nginx
sudo nano /etc/nginx/sites-available/asset-management

# 添加以下配置
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 启用站点
sudo ln -s /etc/nginx/sites-available/asset-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 后端部署

### 准备后端应用
```bash
# 进入后端目录
cd backend

# 安装依赖
npm install --production

# 创建必要的目录
mkdir -p data logs
```

### 使用 PM2 管理后端进程
```bash
# 全局安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/app.js --name "asset-management-backend"

# 设置开机自启
pm2 startup
pm2 save
```

## 数据库设置

SQLite 数据库文件将在应用程序首次运行时自动创建在 `backend/data` 目录中。

### 数据备份
设置定期备份：
```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/path/to/backups"
DB_FILE="/path/to/backend/data/database.db"

mkdir -p $BACKUP_DIR
cp $DB_FILE "$BACKUP_DIR/database_$TIMESTAMP.db"

# 保留最近 30 个备份
ls -t $BACKUP_DIR/database_*.db | tail -n +31 | xargs rm -f
EOF

# 添加执行权限
chmod +x backup.sh

# 设置定时任务，每天凌晨 2 点执行备份
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup.sh") | crontab -
```

## 自动化部署脚本

项目根目录中的 `deploy.sh` 脚本提供了一键部署解决方案。

### 使用方法

```bash
# 标准部署模式（会在关键步骤提示确认）
sudo bash deploy.sh

# 快速部署模式（跳过所有确认提示，自动安装或更新所有组件）
sudo bash deploy.sh -q
# 或
sudo bash deploy.sh --quick
```

### 脚本功能

部署脚本将自动执行以下操作：

1. **检查系统环境**
   - 检测操作系统类型和版本
   - 更新系统包

2. **检查并安装依赖**
   - 检查 Node.js、npm、PM2、SQLite 和 Caddy 的安装状态
   - 如果缺失，将安装这些组件
   - 如果版本不符合要求，将提示升级

3. **部署应用**
   - 从 GitHub 拉取项目代码
   - 安装前端和后端依赖
   - 构建前端应用
   - 检查并处理端口冲突（如端口 80 被占用）
   - 支持域名配置（可选）并自动启用 HTTPS
   - 配置并启动 Caddy 服务（如果端口 80 被占用，会切换到端口 8080）
   - 设置正确的文件权限，避免 403 错误
   - 使用 PM2 启动后端服务

4. **设置备份**
   - 创建数据库备份脚本
   - 配置定时备份任务

### 模式选择

- **标准模式**：在关键步骤会提示用户确认，适合需要精细控制部署过程的用户
- **快速模式**：跳过所有确认提示，自动安装或更新所有组件，适合快速部署或自动化脚本

## 安全考虑

1. **HTTPS 配置**
   - 强烈建议使用 HTTPS 保护您的应用程序
   - 可以使用 Let's Encrypt 获取免费的 SSL 证书

2. **防火墙设置**
   - 只开放必要的端口（80、443）
   - 限制对 SSH 端口的访问

3. **定期更新**
   - 保持系统和依赖包的更新
   - 监控安全公告

## 性能优化

1. **Caddy 静态资源缓存**
   ```
   # Caddyfile
   :80 {
       root * /path/to/frontend/dist

       # 缓存静态资源
       @static {
           path *.js *.css *.png *.jpg *.jpeg *.gif *.ico
       }
       header @static Cache-Control "public, max-age=2592000"

       # 其他配置...
   }
   ```

2. **Caddy 压缩**
   ```
   # Caddyfile
   :80 {
       root * /path/to/frontend/dist
       encode gzip
       # 其他配置...
   }
   ```

3. **Nginx 缓存（如果使用 Nginx）**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
       expires 30d;
       add_header Cache-Control "public, no-transform";
   }
   ```

4. **Nginx 压缩（如果使用 Nginx）**
   ```nginx
   gzip on;
   gzip_comp_level 5;
   gzip_min_length 256;
   gzip_proxied any;
   gzip_vary on;
   gzip_types
     application/javascript
     application/json
     application/x-javascript
     text/css
     text/javascript
     text/plain;
   ```

## 故障排除

### 常见问题

1. **无法连接到后端 API**
   - 检查后端服务是否正在运行：`pm2 status`
   - 检查防火墙设置：`sudo ufw status`
   - 检查代理配置是否正确

2. **Caddy 启动失败**
   - 检查端口 80 是否被占用：`sudo lsof -i:80`
   - 如果端口被 Nginx 占用，可以停止 Nginx：`sudo systemctl stop nginx`
   - 如果端口被其他进程占用，可以终止该进程或修改 Caddy 配置使用其他端口
   - 检查 Caddy 日志：`journalctl -u caddy.service`

3. **数据库错误**
   - 检查数据目录权限：`ls -la backend/data`
   - 检查磁盘空间：`df -h`

4. **前端加载缓慢**
   - 检查网络连接
   - 验证静态资源是否正确缓存
   - 使用浏览器开发工具分析性能瓶颈

### 日志位置
- 前端（Caddy）：`/var/log/caddy/access.log` 和 `/var/log/caddy/error.log`
- 前端（Nginx）：`/var/log/nginx/error.log`
- 后端：`backend/logs/combined.log` 和 `backend/logs/error.log`
- PM2：`pm2 logs asset-management-backend`
