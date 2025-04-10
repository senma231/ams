# 资产管理系统

一个全面的资产管理系统，包含前端和后端组件，用于跟踪和管理组织的资产。

## 功能特点

- 资产入库管理
- 资产出库管理
- 资产回收和报废
- 资产类型维护
- 用户管理
- 数据备份
- 资产使用情况仪表板

## 技术栈

### 前端
- Vue.js 3
- Element Plus UI
- Axios
- Vue Router
- Pinia

### 后端
- Node.js
- Express
- SQLite
- Winston (日志)

## 安装与设置

### 前提条件
- Node.js (v18+)
- npm 或 yarn

### 后端设置
```bash
cd backend
npm install
npm run dev
```

### 前端设置
```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
asset-management-system/
├── backend/                # 后端代码
│   ├── data/               # 数据库文件
│   ├── logs/               # 日志文件
│   ├── src/                # 源代码
│   │   ├── routes/         # API 路由
│   │   ├── app.js          # 应用入口
│   │   └── ...
│   └── package.json
├── frontend/               # 前端代码
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── assets/         # 资源文件
│   │   ├── components/     # 组件
│   │   ├── router/         # 路由
│   │   ├── stores/         # Pinia 存储
│   │   ├── views/          # 页面
│   │   └── ...
│   └── package.json
└── docs/                   # 文档
```

## 生产环境部署

### 一键部署

在 Linux 服务器上，您可以使用以下命令一键部署资产管理系统：

```bash
# 标准部署（会在关键步骤提示确认）
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/senma231/ams/master/deploy.sh)"

# 快速部署（跳过所有确认提示，自动安装或更新所有组件）
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/senma231/ams/master/deploy.sh)" -q
```

此脚本将自动：
- 从 GitHub 拉取项目
- 安装所有必要的依赖（Node.js、PM2、SQLite、Caddy）
- 检查并处理端口冲突（如端口 80 被占用）
- 配置并启动前端和后端服务
- 设置定期备份

部署完成后，您可以通过服务器 IP 地址访问系统。如果端口 80 被占用，脚本会自动切换到端口 8080。

#### 为什么选择 Caddy

我们选择 Caddy 作为 Web 服务器，因为它：
- 自动配置 HTTPS（自动申请和更新 SSL 证书）
- 配置简单直观，几行代码即可完成设置
- 内置反向代理、静态文件服务等功能
- 默认配置更安全，减少配置错误

### 手动部署

如果您希望手动部署，请参考 `docs/deployment.md` 文件获取详细的部署指南。

## 许可证

[MIT](LICENSE)
