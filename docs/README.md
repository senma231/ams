# 资产管理系统文档

## 项目概述

资产管理系统是一个基于 Vue 3 和 Node.js 的 Web 应用程序，用于管理公司的资产。系统提供了资产入库、出库、领用、回收、报废等完整的资产生命周期管理功能。

## 技术栈

### 前端
- Vue 3 + Vite
- Vue Router
- Pinia (状态管理)
- Element Plus (UI组件库)
- ECharts (图表展示)
- Axios (HTTP请求)
- Dayjs (日期处理)

### 后端
- Node.js
- Express
- SQLite3 (数据库)
- JWT (身份认证)
- Winston (日志管理)
- PM2 (进程管理)

## 系统功能

### 1. 资产管理
- 资产入库
  - 批量入库
  - 自动生成资产编码
  - 支持多种资产类型（配件/电脑/主机/显示器）
- 资产出库
  - 资产领用
  - 资产回收
  - 资产报废
- 资产状态跟踪
  - 在库
  - 使用中
  - 报废

### 2. 数据统计
- 资产总览
  - 总资产数量
  - 在库数量
  - 使用中数量
  - 报废数量
- 资产分布
  - 按类型统计
  - 按部门统计
- 最近操作记录
  - 入库记录
  - 出库记录

### 3. 用户管理
- 用户认证
  - 登录/登出
  - JWT token认证
- 用户权限控制
  - 管理员
  - 普通用户

## API 文档

### 认证接口
- POST /api/auth/login - 用户登录
- GET /api/auth/logout - 用户登出

### 资产接口
- GET /api/assets - 获取资产列表
  - 支持分页、搜索和筛选
  - 参数：code, type, status, department, page, pageSize
- POST /api/assets/:id/assign - 资产领用
- POST /api/assets/:id/return - 资产回收
- POST /api/assets/:id/scrap - 资产报废
- PUT /api/assets/:id - 更新资产信息

### 入库接口
- GET /api/stock-in - 获取入库记录列表
- POST /api/stock-in - 创建入库记录
- GET /api/stock-in/:id - 获取入库记录详情

### 出库接口
- GET /api/stock-out - 获取出库记录列表
- POST /api/stock-out - 创建出库记录
- GET /api/stock-out/:id - 获取出库记录详情

### 仪表盘接口
- GET /api/dashboard/stats - 获取资产统计数据
- GET /api/dashboard/assets-by-type - 获取资产类型分布
- GET /api/dashboard/assets-by-department - 获取部门资产分布
- GET /api/dashboard/recent-records - 获取最近操作记录

## 数据库设计

### users 表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### assets 表
```sql
CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'available',
  branch TEXT,
  description TEXT,
  last_stock_out_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (last_stock_out_id) REFERENCES stock_out_records(id)
);
```

### stock_in_records 表
```sql
CREATE TABLE stock_in_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT UNIQUE,
  supplier TEXT,
  in_date DATE,
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES users(id)
);
```

### stock_in_items 表
```sql
CREATE TABLE stock_in_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_in_id INTEGER,
  asset_id INTEGER,
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_in_id) REFERENCES stock_in_records(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
```

### stock_out_records 表
```sql
CREATE TABLE stock_out_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT UNIQUE,
  recipient TEXT,
  department TEXT,
  out_date DATE,
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES users(id)
);
```

### stock_out_items 表
```sql
CREATE TABLE stock_out_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_out_id INTEGER,
  asset_id INTEGER,
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_out_id) REFERENCES stock_out_records(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
```

## 部署说明

### 环境要求
- Node.js >= 14
- npm >= 6
- SQLite3

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
```

2. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd frontend
npm install
```

3. 初始化数据库
```bash
cd backend
npm run init-db
```

4. 启动服务
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm run dev
```

## 开发指南

### 目录结构
```
project/
├── backend/
│   ├── src/
│   │   ├── routes/          # API路由
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── config/         # 配置文件
│   │   └── utils/          # 工具函数
│   ├── scripts/            # 脚本文件
│   └── data/              # 数据库文件
├── frontend/
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── stores/         # Pinia状态
│   │   ├── utils/          # 工具函数
│   │   └── assets/         # 静态资源
│   └── public/            # 公共文件
└── docs/                  # 文档
```

### 开发规范
1. 代码风格遵循 ESLint 配置
2. 提交信息遵循 Conventional Commits 规范
3. 分支管理采用 Git Flow 工作流

## 维护说明

### 日志管理
- 日志文件位置：`backend/logs/`
- 日志级别：info, error
- 日志轮转：每天一个文件

### 数据备份
- 备份目录：`backend/backup/`
- 备份频率：每天凌晨自动备份
- 保留策略：保留最近7天的备份

### 性能优化
- 数据库索引优化
- 前端资源压缩
- 接口响应缓存

### 安全措施
- JWT 认证
- 密码加密存储
- SQL注入防护
- XSS防护
- CORS配置 