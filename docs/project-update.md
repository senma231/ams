# 资产管理系统项目更新文档

本文档记录了资产管理系统的最新更新和变更。

## 项目结构更新

### 后端结构

```
backend/
├── data/                # 数据库文件
│   └── database.db      # SQLite 数据库
├── logs/                # 日志文件
│   ├── combined.log     # 所有级别日志
│   └── error.log        # 错误日志
├── src/
│   ├── routes/          # API 路由
│   │   ├── assets.js    # 资产管理路由
│   │   ├── assets_new.js # 新版资产管理路由
│   │   ├── assetTypes.js # 资产类型路由
│   │   ├── auth.js      # 认证路由
│   │   ├── dashboard.js # 仪表盘路由
│   │   ├── stockIn.js   # 入库路由
│   │   ├── stockOut.js  # 出库路由
│   │   ├── system.js    # 系统设置路由
│   │   └── users.js     # 用户管理路由
│   ├── app.js           # 应用入口
│   └── logger.js        # 日志配置
└── package.json
```

### 前端结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── assets/          # 资源文件
│   ├── components/      # 组件
│   ├── router/          # 路由
│   ├── stores/          # Pinia 存储
│   │   ├── assets.js    # 资产管理存储
│   │   ├── auth.js      # 认证存储
│   │   ├── dashboard.js # 仪表盘存储
│   │   └── ...
│   ├── views/           # 页面
│   │   ├── AssetManagement/ # 资产管理页面
│   │   ├── DashboardView.vue # 仪表盘页面
│   │   ├── LoginView.vue # 登录页面
│   │   └── ...
│   ├── App.vue
│   └── main.js
└── package.json
```

## 功能更新

### 1. 资产入库功能

- 入库批次号规则修改为 `IN-YYMMDDXXX` 格式，例如 `IN-250408001`
- 入库明细包含：资产名称、资产类型、所属部门、数量、单价、备注
- 移除了资产编码字段，编码仅在出库时生成

### 2. Dashboard 功能

- 添加了资产报废和回收操作记录
- 添加了操作人列，显示执行操作的用户
- 资产类型分布显示类型名称而非编码
- 入库记录只显示批次号、类型和数量
- 移除了与下拉滚动重复的数字翻页功能

### 3. 系统导航结构

- 添加了"系统设置"作为顶级菜单项
- "用户管理"和"数据备份"作为"系统设置"的子菜单
- 添加了"资产类型维护"作为"系统设置"的子菜单，允许自定义资产类型

### 4. 资产出库功能

- 添加了资产选择界面的分页功能
- 出库时更新资产的所属部门信息

### 5. 资产回收和报废功能

- 修复了资产回收和报废功能中的交易记录问题
- 使用 `asset_operations` 表记录操作，而不是尝试使用不存在的 `transactions` 表

## 数据库结构更新

### 主要表结构

1. **users** - 用户表
2. **assets** - 资产表
3. **asset_types** - 资产类型表
4. **stock_in_records** - 入库记录表
5. **stock_in_items** - 入库明细表
6. **stock_out_records** - 出库记录表
7. **stock_out_items** - 出库明细表
8. **asset_operations** - 资产操作记录表

### 移除的表

- ~~transactions~~ - 不再使用，相关功能由 asset_operations 表替代

## 部署更新

- 添加了 Linux 环境部署脚本 `deploy.sh`
- 脚本自动检查依赖和组件，安装缺失的组件
- 处理版本兼容性问题，支持多版本并存
- 自动配置 Nginx 和 PM2
- 创建数据库备份脚本和定时任务

## 文档更新

- 添加了 README.md 文件，提供项目概述和设置说明
- 添加了 deployment.md 文件，提供详细的部署指南
- 添加了 github-upload.md 文件，提供 GitHub 上传指南
- 更新了项目结构文档，反映最新的代码组织

## 下一步计划

1. **性能优化**：
   - 优化大量数据的查询性能
   - 添加数据缓存机制

2. **功能扩展**：
   - 添加资产维修记录功能
   - 实现资产标签打印功能
   - 添加资产使用历史追踪

3. **安全增强**：
   - 实现更细粒度的权限控制
   - 添加操作审计日志
   - 实现数据加密存储敏感信息
