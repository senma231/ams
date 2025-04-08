# 资产管理系统项目结构

本文档详细描述了资产管理系统的项目结构，包括目录组织、文件功能和关键组件。

## 目录结构

```
asset-management-system/
├── .gitignore              # Git 忽略文件配置
├── README.md               # 项目概述和说明
├── deploy.sh               # Linux 部署脚本
│
├── backend/                # 后端代码
│   ├── data/               # 数据库文件
│   │   ├── database.db     # SQLite 数据库
│   │   └── examples/       # 示例数据
│   │       └── README.md   # 数据目录说明
│   │
│   ├── logs/               # 日志文件
│   │   ├── combined.log    # 所有级别日志
│   │   ├── error.log       # 错误日志
│   │   └── examples/       # 示例日志
│   │       └── README.md   # 日志目录说明
│   │
│   ├── src/                # 源代码
│   │   ├── routes/         # API 路由
│   │   │   ├── assets.js           # 资产管理路由
│   │   │   ├── assets_new.js       # 新版资产管理路由
│   │   │   ├── assetTypes.js       # 资产类型路由
│   │   │   ├── auth.js             # 认证路由
│   │   │   ├── dashboard.js        # 仪表盘路由
│   │   │   ├── stockIn.js          # 入库路由
│   │   │   ├── stockOut.js         # 出库路由
│   │   │   ├── system.js           # 系统设置路由
│   │   │   └── users.js            # 用户管理路由
│   │   │
│   │   ├── app.js          # 应用入口
│   │   └── logger.js       # 日志配置
│   │
│   ├── package.json        # 后端依赖配置
│   └── package-lock.json   # 后端依赖锁定文件
│
├── frontend/               # 前端代码
│   ├── public/             # 静态资源
│   │   ├── favicon.ico     # 网站图标
│   │   └── index.html      # HTML 模板
│   │
│   ├── src/                # 源代码
│   │   ├── assets/         # 资源文件
│   │   │   ├── css/        # 样式文件
│   │   │   └── images/     # 图片资源
│   │   │
│   │   ├── components/     # 组件
│   │   │   ├── AssetForm.vue       # 资产表单组件
│   │   │   ├── AssetList.vue       # 资产列表组件
│   │   │   ├── AssetTypeForm.vue   # 资产类型表单组件
│   │   │   ├── Navbar.vue          # 导航栏组件
│   │   │   └── ...
│   │   │
│   │   ├── router/         # 路由
│   │   │   └── index.js    # 路由配置
│   │   │
│   │   ├── stores/         # Pinia 存储
│   │   │   ├── assets.js   # 资产管理存储
│   │   │   ├── auth.js     # 认证存储
│   │   │   ├── dashboard.js # 仪表盘存储
│   │   │   └── ...
│   │   │
│   │   ├── views/          # 页面
│   │   │   ├── AssetManagement/    # 资产管理页面
│   │   │   │   ├── AssetList.vue   # 资产列表页面
│   │   │   │   ├── StockIn.vue     # 入库页面
│   │   │   │   └── StockOut.vue    # 出库页面
│   │   │   │
│   │   │   ├── DashboardView.vue   # 仪表盘页面
│   │   │   ├── LoginView.vue       # 登录页面
│   │   │   ├── SystemSettings/     # 系统设置页面
│   │   │   │   ├── AssetTypes.vue  # 资产类型维护页面
│   │   │   │   ├── DataBackup.vue  # 数据备份页面
│   │   │   │   └── UserManagement.vue # 用户管理页面
│   │   │   └── ...
│   │   │
│   │   ├── App.vue         # 根组件
│   │   └── main.js         # 应用入口
│   │
│   ├── .env                # 环境变量配置
│   ├── .env.production     # 生产环境变量配置
│   ├── package.json        # 前端依赖配置
│   ├── package-lock.json   # 前端依赖锁定文件
│   └── vite.config.js      # Vite 配置
│
└── docs/                   # 文档
    ├── deployment.md       # 部署指南
    ├── github-upload.md    # GitHub 上传指南
    ├── production-testing.md # 生产环境测试指南
    ├── project-structure.md # 项目结构文档
    └── project-update.md   # 项目更新文档
```

## 后端组件

### 路由模块

| 文件名 | 描述 |
|--------|------|
| `assets.js` | 资产基本管理路由，包括资产查询、详情等 |
| `assets_new.js` | 新版资产管理路由，包括资产回收、报废等功能 |
| `assetTypes.js` | 资产类型管理路由，包括类型的增删改查 |
| `auth.js` | 认证路由，包括登录、登出、令牌验证等 |
| `dashboard.js` | 仪表盘路由，提供统计数据和操作记录 |
| `stockIn.js` | 入库路由，处理资产入库相关操作 |
| `stockOut.js` | 出库路由，处理资产出库相关操作 |
| `system.js` | 系统设置路由，包括系统配置和数据备份 |
| `users.js` | 用户管理路由，包括用户的增删改查 |

### 核心文件

| 文件名 | 描述 |
|--------|------|
| `app.js` | 应用入口，配置中间件、路由和启动服务器 |
| `logger.js` | 日志配置，使用 Winston 记录应用日志 |

## 前端组件

### 存储模块 (Pinia)

| 文件名 | 描述 |
|--------|------|
| `assets.js` | 资产管理状态，包括资产列表、详情等 |
| `auth.js` | 认证状态，包括用户信息、登录状态等 |
| `dashboard.js` | 仪表盘状态，包括统计数据和操作记录 |

### 视图组件

| 文件名 | 描述 |
|--------|------|
| `DashboardView.vue` | 仪表盘页面，显示系统概览和统计数据 |
| `LoginView.vue` | 登录页面，处理用户认证 |
| `AssetManagement/*.vue` | 资产管理相关页面，包括列表、入库、出库等 |
| `SystemSettings/*.vue` | 系统设置相关页面，包括用户管理、资产类型维护等 |

## 数据库结构

### 主要表

| 表名 | 描述 |
|------|------|
| `users` | 用户表，存储用户信息和认证数据 |
| `assets` | 资产表，存储所有资产的基本信息 |
| `asset_types` | 资产类型表，存储资产类型定义 |
| `stock_in_records` | 入库记录表，存储入库批次信息 |
| `stock_in_items` | 入库明细表，存储入库资产详情 |
| `stock_out_records` | 出库记录表，存储出库批次信息 |
| `stock_out_items` | 出库明细表，存储出库资产详情 |
| `asset_operations` | 资产操作记录表，存储资产的各种操作记录 |

## API 端点

### 认证 API

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证令牌

### 资产管理 API

- `GET /api/assets` - 获取资产列表
- `GET /api/assets/:id` - 获取资产详情
- `POST /api/assets/return/:id` - 资产回收
- `POST /api/assets/scrap/:id` - 资产报废

### 入库 API

- `POST /api/stock-in` - 创建入库记录
- `GET /api/stock-in` - 获取入库记录列表
- `GET /api/stock-in/:id` - 获取入库记录详情

### 出库 API

- `POST /api/stock-out` - 创建出库记录
- `GET /api/stock-out` - 获取出库记录列表
- `GET /api/stock-out/:id` - 获取出库记录详情

### 仪表盘 API

- `GET /api/dashboard` - 获取仪表盘数据

### 系统设置 API

- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户
- `GET /api/asset-types` - 获取资产类型列表
- `POST /api/asset-types` - 创建资产类型
- `PUT /api/asset-types/:id` - 更新资产类型
- `DELETE /api/asset-types/:id` - 删除资产类型
- `POST /api/system/backup` - 创建数据备份
