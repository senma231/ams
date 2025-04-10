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

请参考 `docs/deployment.md` 文件获取生产环境部署指南。

## 许可证

[MIT](LICENSE)
